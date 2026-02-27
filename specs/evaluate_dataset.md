Your task is to implement the feature to run evaluations on a dataset.

The implementation span across 2 repos:
- pixie-server: a new graphql query endpoint to return serialized DSPy signature along side of an optional saved DSPy program json file.

- pixie-evals: the sdk server needs a new graphql subscription endpoint to run evaluations (DSPy module) given a test suite id and a list of test case ids. Then in frontend, you need to have the evaluate button in datasetview to run the subscription and show results in the evaluation dialog.


# pixie-server endpoint
```
type EvaluatorWithSignature:
  input_schema: JSON
  output_schema: JSON
  saved_program: JSON | None

get_evaluator_with_signature(test_suite_id) -> EvaluatorWithSignature
```

The input schema would directly come from the test suite's config, while the output_schema should be constructed based on the associated metrics. The saved_program would be the file content of the last modified evaluator for the test suite.

# pixie-evals endpoint

```

type EvaluationUpdate
  """status updates to display as the evaluation is going"""
  ...

evaluate(dataset_id) -> Generator[EvaluationUpdate]
```

The evaluation endpoint would be implemented as a graphql subscription. It would first lookup the test suite id and get the full evaluator from server, then construct a dspy chainofthought module from it (see appendix for example of to construct dspy module from input/output schema), then it would load test cases in batches from local db, convert the data into dict and feed into the dspy module, and return results. Reference pixie.agents.graphql.batch_call_llm() in pixie-sdk project for how to implement batch running test cases.
After each batch the results should be saved to remote server (save as label with detailed info in metadata object)

# pixie-evals frontend

THe evaluate button in dataset should trigger the evaluate subscription call, then it should show the results dynamically in the evaluation dialog. Borrow the PromptPlayground in pixie-ui as much as possible for the UX implementation.

# Appendix: DSPy module construction example
```
"""
DSPy Signature Serialization / Deserialization
-----------------------------------------------
Uses Pydantic's native JSON schema machinery to round-trip DSPy signatures
as plain JSON. Inputs and outputs are represented as two separate JSON Schema
objects — no DSPy-specific extensions required.

Wire format:
{
    "title": "QASignature",
    "description": "Answer questions given context.",
    "input_schema": {
        "properties": {
            "question": {"type": "string", "description": "The question"},
            "context":  {"type": "string", "description": "Background context"}
        },
        "required": ["question", "context"]
    },
    "output_schema": {
        "properties": {
            "answer":     {"type": "string", "description": "Concise answer"},
            "confidence": {"type": "number", "description": "Confidence 0-1"}
        },
        "required": ["answer", "confidence"]
    }
}
"""

from __future__ import annotations

import json
from typing import Annotated, Any, Optional, get_args, get_origin

import dspy
from pydantic import Field


# ---------------------------------------------------------------------------
# Type mapping
# ---------------------------------------------------------------------------

# JSON Schema type string → Python type
_JSON_TYPE_TO_PYTHON: dict[str, type] = {
    "string":  str,
    "integer": int,
    "number":  float,
    "boolean": bool,
    "array":   list,
    "object":  dict,
    "null":    type(None),
}

# Python type → JSON Schema type string
_PYTHON_TYPE_TO_JSON: dict[type, str] = {v: k for k, v in _JSON_TYPE_TO_PYTHON.items()}
# resolve ambiguity: prefer "string" for str, not overwritten by null
_PYTHON_TYPE_TO_JSON[str] = "string"


def _python_type_to_json_schema(tp: type) -> dict[str, Any]:
    """Convert a Python type annotation to a minimal JSON Schema fragment."""
    origin = get_origin(tp)
    args = get_args(tp)

    # Optional[X]  →  anyOf: [X, null]
    if origin is type(None):
        return {"type": "null"}

    if origin is Annotated:
        return _python_type_to_json_schema(args[0])

    # Optional[X] comes through as Union[X, None]
    try:
        import types as _types
        if origin is _types.UnionType or str(origin) == "typing.Union":
            non_none = [a for a in args if a is not type(None)]
            if len(non_none) == 1:
                schema = _python_type_to_json_schema(non_none[0])
                schema["nullable"] = True
                return schema
    except Exception:
        pass

    # list[X]
    if origin is list:
        item_schema = _python_type_to_json_schema(args[0]) if args else {"type": "string"}
        return {"type": "array", "items": item_schema}

    # dict (just object, no further introspection)
    if origin is dict or tp is dict:
        return {"type": "object"}

    return {"type": _PYTHON_TYPE_TO_JSON.get(tp, "string")}


def _json_schema_to_python_type(schema: dict[str, Any]) -> type:
    """Convert a JSON Schema fragment back to a Python type."""
    json_type = schema.get("type", "string")

    if json_type == "array":
        item_schema = schema.get("items", {"type": "string"})
        item_type = _json_schema_to_python_type(item_schema)
        return list[item_type]  # type: ignore[valid-type]

    if json_type == "object":
        return dict

    base_type = _JSON_TYPE_TO_PYTHON.get(json_type, str)

    if schema.get("nullable"):
        return Optional[base_type]  # type: ignore[return-value]

    return base_type


# ---------------------------------------------------------------------------
# Serialization  (DSPy Signature → JSON-serialisable dict)
# ---------------------------------------------------------------------------

def _fields_to_schema(
    fields: dict[str, Any],
    hints: dict[str, type],
) -> dict[str, Any]:
    """Build a JSON Schema object from a dict of DSPy fields."""
    properties: dict[str, Any] = {}
    required: list[str] = []

    for name, field in fields.items():
        tp   = hints.get(name, str)
        prop = _python_type_to_json_schema(tp)
        desc = (field.json_schema_extra or {}).get("desc", "") if field.json_schema_extra else ""
        if desc:
            prop["description"] = desc
        prefix = (field.json_schema_extra or {}).get("prefix") if field.json_schema_extra else None
        if prefix:
            prop["x-dspy-prefix"] = prefix
        properties[name] = prop
        required.append(name)

    schema: dict[str, Any] = {"properties": properties}
    if required:
        schema["required"] = required
    return schema


def serialize_signature(sig: type[dspy.Signature]) -> dict[str, Any]:
    """
    Serialize a DSPy Signature class to a plain dict with two JSON Schema objects:
    one for inputs and one for outputs.

    The returned dict is JSON-serialisable with json.dumps().
    """
    import typing

    hints: dict[str, type] = {}
    try:
        hints = typing.get_type_hints(sig)
    except Exception:
        pass

    return {
        "title":         sig.__name__,
        "description":   sig.__doc__ or "",
        "input_schema":  _fields_to_schema(sig.input_fields, hints),
        "output_schema": _fields_to_schema(sig.output_fields, hints),
    }


def serialize_signature_json(sig: type[dspy.Signature]) -> str:
    """Serialize a DSPy Signature to a JSON string."""
    return json.dumps(serialize_signature(sig), indent=2)


# ---------------------------------------------------------------------------
# Deserialization  (dict / JSON string → DSPy Signature class)
# ---------------------------------------------------------------------------

def _schema_to_fields(
    schema: dict[str, Any],
    field_cls: type,  # dspy.InputField or dspy.OutputField
) -> tuple[dict[str, type], dict[str, Any]]:
    """Parse a JSON Schema object into (annotations, dspy fields) dicts."""
    annotations: dict[str, type] = {}
    fields: dict[str, Any] = {}

    for name, prop in schema.get("properties", {}).items():
        python_type = _json_schema_to_python_type(prop)
        desc        = prop.get("description", "")
        prefix      = prop.get("x-dspy-prefix")

        annotations[name] = python_type

        kwargs: dict[str, Any] = {"desc": desc}
        if prefix:
            kwargs["prefix"] = prefix
        fields[name] = field_cls(**kwargs)

    return annotations, fields


def deserialize_signature(payload: dict[str, Any]) -> type[dspy.Signature]:
    """
    Reconstruct a DSPy Signature class from a serialized payload dict.

    Expected keys: title, description, input_schema, output_schema.
    """
    name         = payload.get("title", "DynamicSignature")
    instructions = payload.get("description", "")

    in_annotations,  in_fields  = _schema_to_fields(payload.get("input_schema",  {}), dspy.InputField)
    out_annotations, out_fields = _schema_to_fields(payload.get("output_schema", {}), dspy.OutputField)

    namespace = {
        "__annotations__": {**in_annotations, **out_annotations},
        "__doc__": instructions,
        **in_fields,
        **out_fields,
    }

    return type(name, (dspy.Signature,), namespace)


def deserialize_signature_json(raw: str) -> type[dspy.Signature]:
    """Reconstruct a DSPy Signature class from a JSON string."""
    return deserialize_signature(json.loads(raw))


# ---------------------------------------------------------------------------
# Convenience: full module round-trip (signature + compiled state)
# ---------------------------------------------------------------------------

def serialize_module(module: dspy.Module, sig: type[dspy.Signature]) -> dict[str, Any]:
    """
    Serialize a compiled DSPy module + its signature into a single dict.

    Suitable for shipping from server to client over HTTP / message queue etc.
    """
    return {
        "signature": serialize_signature(sig),
        "state":     module.dump_state(),
    }


def deserialize_module(
    payload: dict[str, Any],
    module_cls: type[dspy.Module] = dspy.ChainOfThought,
) -> dspy.Module:
    """
    Reconstruct a DSPy module from a serialized payload.

    `module_cls` defaults to ChainOfThought; pass dspy.Predict or any other
    module class if needed.
    """
    sig    = deserialize_signature(payload["signature"])
    module = module_cls(sig)
    module.load_state(payload["state"])
    return module


# ---------------------------------------------------------------------------
# Example / smoke-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    from typing import Optional

    # --- Define a signature the normal way ---
    class QASignature(dspy.Signature):
        """Answer questions given context. Be concise."""
        question:   str           = dspy.InputField(desc="The question to answer")
        context:    str           = dspy.InputField(desc="Relevant background context")
        answer:     str           = dspy.OutputField(desc="Concise answer")
        confidence: float         = dspy.OutputField(desc="Confidence score 0-1")
        sources:    Optional[list] = dspy.OutputField(desc="Source references if available")

    # --- SERVER: serialize ---
    raw_json = serialize_signature_json(QASignature)
    print("=== Wire payload ===")
    print(raw_json)

    # --- CLIENT: deserialize ---
    ReconstructedSig = deserialize_signature_json(raw_json)

    print("\n=== Reconstructed Signature ===")
    print("Name:        ", ReconstructedSig.__name__)
    print("Instructions:", ReconstructedSig.__doc__)
    print("Inputs:      ", list(ReconstructedSig.input_fields.keys()))
    print("Outputs:     ", list(ReconstructedSig.output_fields.keys()))

    # --- Use it ---
    cot = dspy.ChainOfThought(ReconstructedSig)
    print("\nChainOfThought module created successfully:", cot)

    # --- Full module round-trip ---
    print("\n=== Full module round-trip ===")
    original_cot = dspy.ChainOfThought(QASignature)
    payload = serialize_module(original_cot, QASignature)
    restored_cot = deserialize_module(payload, dspy.ChainOfThought)
    print("Restored module:", restored_cot)
```

"""Tests for the evaluate_dataset subscription and helper functions."""

from __future__ import annotations

import json
import sys
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from pixie_sdk.graphql import (
    EvaluationStatus,
    EvaluationUpdate,
    Subscription,
    _json_schema_to_python_type,
    _prepare_dspy_input,
    _save_evaluation_labels,
)

# ============================================================================
# Mock dspy module (not installed in test env)
# ============================================================================


def _make_mock_dspy() -> MagicMock:
    """Create a mock dspy module with Signature, InputField, OutputField, etc."""
    mock_dspy = MagicMock()

    # dspy.Signature: a base class that _build_dspy_signature subclasses via type()
    class _FakeSignature:
        pass

    mock_dspy.Signature = _FakeSignature
    mock_dspy.InputField = MagicMock(side_effect=lambda desc="": f"InputField({desc})")
    mock_dspy.OutputField = MagicMock(
        side_effect=lambda desc="": f"OutputField({desc})"
    )
    mock_dspy.ChainOfThought = MagicMock()
    return mock_dspy


@pytest.fixture()
def mock_dspy():
    """Fixture that injects a mock dspy into sys.modules for import dspy."""
    mock = _make_mock_dspy()
    with patch.dict(sys.modules, {"dspy": mock}):
        # Re-import _build_dspy_signature so the lazy import picks up our mock
        from pixie_sdk.graphql import _build_dspy_signature  # noqa: F811

        yield mock, _build_dspy_signature


# ============================================================================
# Helpers
# ============================================================================


def _mock_info(db_conn: Any = None) -> MagicMock:
    """Create a mock Strawberry Info with a DB connection."""
    info = MagicMock()
    info.context = {"db": db_conn or AsyncMock()}
    return info


def _make_entry(entry_id: str | None = None, data: dict | None = None) -> dict:
    """Create a data entry dict as returned by db.get_data_entries."""
    return {
        "id": entry_id or str(uuid4()),
        "dataset_id": str(uuid4()),
        "data": data or {"prompt": "hello", "response": "world"},
    }


def _make_evaluator_data(
    input_schema: dict | None = None,
    output_schema: dict | None = None,
    saved_program: dict | None = None,
) -> dict:
    """Create an evaluator_data dict as returned by remote_client."""
    return {
        "input_schema": input_schema or {"properties": {"prompt": {"type": "string"}}},
        "output_schema": output_schema
        or {
            "properties": {
                "score": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 5,
                    "description": "Quality score",
                }
            },
            "required": ["score"],
        },
        "saved_program": saved_program,
    }


# ============================================================================
# _json_schema_to_python_type
# ============================================================================


class TestJsonSchemaToPythonType:
    """Test the _json_schema_to_python_type helper."""

    def test_string(self):
        assert _json_schema_to_python_type({"type": "string"}) is str

    def test_integer(self):
        assert _json_schema_to_python_type({"type": "integer"}) is int

    def test_number(self):
        assert _json_schema_to_python_type({"type": "number"}) is float

    def test_boolean(self):
        assert _json_schema_to_python_type({"type": "boolean"}) is bool

    def test_array(self):
        assert _json_schema_to_python_type({"type": "array"}) is list

    def test_object(self):
        assert _json_schema_to_python_type({"type": "object"}) is dict

    def test_null(self):
        assert _json_schema_to_python_type({"type": "null"}) is type(None)

    def test_missing_type_defaults_to_str(self):
        assert _json_schema_to_python_type({}) is str

    def test_unknown_type_defaults_to_str(self):
        assert _json_schema_to_python_type({"type": "custom"}) is str


# ============================================================================
# _build_dspy_signature
# ============================================================================


class TestBuildDspySignature:
    """Test the _build_dspy_signature helper."""

    def test_creates_class_with_input_and_output_fields(self, mock_dspy):
        mock_dspy_mod, build_sig = mock_dspy

        input_schema = {
            "properties": {
                "prompt": {"type": "string", "description": "The user prompt"},
            }
        }
        output_schema = {
            "properties": {
                "score": {"type": "integer", "description": "Quality score"},
            }
        }

        sig_class = build_sig(input_schema, output_schema)

        assert issubclass(sig_class, mock_dspy_mod.Signature)
        # Verify annotations
        assert "prompt" in sig_class.__annotations__
        assert "score" in sig_class.__annotations__
        assert sig_class.__annotations__["prompt"] is str
        assert sig_class.__annotations__["score"] is int

    def test_multiple_input_and_output_fields(self, mock_dspy):
        mock_dspy_mod, build_sig = mock_dspy

        input_schema = {
            "properties": {
                "question": {"type": "string"},
                "context": {"type": "string"},
            }
        }
        output_schema = {
            "properties": {
                "relevance": {"type": "integer"},
                "category": {"type": "string"},
            }
        }

        sig_class = build_sig(input_schema, output_schema)

        assert issubclass(sig_class, mock_dspy_mod.Signature)
        assert set(sig_class.__annotations__.keys()) == {
            "question",
            "context",
            "relevance",
            "category",
        }

    def test_empty_schemas_still_creates_signature(self, mock_dspy):
        mock_dspy_mod, build_sig = mock_dspy

        sig_class = build_sig({"properties": {}}, {"properties": {}})
        assert issubclass(sig_class, mock_dspy_mod.Signature)

    def test_boolean_output_field(self, mock_dspy):
        """Boolean type from schema maps correctly."""
        _mock_dspy_mod, build_sig = mock_dspy

        input_schema = {"properties": {"text": {"type": "string"}}}
        output_schema = {
            "properties": {"pass_fail": {"type": "boolean", "description": "Pass?"}}
        }

        sig_class = build_sig(input_schema, output_schema)
        assert sig_class.__annotations__["pass_fail"] is bool

    def test_excludes_underscore_input_fields(self, mock_dspy):
        """Input fields starting with '_' are excluded from the signature."""
        mock_dspy_mod, build_sig = mock_dspy

        input_schema = {
            "properties": {
                "prompt": {"type": "string"},
                "_internal": {"type": "string"},
                "_hidden": {"type": "integer"},
            }
        }
        output_schema = {"properties": {"score": {"type": "integer"}}}

        sig_class = build_sig(input_schema, output_schema)

        assert "prompt" in sig_class.__annotations__
        assert "score" in sig_class.__annotations__
        assert "_internal" not in sig_class.__annotations__
        assert "_hidden" not in sig_class.__annotations__

    def test_excludes_underscore_output_fields(self, mock_dspy):
        """Output fields starting with '_' are excluded from the signature."""
        mock_dspy_mod, build_sig = mock_dspy

        input_schema = {"properties": {"prompt": {"type": "string"}}}
        output_schema = {
            "properties": {
                "score": {"type": "integer"},
                "_meta": {"type": "string"},
            }
        }

        sig_class = build_sig(input_schema, output_schema)

        assert "prompt" in sig_class.__annotations__
        assert "score" in sig_class.__annotations__
        assert "_meta" not in sig_class.__annotations__

    def test_all_underscore_fields_creates_empty_signature(self, mock_dspy):
        """If all fields start with '_', signature has no annotated fields."""
        mock_dspy_mod, build_sig = mock_dspy

        input_schema = {"properties": {"_a": {"type": "string"}}}
        output_schema = {"properties": {"_b": {"type": "integer"}}}

        sig_class = build_sig(input_schema, output_schema)

        assert issubclass(sig_class, mock_dspy_mod.Signature)
        assert len(sig_class.__annotations__) == 0


# ============================================================================
# _prepare_dspy_input
# ============================================================================


class TestPrepareDspyInput:
    """Test the _prepare_dspy_input helper."""

    def test_direct_field_match(self):
        """Entry data fields matching input schema are used directly."""
        entry = {"prompt": "What is AI?", "extra": "ignored"}
        schema = {"properties": {"prompt": {"type": "string"}}}

        result = _prepare_dspy_input(entry, schema)

        assert result == {"prompt": "What is AI?"}

    def test_multiple_fields(self):
        """Multiple matching fields all extracted."""
        entry = {"prompt": "Hello", "response": "World"}
        schema = {
            "properties": {
                "prompt": {"type": "string"},
                "response": {"type": "string"},
            }
        }

        result = _prepare_dspy_input(entry, schema)

        assert result == {"prompt": "Hello", "response": "World"}

    def test_missing_field_uses_full_entry_json(self):
        """If a schema field isn't in the entry, full entry is serialized."""
        entry = {"prompt": "Hello"}
        schema = {"properties": {"missing_field": {"type": "string"}}}

        result = _prepare_dspy_input(entry, schema)

        assert result["missing_field"] == json.dumps(entry)

    def test_dict_value_is_serialized(self):
        """Dict values in entry data are JSON-serialized."""
        entry = {"prompt": {"nested": "value"}}
        schema = {"properties": {"prompt": {"type": "string"}}}

        result = _prepare_dspy_input(entry, schema)

        assert result["prompt"] == json.dumps({"nested": "value"})

    def test_list_value_is_serialized(self):
        """List values in entry data are JSON-serialized."""
        entry = {"prompt": [1, 2, 3]}
        schema = {"properties": {"prompt": {"type": "string"}}}

        result = _prepare_dspy_input(entry, schema)

        assert result["prompt"] == json.dumps([1, 2, 3])

    def test_none_value_becomes_empty_string(self):
        """None values in entry data become empty strings."""
        entry = {"prompt": None}
        schema = {"properties": {"prompt": {"type": "string"}}}

        result = _prepare_dspy_input(entry, schema)

        assert result["prompt"] == ""

    def test_integer_value_becomes_string(self):
        """Non-string scalars are stringified."""
        entry = {"count": 42}
        schema = {"properties": {"count": {"type": "integer"}}}

        result = _prepare_dspy_input(entry, schema)

        assert result["count"] == "42"

    def test_empty_schema_returns_empty_dict(self):
        """Empty input schema → empty kwargs."""
        entry = {"prompt": "Hello"}
        schema = {"properties": {}}

        result = _prepare_dspy_input(entry, schema)

        assert result == {}

    def test_excludes_underscore_fields(self):
        """Fields starting with '_' are excluded from the prepared input."""
        entry = {"prompt": "Hello", "_id": "abc123", "_hidden": "secret"}
        schema = {
            "properties": {
                "prompt": {"type": "string"},
                "_id": {"type": "string"},
                "_hidden": {"type": "string"},
            }
        }

        result = _prepare_dspy_input(entry, schema)

        assert result == {"prompt": "Hello"}
        assert "_id" not in result
        assert "_hidden" not in result

    def test_only_underscore_fields_returns_empty_dict(self):
        """If all schema fields start with '_', result is empty."""
        entry = {"_a": "x", "_b": "y"}
        schema = {
            "properties": {
                "_a": {"type": "string"},
                "_b": {"type": "string"},
            }
        }

        result = _prepare_dspy_input(entry, schema)

        assert result == {}


# ============================================================================
# _save_evaluation_labels
# ============================================================================


class TestSaveEvaluationLabels:
    """Test the _save_evaluation_labels helper."""

    @pytest.mark.asyncio
    async def test_sends_labels_for_successful_results(self):
        """Successful results generate label_test_cases calls."""
        mock_client = AsyncMock()
        mock_client.label_test_cases = AsyncMock(return_value=["label-1"])

        result = MagicMock()
        result.error = None
        result.entry_id = "entry-1"
        result.output = {"score": 4}

        ts_id = uuid4()
        output_schema = {"properties": {"score": {"type": "integer"}}}

        await _save_evaluation_labels(
            client=mock_client,
            test_suite_id=ts_id,
            results=[result],
            output_schema=output_schema,
        )

        mock_client.label_test_cases.assert_called_once()
        call_args = mock_client.label_test_cases.call_args
        assert call_args.kwargs["test_suite_id"] == ts_id
        labels = call_args.kwargs["labels"]
        assert len(labels) == 1
        assert labels[0]["test_case_id"] == "entry-1"
        assert labels[0]["labels"][0]["value"] == 4

    @pytest.mark.asyncio
    async def test_skips_error_results(self):
        """Results with errors are not included in labels."""
        mock_client = AsyncMock()
        mock_client.label_test_cases = AsyncMock(return_value=[])

        success = MagicMock()
        success.error = None
        success.entry_id = "entry-1"
        success.output = {"score": 3}

        failure = MagicMock()
        failure.error = "Evaluation failed"
        failure.entry_id = "entry-2"
        failure.output = {}

        output_schema = {"properties": {"score": {"type": "integer"}}}

        await _save_evaluation_labels(
            client=mock_client,
            test_suite_id=uuid4(),
            results=[success, failure],
            output_schema=output_schema,
        )

        labels = mock_client.label_test_cases.call_args.kwargs["labels"]
        assert len(labels) == 1
        assert labels[0]["test_case_id"] == "entry-1"

    @pytest.mark.asyncio
    async def test_skips_none_values(self):
        """Metric values that are None are skipped."""
        mock_client = AsyncMock()
        mock_client.label_test_cases = AsyncMock(return_value=[])

        result = MagicMock()
        result.error = None
        result.entry_id = "entry-1"
        result.output = {"score": None, "category": "good"}

        output_schema = {
            "properties": {
                "score": {"type": "integer"},
                "category": {"type": "string"},
            }
        }

        await _save_evaluation_labels(
            client=mock_client,
            test_suite_id=uuid4(),
            results=[result],
            output_schema=output_schema,
        )

        labels = mock_client.label_test_cases.call_args.kwargs["labels"]
        metric_labels = labels[0]["labels"]
        # Only "category" should be present (score is None)
        assert len(metric_labels) == 1
        assert metric_labels[0]["metric_id"] == "category"

    @pytest.mark.asyncio
    async def test_no_results_means_no_call(self):
        """If all results are errors, no call is made."""
        mock_client = AsyncMock()
        mock_client.label_test_cases = AsyncMock()

        failure = MagicMock()
        failure.error = "Failed"
        failure.entry_id = "entry-1"
        failure.output = {}

        output_schema = {"properties": {"score": {"type": "integer"}}}

        await _save_evaluation_labels(
            client=mock_client,
            test_suite_id=uuid4(),
            results=[failure],
            output_schema=output_schema,
        )

        mock_client.label_test_cases.assert_not_called()

    @pytest.mark.asyncio
    async def test_metadata_includes_ai_label_info(self):
        """Each label batch includes AI metadata."""
        mock_client = AsyncMock()
        mock_client.label_test_cases = AsyncMock(return_value=[])

        result = MagicMock()
        result.error = None
        result.entry_id = "entry-1"
        result.output = {"score": 5}

        output_schema = {"properties": {"score": {"type": "integer"}}}

        await _save_evaluation_labels(
            client=mock_client,
            test_suite_id=uuid4(),
            results=[result],
            output_schema=output_schema,
        )

        labels = mock_client.label_test_cases.call_args.kwargs["labels"]
        assert labels[0]["metadata"]["labeled_by"] == "ai"

    @pytest.mark.asyncio
    async def test_batches_large_label_sets(self):
        """Labels are sent in batches of 50."""
        mock_client = AsyncMock()
        mock_client.label_test_cases = AsyncMock(return_value=[])

        results = []
        for i in range(75):
            r = MagicMock()
            r.error = None
            r.entry_id = f"entry-{i}"
            r.output = {"score": 3}
            results.append(r)

        output_schema = {"properties": {"score": {"type": "integer"}}}

        await _save_evaluation_labels(
            client=mock_client,
            test_suite_id=uuid4(),
            results=results,
            output_schema=output_schema,
        )

        # 75 labels / 50 per batch = 2 calls
        assert mock_client.label_test_cases.call_count == 2


# ============================================================================
# evaluate_dataset subscription – integration-style tests
# ============================================================================

# Pre-import the remote_client module so patch.object works reliably
import pixie_sdk.remote_client as _rc_module


class TestEvaluateDatasetSubscription:
    """Test the full evaluate_dataset subscription pipeline."""

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_error_when_dataset_not_found(self, mock_db):
        """Yields ERROR when the dataset doesn't exist."""
        mock_db.get_dataset = AsyncMock(return_value=None)

        with patch.dict(sys.modules, {"dspy": _make_mock_dspy()}):
            sub = Subscription()
            updates: list[EvaluationUpdate] = []
            async for u in sub.evaluate_dataset(_mock_info(), uuid4()):
                updates.append(u)

        assert any(u.status == EvaluationStatus.ERROR for u in updates)
        assert any("not found" in u.message.lower() for u in updates)

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_error_when_no_test_suite_linked(self, mock_db):
        """Yields ERROR when dataset has no linked test suite."""
        mock_db.get_dataset = AsyncMock(
            return_value={"id": str(uuid4()), "test_suite_id": None}
        )

        with patch.dict(sys.modules, {"dspy": _make_mock_dspy()}):
            sub = Subscription()
            updates: list[EvaluationUpdate] = []
            async for u in sub.evaluate_dataset(_mock_info(), uuid4()):
                updates.append(u)

        assert any(u.status == EvaluationStatus.ERROR for u in updates)
        assert any("not linked" in u.message.lower() for u in updates)

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_error_when_no_evaluator_found(self, mock_db):
        """Yields ERROR when remote server has no evaluator."""
        ts_id = str(uuid4())
        mock_db.get_dataset = AsyncMock(
            return_value={"id": str(uuid4()), "test_suite_id": ts_id}
        )

        mock_dspy_mod = _make_mock_dspy()
        mock_client = AsyncMock()
        mock_client.get_evaluator_with_signature = AsyncMock(return_value=None)

        with (
            patch.object(_rc_module, "RemoteClient", return_value=mock_client),
            patch.dict(sys.modules, {"dspy": mock_dspy_mod}),
        ):
            sub = Subscription()
            updates: list[EvaluationUpdate] = []
            async for u in sub.evaluate_dataset(_mock_info(), uuid4()):
                updates.append(u)

        assert any(u.status == EvaluationStatus.ERROR for u in updates)
        assert any("no evaluator" in u.message.lower() for u in updates)

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_complete_when_no_entries(self, mock_db):
        """Yields COMPLETE with 0/0 when dataset has no entries."""
        ts_id = str(uuid4())
        mock_db.get_dataset = AsyncMock(
            return_value={"id": str(uuid4()), "test_suite_id": ts_id}
        )
        mock_db.get_data_entries = AsyncMock(return_value=[])

        mock_dspy_mod = _make_mock_dspy()
        mock_client = AsyncMock()
        mock_client.get_evaluator_with_signature = AsyncMock(
            return_value=_make_evaluator_data()
        )

        with (
            patch.object(_rc_module, "RemoteClient", return_value=mock_client),
            patch.dict(sys.modules, {"dspy": mock_dspy_mod}),
        ):
            sub = Subscription()
            updates: list[EvaluationUpdate] = []
            async for u in sub.evaluate_dataset(_mock_info(), uuid4()):
                updates.append(u)

        last = updates[-1]
        assert last.status == EvaluationStatus.COMPLETE
        assert last.total == 0

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_full_pipeline_success(self, mock_db):
        """Full pipeline: load → evaluate → save → complete."""
        ts_id = str(uuid4())
        entry_id = str(uuid4())
        mock_db.get_dataset = AsyncMock(
            return_value={"id": str(uuid4()), "test_suite_id": ts_id}
        )
        mock_db.get_data_entries = AsyncMock(
            return_value=[_make_entry(entry_id=entry_id)]
        )

        # Mock dspy module result
        mock_dspy_result = MagicMock()
        mock_dspy_result.score = 4

        mock_dspy_mod = _make_mock_dspy()
        mock_client = AsyncMock()
        mock_client.get_evaluator_with_signature = AsyncMock(
            return_value=_make_evaluator_data()
        )
        mock_client.label_test_cases = AsyncMock(return_value=["label-1"])

        # Mock dspy.ChainOfThought
        mock_cot = MagicMock()
        mock_cot.return_value = mock_dspy_result
        mock_dspy_mod.ChainOfThought.return_value = mock_cot

        with (
            patch.object(_rc_module, "RemoteClient", return_value=mock_client),
            patch.dict(sys.modules, {"dspy": mock_dspy_mod}),
        ):
            sub = Subscription()
            updates: list[EvaluationUpdate] = []
            async for u in sub.evaluate_dataset(_mock_info(), uuid4()):
                updates.append(u)

        # Should have LOADING, EVALUATING, SAVING, COMPLETE statuses
        statuses = [u.status for u in updates]
        assert EvaluationStatus.LOADING in statuses
        assert EvaluationStatus.EVALUATING in statuses
        assert EvaluationStatus.COMPLETE in statuses

        # Final update should be COMPLETE
        last = updates[-1]
        assert last.status == EvaluationStatus.COMPLETE
        assert last.progress == 1.0
        assert last.total == 1

        # Should have saved labels
        mock_client.label_test_cases.assert_called_once()

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_evaluation_error_is_captured_per_entry(self, mock_db):
        """DSPy failures on individual entries are captured, not fatal."""
        ts_id = str(uuid4())
        mock_db.get_dataset = AsyncMock(
            return_value={"id": str(uuid4()), "test_suite_id": ts_id}
        )
        mock_db.get_data_entries = AsyncMock(
            return_value=[_make_entry(), _make_entry()]
        )

        mock_dspy_mod = _make_mock_dspy()
        mock_client = AsyncMock()
        mock_client.get_evaluator_with_signature = AsyncMock(
            return_value=_make_evaluator_data()
        )
        mock_client.label_test_cases = AsyncMock(return_value=[])

        # First call succeeds, second fails
        mock_good = MagicMock()
        mock_good.score = 3
        mock_cot = MagicMock()
        mock_cot.side_effect = [mock_good, RuntimeError("DSPy exploded")]
        mock_dspy_mod.ChainOfThought.return_value = mock_cot

        with (
            patch.object(_rc_module, "RemoteClient", return_value=mock_client),
            patch.dict(sys.modules, {"dspy": mock_dspy_mod}),
        ):
            sub = Subscription()
            updates: list[EvaluationUpdate] = []
            async for u in sub.evaluate_dataset(_mock_info(), uuid4()):
                updates.append(u)

        # Should still complete (not error out)
        last = updates[-1]
        assert last.status == EvaluationStatus.COMPLETE

        # The evaluating update should have results with one success, one error
        eval_updates = [u for u in updates if u.results and len(u.results) > 0]
        assert len(eval_updates) > 0
        all_results = []
        for eu in eval_updates:
            all_results.extend(eu.results)  # type: ignore[arg-type]
        successes = [r for r in all_results if r.error is None]
        errors = [r for r in all_results if r.error is not None]
        assert len(successes) == 1
        assert len(errors) == 1
        assert "DSPy exploded" in errors[0].error

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_progress_updates_are_streamed(self, mock_db):
        """Progress values monotonically increase."""
        ts_id = str(uuid4())
        mock_db.get_dataset = AsyncMock(
            return_value={"id": str(uuid4()), "test_suite_id": ts_id}
        )
        # 15 entries → 2 batches of 10
        entries = [_make_entry() for _ in range(15)]
        mock_db.get_data_entries = AsyncMock(return_value=entries)

        mock_result = MagicMock()
        mock_result.score = 5

        mock_dspy_mod = _make_mock_dspy()
        mock_client = AsyncMock()
        mock_client.get_evaluator_with_signature = AsyncMock(
            return_value=_make_evaluator_data()
        )
        mock_client.label_test_cases = AsyncMock(return_value=[])

        mock_cot = MagicMock(return_value=mock_result)
        mock_dspy_mod.ChainOfThought.return_value = mock_cot

        with (
            patch.object(_rc_module, "RemoteClient", return_value=mock_client),
            patch.dict(sys.modules, {"dspy": mock_dspy_mod}),
        ):
            sub = Subscription()
            updates: list[EvaluationUpdate] = []
            async for u in sub.evaluate_dataset(_mock_info(), uuid4()):
                updates.append(u)

        # Extract progress values (skip the first few loading updates)
        progresses = [u.progress for u in updates]
        # Progress should be non-decreasing
        for i in range(1, len(progresses)):
            assert (
                progresses[i] >= progresses[i - 1]
            ), f"Progress decreased at step {i}: {progresses[i - 1]} → {progresses[i]}"
        # Final should be 1.0
        assert progresses[-1] == 1.0

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_label_save_failure_does_not_crash(self, mock_db):
        """If saving labels fails, pipeline completes with a warning."""
        ts_id = str(uuid4())
        mock_db.get_dataset = AsyncMock(
            return_value={"id": str(uuid4()), "test_suite_id": ts_id}
        )
        mock_db.get_data_entries = AsyncMock(return_value=[_make_entry()])

        mock_result = MagicMock()
        mock_result.score = 5

        mock_dspy_mod = _make_mock_dspy()
        mock_client = AsyncMock()
        mock_client.get_evaluator_with_signature = AsyncMock(
            return_value=_make_evaluator_data()
        )
        mock_client.label_test_cases = AsyncMock(
            side_effect=RuntimeError("Network error")
        )

        mock_cot = MagicMock(return_value=mock_result)
        mock_dspy_mod.ChainOfThought.return_value = mock_cot

        with (
            patch.object(_rc_module, "RemoteClient", return_value=mock_client),
            patch.dict(sys.modules, {"dspy": mock_dspy_mod}),
        ):
            sub = Subscription()
            updates: list[EvaluationUpdate] = []
            async for u in sub.evaluate_dataset(_mock_info(), uuid4()):
                updates.append(u)

        # Should still finish with COMPLETE
        last = updates[-1]
        assert last.status == EvaluationStatus.COMPLETE

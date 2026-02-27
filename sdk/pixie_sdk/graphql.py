"""Strawberry GraphQL schema for the Pixie SDK local server.

Defines types, queries, mutations, and subscriptions for:
- Dataset management (upload, list, get)
- Test suite creation flow with progress updates via subscription
- Labeling UI rendering
"""

from __future__ import annotations

import enum
import json
import logging
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncGenerator
from uuid import UUID

import strawberry
from strawberry.file_uploads import Upload
from strawberry.scalars import JSON
from strawberry.types import Info

from pixie_sdk import db
from pixie_sdk import embed
from pixie_sdk import ingest

logger = logging.getLogger(__name__)

# ============================================================================
# Constants
# ============================================================================

EMBED_BATCH_SIZE = 100  # Rows per OpenAI embedding call
UPLOAD_BATCH_SIZE = 50  # Test cases per addTestCases mutation
EVAL_BATCH_SIZE = 10  # Test cases per DSPy evaluation batch

# ============================================================================
# Strawberry Types
# ============================================================================


@strawberry.type
class DatasetType:
    """A locally stored dataset."""

    id: UUID
    file_name: str
    created_at: datetime
    row_schema: JSON  # type: ignore[assignment]
    test_suite_id: UUID | None = None


@strawberry.type
class DataEntryType:
    """A single row within a dataset."""

    id: UUID
    dataset_id: UUID
    data: JSON  # type: ignore[assignment]


@strawberry.enum
class CreationStatus(enum.Enum):
    """Status steps for the test suite creation pipeline."""

    CREATING = "creating"
    EMBEDDING = "embedding"
    UPLOADING = "uploading"
    COMPLETE = "complete"
    ERROR = "error"


@strawberry.type
class TestSuiteCreationProgress:
    """Progress update emitted during test suite creation.

    Sent over a GraphQL subscription so the frontend can show
    real-time status to the user.
    """

    status: CreationStatus
    message: str
    progress: float  # 0.0 – 1.0
    test_suite_id: UUID | None = None  # set once created on remote server


@strawberry.enum
class EvaluationStatus(enum.Enum):
    """Status steps for the dataset evaluation pipeline."""

    LOADING = "loading"
    EVALUATING = "evaluating"
    SAVING = "saving"
    COMPLETE = "complete"
    ERROR = "error"


@strawberry.type
class EvaluationResultItem:
    """Result of evaluating a single test case."""

    entry_id: str
    """Local data entry ID."""
    output: JSON  # type: ignore[assignment]
    """DSPy module output dict."""
    error: str | None = None
    """Error message if evaluation failed for this item."""


@strawberry.type
class EvaluationUpdate:
    """Progress update emitted during dataset evaluation.

    Sent over a GraphQL subscription so the frontend can show
    real-time status and results to the user.
    """

    status: EvaluationStatus
    message: str
    progress: float  # 0.0 – 1.0
    total: int = 0
    """Total number of test cases."""
    completed: int = 0
    """Number of completed evaluations so far."""
    results: list[EvaluationResultItem] | None = None
    """Batch of results, present during EVALUATING updates."""


# ============================================================================
# Inputs
# ============================================================================


@strawberry.input
class TestSuiteCreateInput:
    """Input for creating a test suite on the remote server."""

    name: str
    description: str | None = None
    metric_ids: list[UUID] = strawberry.field(default_factory=list)
    input_schema: JSON  # type: ignore[assignment]


# ============================================================================
# DSPy Evaluation Helpers
# ============================================================================

# JSON Schema type string → Python type
_JSON_TYPE_TO_PYTHON: dict[str, type] = {
    "string": str,
    "integer": int,
    "number": float,
    "boolean": bool,
    "array": list,
    "object": dict,
    "null": type(None),
}


def _json_schema_to_python_type(schema: dict[str, Any]) -> type:
    """Convert a JSON Schema fragment to a Python type."""
    json_type = schema.get("type", "string")
    if json_type == "array":
        return list
    if json_type == "object":
        return dict
    return _JSON_TYPE_TO_PYTHON.get(json_type, str)


def _build_dspy_signature(
    input_schema: dict[str, Any],
    output_schema: dict[str, Any],
) -> type:
    """Build a DSPy Signature class from input/output JSON schemas.

    Args:
        input_schema: JSON Schema for inputs.
        output_schema: JSON Schema for outputs.

    Returns:
        A dynamically created DSPy Signature class.
    """
    import dspy

    annotations: dict[str, type] = {}
    fields: dict[str, Any] = {}

    # Input fields (skip names starting with '_' – incompatible with DSPy)
    for name, prop in input_schema.get("properties", {}).items():
        if name.startswith("_"):
            continue
        python_type = _json_schema_to_python_type(prop)
        annotations[name] = python_type
        desc = prop.get("description", "")
        fields[name] = dspy.InputField(desc=desc)

    # Output fields (skip names starting with '_' – incompatible with DSPy)
    for name, prop in output_schema.get("properties", {}).items():
        if name.startswith("_"):
            continue
        python_type = _json_schema_to_python_type(prop)
        annotations[name] = python_type
        desc = prop.get("description", "")
        fields[name] = dspy.OutputField(desc=desc)

    namespace = {
        "__annotations__": annotations,
        "__doc__": "Evaluate test case.",
        **fields,
    }

    return type("EvalSignature", (dspy.Signature,), namespace)


def _prepare_dspy_input(
    entry_data: dict[str, Any],
    input_schema: dict[str, Any],
) -> dict[str, Any]:
    """Prepare input kwargs for DSPy module from an entry's data.

    Maps entry data fields to the input schema fields. If the entry
    has a direct match, uses it. Otherwise, serialises the full entry
    as a string for each expected input field.

    Args:
        entry_data: The data dict from a local data entry.
        input_schema: The input JSON Schema.

    Returns:
        Dict of kwargs for the DSPy module call.
    """
    input_props = input_schema.get("properties", {})
    kwargs: dict[str, Any] = {}

    for field_name in input_props:
        # Skip fields starting with '_' (incompatible with DSPy)
        if field_name.startswith("_"):
            continue
        if field_name in entry_data:
            val = entry_data[field_name]
            # Ensure strings for string-typed fields
            if isinstance(val, (dict, list)):
                kwargs[field_name] = json.dumps(val)
            else:
                kwargs[field_name] = str(val) if val is not None else ""
        else:
            # Field not in entry, provide the full entry as context
            kwargs[field_name] = json.dumps(entry_data)

    return kwargs


async def _save_evaluation_labels(
    client: Any,
    test_suite_id: Any,
    results: list[Any],
    output_schema: dict[str, Any],
) -> None:
    """Save evaluation results as labels on the remote server.

    For each successful result, creates labels for each output metric.

    Args:
        client: RemoteClient instance.
        test_suite_id: UUID of the test suite.
        results: List of EvaluationResultItem.
        output_schema: Output JSON schema with metric fields.
    """
    output_fields = list(output_schema.get("properties", {}).keys())
    labels_batch: list[dict[str, Any]] = []

    for result in results:
        if result.error:
            continue

        output_data = result.output if isinstance(result.output, dict) else {}
        metric_labels = []

        for field_name in output_fields:
            val = output_data.get(field_name)
            if val is not None:
                metric_labels.append(
                    {
                        "metric_id": field_name,  # Will be resolved server-side
                        "value": val,
                    }
                )

        if metric_labels:
            labels_batch.append(
                {
                    "test_case_id": result.entry_id,
                    "labels": metric_labels,
                    "notes": "AI evaluation",
                    "metadata": {
                        "labeled_by": "ai",
                        "sourcing": "recommended",
                    },
                }
            )

    if labels_batch:
        # Send in batches to avoid overly large mutations
        batch_size = 50
        for i in range(0, len(labels_batch), batch_size):
            batch = labels_batch[i : i + batch_size]
            try:
                await client.label_test_cases(
                    test_suite_id=test_suite_id,
                    labels=batch,
                )
            except Exception as e:
                logger.error(
                    "Failed to save label batch %d: %s",
                    i // batch_size + 1,
                    e,
                )


# ============================================================================
# Helpers
# ============================================================================


def _get_auth_token_from_context(context: dict[str, Any]) -> str | None:
    """Extract the bearer token forwarded by the frontend.

    The token is available in one of two places depending on transport:

    * **WebSocket subscriptions** – Strawberry stores the graphql-ws
      ``connectionParams`` payload in ``context["connection_params"]``
      after receiving the ``connection_init`` message.  The frontend is
      expected to send ``{ "authorization": "Bearer <token>" }``.

    * **HTTP requests** – Strawberry always merges ``{"request": <Request>}``
      into the context dict, so we can read the standard Authorization header.

    Args:
        context: The Strawberry GraphQL context dict.

    Returns:
        The raw JWT string (without "Bearer " prefix), or ``None``.
    """
    # WebSocket: read from connection_params (set by Strawberry from graphql-ws)
    connection_params = context.get("connection_params")
    if isinstance(connection_params, dict):
        auth = (
            connection_params.get("authorization")
            or connection_params.get("Authorization")
            or ""
        )
        if isinstance(auth, str) and auth.startswith("Bearer "):
            return auth[7:]

    # HTTP: read Authorization header from the Starlette Request object
    request = context.get("request")
    if request is not None and hasattr(request, "headers"):
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            return auth[7:]

    return None


def _dataset_to_type(d: dict[str, Any]) -> DatasetType:
    """Convert a dataset dict from the DB to a Strawberry type."""
    test_suite_id_raw = d.get("test_suite_id")
    return DatasetType(
        id=UUID(d["id"]) if isinstance(d["id"], str) else d["id"],
        file_name=d["file_name"],
        created_at=(
            datetime.fromisoformat(d["created_at"])
            if isinstance(d["created_at"], str)
            else d["created_at"]
        ),
        row_schema=d["row_schema"],
        test_suite_id=(
            UUID(test_suite_id_raw)
            if isinstance(test_suite_id_raw, str)
            else test_suite_id_raw
        ),
    )


def _entry_to_type(e: dict[str, Any]) -> DataEntryType:
    """Convert a data entry dict from the DB to a Strawberry type."""
    return DataEntryType(
        id=UUID(e["id"]) if isinstance(e["id"], str) else e["id"],
        dataset_id=(
            UUID(e["dataset_id"])
            if isinstance(e["dataset_id"], str)
            else e["dataset_id"]
        ),
        data=e["data"],
    )


# ============================================================================
# Queries
# ============================================================================


@strawberry.type
class Query:
    """GraphQL queries exposed by the local SDK server."""

    @strawberry.field
    async def list_datasets(self, info: Info) -> list[DatasetType]:
        """List all locally stored datasets."""
        conn = info.context["db"]
        datasets = await db.list_datasets(conn)
        return [_dataset_to_type(d) for d in datasets]

    @strawberry.field
    async def get_dataset(self, info: Info, id: UUID) -> DatasetType | None:
        """Get a dataset by ID."""
        conn = info.context["db"]
        dataset = await db.get_dataset(conn, id)
        if not dataset:
            return None
        return _dataset_to_type(dataset)

    @strawberry.field
    async def get_data_entries(
        self,
        info: Info,
        dataset_id: UUID,
        offset: int = 0,
        limit: int = 100,
    ) -> list[DataEntryType]:
        """Get paginated data entries for a dataset."""
        conn = info.context["db"]
        entries = await db.get_data_entries(
            conn, dataset_id=dataset_id, offset=offset, limit=limit
        )
        return [_entry_to_type(e) for e in entries]

    @strawberry.field
    async def data_entry_count(self, info: Info, dataset_id: UUID) -> int:
        """Count data entries in a dataset."""
        conn = info.context["db"]
        return await db.count_data_entries(conn, dataset_id)

    @strawberry.field
    async def render_labeling_ui(
        self,
        info: Info,
        entry_id: UUID,
        template_name: str | None = None,
    ) -> str:
        """Render the Jinja2 labeling UI for a data entry.

        Args:
            entry_id: UUID of the data entry to render.
            template_name: Optional template name override.

        Returns:
            HTML string rendered from the Jinja2 template.
        """
        from jinja2 import Environment, FileSystemLoader

        conn = info.context["db"]
        entry = await db.get_data_entry(conn, entry_id)

        if not entry:
            return "<html><body><h1>Entry not found</h1></body></html>"

        templates_dir = Path(__file__).parent / "templates"
        env = Environment(
            loader=FileSystemLoader(templates_dir),
            autoescape=True,
        )
        tpl_name = template_name or "default.html"

        try:
            tmpl = env.get_template(tpl_name)
            return tmpl.render(entry_id=entry_id, data=entry["data"])
        except Exception:
            data_json = json.dumps(entry["data"], indent=2)
            return f"<html><body><pre>{data_json}</pre></body></html>"


# ============================================================================
# Mutations
# ============================================================================


@strawberry.type
class Mutation:
    """GraphQL mutations exposed by the local SDK server."""

    @strawberry.mutation
    async def upload_file(
        self,
        info: Info,
        file: Upload,
    ) -> DatasetType:
        """Upload and ingest a data file into a local dataset.

        The file is received via the GraphQL multipart request spec,
        written to a temp file, then ingested.

        Args:
            file: The uploaded file (Upload scalar).

        Returns:
            The created dataset object.
        """
        conn = info.context["db"]
        file_name = file.filename or "uploaded_file"  # type: ignore[attr-defined]
        data = await file.read()  # type: ignore[attr-defined]

        # Write to temp file preserving extension for load_to_rows
        suffix = os.path.splitext(file_name)[1]
        tmp_path: str | None = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(data)
                tmp_path = tmp.name

            # Parse and infer schema
            rows = ingest.load_to_rows(tmp_path)
            row_schema = ingest.infer_schema(rows)

            # Create dataset record
            dataset_id = await db.create_dataset(
                conn, file_name=file_name, row_schema=row_schema
            )

            # Insert data entries
            await db.create_data_entries(conn, dataset_id=dataset_id, rows=rows)

            return DatasetType(
                id=dataset_id,
                file_name=file_name,
                created_at=datetime.now(),
                row_schema=row_schema,  # type: ignore[arg-type]
            )
        finally:
            if tmp_path:
                os.unlink(tmp_path)

    @strawberry.mutation
    async def delete_dataset(self, info: Info, id: UUID) -> bool:
        """Delete a dataset and all its data entries.

        Args:
            id: UUID of the dataset to delete.

        Returns:
            True if deleted successfully.
        """
        conn = info.context["db"]
        await conn.execute("DELETE FROM data_entries WHERE dataset_id = ?", (str(id),))
        await conn.execute("DELETE FROM datasets WHERE id = ?", (str(id),))
        await conn.commit()
        return True

    @strawberry.mutation
    async def link_dataset_to_test_suite(
        self,
        info: Info,
        dataset_id: UUID,
        test_suite_id: UUID,
    ) -> bool:
        """Link a local dataset to a remote test suite.

        Args:
            dataset_id: UUID of the local dataset.
            test_suite_id: UUID of the remote test suite.

        Returns:
            True if the dataset was found and linked.
        """
        conn = info.context["db"]
        return await db.link_dataset_to_test_suite(
            conn, dataset_id=dataset_id, test_suite_id=str(test_suite_id)
        )


# ============================================================================
# Subscriptions
# ============================================================================


@strawberry.type
class Subscription:
    """GraphQL subscriptions exposed by the local SDK server."""

    @strawberry.subscription
    async def create_test_suite_progress(
        self,
        info: Info,
        dataset_id: UUID,
        input: TestSuiteCreateInput,
    ) -> AsyncGenerator[TestSuiteCreationProgress, None]:
        """Subscribe to test suite creation progress.

        Orchestrates the full creation pipeline:
        1. Create the test suite on the remote server
        2. Batch-embed all data entries with OpenAI
        3. Upload embedded test cases to the remote server in batches

        Args:
            dataset_id: UUID of the local dataset to use.
            input: Test suite creation parameters.

        Yields:
            TestSuiteCreationProgress updates.
        """
        from pixie_sdk.remote_client import RemoteClient

        test_suite_id: UUID | None = None

        try:
            # Step 1: Create test suite on remote server
            yield TestSuiteCreationProgress(
                status=CreationStatus.CREATING,
                message="Creating test suite on remote server...",
                progress=0.0,
            )

            remote_endpoint = os.environ.get(
                "PIXIE_SERVER_URL", "http://localhost:8000/graphql"
            )
            auth_token = _get_auth_token_from_context(info.context)
            client = RemoteClient(remote_endpoint, auth_token=auth_token)

            test_suite_id = await client.create_test_suite(
                name=input.name,
                description=input.description,
                metric_ids=input.metric_ids,
                input_schema=input.input_schema,  # type: ignore[arg-type]
            )

            yield TestSuiteCreationProgress(
                status=CreationStatus.CREATING,
                message="Test suite created",
                progress=0.1,
                test_suite_id=test_suite_id,
            )

            # Step 2: Get all data entries and embed them
            conn = info.context["db"]
            all_entries = await db.get_data_entries(
                conn, dataset_id=dataset_id, offset=0, limit=999999
            )

            total_entries = len(all_entries)
            embedded_cases: list[dict[str, Any]] = []

            for i in range(0, total_entries, EMBED_BATCH_SIZE):
                batch = all_entries[i : i + EMBED_BATCH_SIZE]
                batch_data = [entry["data"] for entry in batch]

                embeddings = await embed.embed_batch(batch_data)

                for entry, embedding in zip(batch, embeddings):
                    embedded_cases.append(
                        {
                            "input": entry["data"],
                            "embedding": embedding,
                            "entry_id": str(entry["id"]),
                        }
                    )

                progress = 0.1 + 0.5 * (i + len(batch)) / total_entries
                batch_num = (i // EMBED_BATCH_SIZE) + 1
                total_batches = (
                    total_entries + EMBED_BATCH_SIZE - 1
                ) // EMBED_BATCH_SIZE
                yield TestSuiteCreationProgress(
                    status=CreationStatus.EMBEDDING,
                    message=f"Embedding batch {batch_num}/{total_batches}",
                    progress=progress,
                    test_suite_id=test_suite_id,
                )

            # Step 3: Upload test cases to remote server in batches
            total_cases = len(embedded_cases)
            for i in range(0, total_cases, UPLOAD_BATCH_SIZE):
                batch = embedded_cases[i : i + UPLOAD_BATCH_SIZE]
                await client.add_test_cases(test_suite_id, batch)

                progress = 0.6 + 0.4 * (i + len(batch)) / total_cases
                batch_num = (i // UPLOAD_BATCH_SIZE) + 1
                total_batches = (
                    total_cases + UPLOAD_BATCH_SIZE - 1
                ) // UPLOAD_BATCH_SIZE
                yield TestSuiteCreationProgress(
                    status=CreationStatus.UPLOADING,
                    message=f"Uploading batch {batch_num}/{total_batches}",
                    progress=progress,
                    test_suite_id=test_suite_id,
                )

            # Complete
            yield TestSuiteCreationProgress(
                status=CreationStatus.COMPLETE,
                message=f"Test suite created successfully with {total_entries} test cases!",
                progress=1.0,
                test_suite_id=test_suite_id,
            )

        except Exception as e:
            yield TestSuiteCreationProgress(
                status=CreationStatus.ERROR,
                message=f"Error: {str(e)}",
                progress=0.0,
                test_suite_id=test_suite_id,
            )

    @strawberry.subscription
    async def evaluate_dataset(
        self,
        info: Info,
        dataset_id: UUID,
    ) -> AsyncGenerator[EvaluationUpdate, None]:
        """Run evaluation on a dataset using the linked test suite's evaluator.

        Pipeline:
        1. Load dataset from local DB to get the linked test_suite_id
        2. Fetch evaluator signature + saved program from remote server
        3. Construct a DSPy ChainOfThought module
        4. Load test cases in batches from local DB
        5. Run each through the DSPy module
        6. Save results as labels to remote server
        7. Yield progress updates throughout

        Args:
            dataset_id: UUID of the local dataset to evaluate.

        Yields:
            EvaluationUpdate progress messages.
        """
        import dspy
        from dotenv import load_dotenv

        from pixie_sdk.remote_client import RemoteClient

        try:
            load_dotenv()  # Load OPENAI_API_KEY from .env if present
            # Step 1: Load dataset to get test_suite_id
            yield EvaluationUpdate(
                status=EvaluationStatus.LOADING,
                message="Loading dataset...",
                progress=0.0,
            )

            conn = info.context["db"]
            dataset = await db.get_dataset(conn, dataset_id)
            if not dataset:
                yield EvaluationUpdate(
                    status=EvaluationStatus.ERROR,
                    message="Dataset not found",
                    progress=0.0,
                )
                return

            test_suite_id_str = dataset.get("test_suite_id")
            if not test_suite_id_str:
                yield EvaluationUpdate(
                    status=EvaluationStatus.ERROR,
                    message="Dataset is not linked to a test suite",
                    progress=0.0,
                )
                return

            ts_id = (
                UUID(test_suite_id_str)
                if isinstance(test_suite_id_str, str)
                else test_suite_id_str
            )

            # Step 2: Fetch evaluator from remote server
            yield EvaluationUpdate(
                status=EvaluationStatus.LOADING,
                message="Fetching evaluator from server...",
                progress=0.05,
            )

            remote_endpoint = os.environ.get(
                "PIXIE_SERVER_URL", "http://localhost:8000/graphql"
            )
            auth_token = _get_auth_token_from_context(info.context)
            client = RemoteClient(remote_endpoint, auth_token=auth_token)
            evaluator_data = await client.get_evaluator_with_signature(ts_id)

            if not evaluator_data:
                yield EvaluationUpdate(
                    status=EvaluationStatus.ERROR,
                    message="No evaluator found for this test suite",
                    progress=0.0,
                )
                return

            # Step 3: Construct DSPy module from signature
            yield EvaluationUpdate(
                status=EvaluationStatus.LOADING,
                message="Building evaluation module...",
                progress=0.1,
            )

            input_schema = evaluator_data["input_schema"]
            output_schema = evaluator_data["output_schema"]
            saved_program = evaluator_data.get("saved_program")

            # Build DSPy signature from schemas
            sig = _build_dspy_signature(input_schema, output_schema)
            module = dspy.ChainOfThought(sig)

            # Load saved program state if available
            if saved_program and isinstance(saved_program, dict):
                try:
                    module.load_state(saved_program.get("state", saved_program))
                except Exception as e:
                    logger.warning("Could not load saved program state: %s", e)

            # Step 4: Load all data entries from local DB
            all_entries = await db.get_data_entries(
                conn, dataset_id=dataset_id, offset=0, limit=999999
            )
            total_entries = len(all_entries)

            if total_entries == 0:
                yield EvaluationUpdate(
                    status=EvaluationStatus.COMPLETE,
                    message="No data entries to evaluate",
                    progress=1.0,
                    total=0,
                    completed=0,
                )
                return

            yield EvaluationUpdate(
                status=EvaluationStatus.EVALUATING,
                message=f"Starting evaluation of {total_entries} entries...",
                progress=0.1,
                total=total_entries,
                completed=0,
            )

            # Build metric lookup from output_schema for saving labels
            output_fields = output_schema.get("properties", {})

            # Step 5-6: Evaluate in batches
            completed = 0
            all_results: list[EvaluationResultItem] = []

            for batch_start in range(0, total_entries, EVAL_BATCH_SIZE):
                batch = all_entries[batch_start : batch_start + EVAL_BATCH_SIZE]
                batch_results: list[EvaluationResultItem] = []
                for entry in batch:
                    entry_id = str(entry["id"])
                    entry_data = entry["data"]

                    try:
                        # Prepare input kwargs from entry data
                        input_kwargs = _prepare_dspy_input(entry_data, input_schema)

                        # Run DSPy module
                        with dspy.context(lm=dspy.LM("openai/gpt-4o-mini")):
                            result = module(**input_kwargs)

                        # Extract output fields
                        output_dict: dict[str, Any] = {}
                        for field_name in output_fields:
                            val = getattr(result, field_name, None)
                            output_dict[field_name] = val

                        batch_results.append(
                            EvaluationResultItem(
                                entry_id=entry_id,
                                output=JSON(output_dict),
                            )
                        )

                    except Exception as exc:
                        logger.error("Error evaluating entry %s: %s", entry_id, exc)
                        batch_results.append(
                            EvaluationResultItem(
                                entry_id=entry_id,
                                output=JSON({}),
                                error=str(exc),
                            )
                        )

                completed += len(batch)
                all_results.extend(batch_results)
                progress = 0.1 + 0.7 * (completed / total_entries)

                batch_num = (batch_start // EVAL_BATCH_SIZE) + 1
                total_batches = (total_entries + EVAL_BATCH_SIZE - 1) // EVAL_BATCH_SIZE

                yield EvaluationUpdate(
                    status=EvaluationStatus.EVALUATING,
                    message=f"Evaluated batch {batch_num}/{total_batches}",
                    progress=progress,
                    total=total_entries,
                    completed=completed,
                    results=batch_results,
                )

            # Step 6: Save results as labels to remote server
            yield EvaluationUpdate(
                status=EvaluationStatus.SAVING,
                message="Saving evaluation results...",
                progress=0.85,
                total=total_entries,
                completed=completed,
            )

            try:
                await _save_evaluation_labels(
                    client=client,
                    test_suite_id=ts_id,
                    results=all_results,
                    output_schema=output_schema,
                )
            except Exception as e:
                logger.error("Error saving labels: %s", e)
                # Don't fail the whole evaluation, just warn
                yield EvaluationUpdate(
                    status=EvaluationStatus.EVALUATING,
                    message=f"Warning: failed to save some labels: {e}",
                    progress=0.9,
                    total=total_entries,
                    completed=completed,
                )

            # Complete
            successful = sum(1 for r in all_results if r.error is None)
            yield EvaluationUpdate(
                status=EvaluationStatus.COMPLETE,
                message=(
                    f"Evaluation complete: {successful}/{total_entries} "
                    f"entries evaluated successfully"
                ),
                progress=1.0,
                total=total_entries,
                completed=completed,
            )

        except Exception as e:
            logger.exception("Evaluation failed: %s", e)
            yield EvaluationUpdate(
                status=EvaluationStatus.ERROR,
                message=f"Evaluation failed: {str(e)}",
                progress=0.0,
            )


# ============================================================================
# Schema
# ============================================================================

schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    subscription=Subscription,
)

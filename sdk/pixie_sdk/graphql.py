"""Strawberry GraphQL schema for the Pixie SDK local server.

Defines types, queries, mutations, and subscriptions for:
- Dataset management (upload, list, get)
- Test suite creation flow with progress updates via subscription
- Labeling UI rendering
"""

from __future__ import annotations

import enum
import json
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

# ============================================================================
# Constants
# ============================================================================

EMBED_BATCH_SIZE = 100  # Rows per OpenAI embedding call
UPLOAD_BATCH_SIZE = 50  # Test cases per addTestCases mutation

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
# Helpers
# ============================================================================


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
            client = RemoteClient(remote_endpoint)

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


# ============================================================================
# Schema
# ============================================================================

schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    subscription=Subscription,
)

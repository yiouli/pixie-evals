"""Strawberry GraphQL schema for the Pixie SDK local server.

Defines types, queries, mutations, and subscriptions for:
- Dataset management (upload, list, get)
- Test suite creation flow with progress updates via subscription
- Labeling UI rendering
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import AsyncGenerator
from uuid import UUID

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

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
# Queries
# ============================================================================


@strawberry.type
class Query:
    """GraphQL queries exposed by the local SDK server."""

    @strawberry.field
    async def list_datasets(self, info: Info) -> list[DatasetType]:
        """List all locally stored datasets.

        Returns:
            List of dataset objects.
        """
        from pixie_sdk.db import get_db, list_datasets

        db = await get_db()
        datasets = await list_datasets(db)
        await db.close()

        return [
            DatasetType(
                id=UUID(d["id"]),
                file_name=d["file_name"],
                created_at=datetime.fromisoformat(d["created_at"]),
                row_schema=d["row_schema"],
            )
            for d in datasets
        ]

    @strawberry.field
    async def get_dataset(self, info: Info, id: UUID) -> DatasetType | None:
        """Get a dataset by ID.

        Args:
            id: UUID of the dataset.

        Returns:
            The dataset, or None if not found.
        """
        from pixie_sdk.db import get_db, get_dataset

        db = await get_db()
        dataset = await get_dataset(db, id)
        await db.close()

        if not dataset:
            return None

        return DatasetType(
            id=UUID(dataset["id"]),
            file_name=dataset["file_name"],
            created_at=datetime.fromisoformat(dataset["created_at"]),
            row_schema=dataset["row_schema"],
        )

    @strawberry.field
    async def get_data_entries(
        self,
        info: Info,
        dataset_id: UUID,
        offset: int = 0,
        limit: int = 100,
    ) -> list[DataEntryType]:
        """Get paginated data entries for a dataset.

        Args:
            dataset_id: UUID of the parent dataset.
            offset: Number of entries to skip.
            limit: Maximum entries to return.

        Returns:
            List of data entries.
        """
        from pixie_sdk.db import get_db, get_data_entries

        db = await get_db()
        entries = await get_data_entries(
            db, dataset_id=dataset_id, offset=offset, limit=limit
        )
        await db.close()

        return [
            DataEntryType(
                id=UUID(e["id"]),
                dataset_id=UUID(e["dataset_id"]),
                data=e["data"],
            )
            for e in entries
        ]

    @strawberry.field
    async def data_entry_count(self, info: Info, dataset_id: UUID) -> int:
        """Count data entries in a dataset.

        Args:
            dataset_id: UUID of the parent dataset.

        Returns:
            Number of entries.
        """
        from pixie_sdk.db import get_db, count_data_entries

        db = await get_db()
        count = await count_data_entries(db, dataset_id)
        await db.close()
        return count

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
        import json
        from pathlib import Path

        from jinja2 import Environment, FileSystemLoader

        from pixie_sdk.db import get_db, get_data_entry

        db = await get_db()
        entry = await get_data_entry(db, entry_id)
        await db.close()

        if not entry:
            return "<html><body><h1>Entry not found</h1></body></html>"

        templates_dir = Path(__file__).parent / "templates"
        env = Environment(loader=FileSystemLoader(templates_dir))
        template = template_name or "default.html"

        try:
            tmpl = env.get_template(template)
            return tmpl.render(entry=entry)
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
        file_name: str,
        file_path: str,
    ) -> DatasetType:
        """Upload and ingest a data file into a local dataset.

        The file is loaded, a JSON schema is inferred, each row
        is assigned a UUID, and everything is stored in SQLite.

        Args:
            file_name: Original file name.
            file_path: Temporary path where the file was uploaded.

        Returns:
            The created dataset object.
        """
        from pixie_sdk.db import create_data_entries, create_dataset, get_db
        from pixie_sdk.ingest import infer_schema, load_to_rows

        # Load and infer schema
        rows = load_to_rows(file_path)
        row_schema = infer_schema(rows)

        # Create dataset record
        db = await get_db()
        dataset_id = await create_dataset(
            db, file_name=file_name, row_schema=row_schema
        )

        # Insert data entries
        await create_data_entries(db, dataset_id=dataset_id, rows=rows)
        await db.close()

        return DatasetType(
            id=dataset_id,
            file_name=file_name,
            created_at=datetime.now(),
            row_schema=row_schema,
        )

    @strawberry.mutation
    async def delete_dataset(self, info: Info, id: UUID) -> bool:
        """Delete a dataset and all its data entries.

        Args:
            id: UUID of the dataset to delete.

        Returns:
            True if deleted successfully.
        """
        from pixie_sdk.db import get_db

        db = await get_db()
        await db.execute("DELETE FROM datasets WHERE id = ?", (str(id),))
        await db.commit()
        await db.close()
        return True


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

        Progress updates are yielded at each step.

        Args:
            dataset_id: UUID of the local dataset to use.
            input: Test suite creation parameters.

        Yields:
            TestSuiteCreationProgress updates.
        """
        import os

        from pixie_sdk.db import get_data_entries, get_db
        from pixie_sdk.embed import embed_batch
        from pixie_sdk.remote_client import RemoteClient

        BATCH_SIZE = 100

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
                input_schema=input.input_schema,
            )

            yield TestSuiteCreationProgress(
                status=CreationStatus.EMBEDDING,
                message="Test suite created. Starting embedding...",
                progress=0.1,
                test_suite_id=test_suite_id,
            )

            # Step 2: Get all data entries and embed them
            db = await get_db()
            all_entries = await get_data_entries(
                db, dataset_id=dataset_id, offset=0, limit=10000
            )
            await db.close()

            total_entries = len(all_entries)
            embedded_cases = []

            for i in range(0, total_entries, BATCH_SIZE):
                batch = all_entries[i : i + BATCH_SIZE]
                batch_data = [entry["data"] for entry in batch]

                embeddings = await embed_batch(batch_data)

                for entry, embedding in zip(batch, embeddings):
                    embedded_cases.append(
                        {
                            "input": entry["data"],
                            "embedding": embedding,
                            "entry_id": str(entry["id"]),
                        }
                    )

                progress = 0.1 + 0.6 * (i + len(batch)) / total_entries
                yield TestSuiteCreationProgress(
                    status=CreationStatus.EMBEDDING,
                    message=f"Embedded {i + len(batch)}/{total_entries} test cases...",
                    progress=progress,
                    test_suite_id=test_suite_id,
                )

            # Step 3: Upload test cases to remote server in batches
            yield TestSuiteCreationProgress(
                status=CreationStatus.UPLOADING,
                message="Uploading test cases to remote server...",
                progress=0.7,
                test_suite_id=test_suite_id,
            )

            for i in range(0, len(embedded_cases), BATCH_SIZE):
                batch = embedded_cases[i : i + BATCH_SIZE]
                await client.add_test_cases(test_suite_id, batch)

                progress = 0.7 + 0.3 * (i + len(batch)) / len(embedded_cases)
                yield TestSuiteCreationProgress(
                    status=CreationStatus.UPLOADING,
                    message=f"Uploaded {i + len(batch)}/{len(embedded_cases)} test cases...",
                    progress=progress,
                    test_suite_id=test_suite_id,
                )

            # Complete
            yield TestSuiteCreationProgress(
                status=CreationStatus.COMPLETE,
                message=f"Successfully created test suite with {total_entries} test cases!",
                progress=1.0,
                test_suite_id=test_suite_id,
            )

        except Exception as e:
            yield TestSuiteCreationProgress(
                status=CreationStatus.ERROR,
                message=f"Error: {str(e)}",
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

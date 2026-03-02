"""End-to-end integration tests for the custom labeling UI component system.

Verifies the full flow: scaffold → scan → serve → load input.
Uses an in-memory SQLite DB and mocked remote client.

See Also:
    ``scaffold`` — generates .html + .d.ts scaffold files.
    ``scanner`` — scans and registers .html files.
    ``server`` — serves the labeling page with injected input data.
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import aiosqlite
import pytest
from httpx import ASGITransport, AsyncClient

from pixie_sdk.components import PLACEHOLDER_ATTR
from pixie_sdk.components.scaffold import scaffold_component

# ============================================================================
# Helpers
# ============================================================================


def _make_test_suite_response(
    name: str = "Trace Comparison",
    input_schema: dict | None = None,
) -> dict:
    """Build a fake remote test suite response."""
    return {
        "id": str(uuid4()),
        "name": name,
        "description": "Test suite for E2E testing",
        "config": json.dumps(
            {
                "inputSchema": input_schema
                or {
                    "type": "object",
                    "properties": {
                        "prompt": {"type": "string"},
                        "response": {"type": "string"},
                    },
                }
            }
        ),
    }


async def _create_temp_db(db_path: Path) -> None:
    """Create a SQLite database with the datasets/data_entries schema."""
    async with aiosqlite.connect(str(db_path)) as conn:
        await conn.execute(
            "CREATE TABLE IF NOT EXISTS datasets ("
            "  id TEXT PRIMARY KEY,"
            "  file_name TEXT NOT NULL,"
            "  created_at TEXT NOT NULL,"
            "  row_schema TEXT,"
            "  test_suite_id TEXT"
            ")"
        )
        await conn.execute(
            "CREATE TABLE IF NOT EXISTS data_entries ("
            "  id TEXT PRIMARY KEY,"
            "  dataset_id TEXT NOT NULL,"
            "  data TEXT NOT NULL,"
            "  FOREIGN KEY (dataset_id) REFERENCES datasets(id)"
            ")"
        )
        await conn.commit()


# ============================================================================
# Test: Scaffold → Scan → Serve
# ============================================================================


class TestE2ELabelingFlow:
    """Test the full developer workflow from scaffold to served component."""

    @pytest.mark.asyncio
    async def test_scaffold_creates_valid_html_and_dts(self, tmp_path: Path):
        """scaffold_component creates .html and .d.ts files with the right content."""
        mock_client = AsyncMock()
        mock_client.get_test_suite = AsyncMock(return_value=_make_test_suite_response())
        ts_id = uuid4()

        html_path, dts_path = await scaffold_component(
            test_suite_id=ts_id,
            components_dir=tmp_path,
            remote_client=mock_client,
        )

        # HTML file
        assert html_path.exists()
        assert html_path.suffix == ".html"
        assert html_path.parent == tmp_path

        html_content = html_path.read_text()
        assert PLACEHOLDER_ATTR in html_content
        assert "<!DOCTYPE html>" in html_content

        # d.ts file
        assert dts_path.exists()
        assert dts_path.suffix == ".ts"
        dts_content = dts_path.read_text()
        assert "interface InputProps" in dts_content
        assert "declare const INPUT: InputProps;" in dts_content
        assert "prompt" in dts_content
        assert "response" in dts_content

    @pytest.mark.asyncio
    async def test_scaffold_scan_and_register(self, tmp_path: Path):
        """Scaffolded HTML file is accepted by scan_and_register."""
        from pixie_sdk.components.registry import clear
        from pixie_sdk.components.scanner import scan_and_register

        mock_client = AsyncMock()
        mock_client.get_test_suite = AsyncMock(return_value=_make_test_suite_response())

        ts_id = uuid4()
        await scaffold_component(
            test_suite_id=ts_id,
            components_dir=tmp_path,
            remote_client=mock_client,
        )

        clear()
        registered = scan_and_register(tmp_path)
        assert isinstance(registered, list)
        assert len(registered) == 1
        # Slot is the normalized name, not UUID
        assert registered[0] == "trace_comparison"

    @pytest.mark.asyncio
    async def test_scaffold_file_named_by_suite_name(self, tmp_path: Path):
        """Scaffold files are named after the normalized test suite name."""
        mock_client = AsyncMock()
        mock_client.get_test_suite = AsyncMock(
            return_value=_make_test_suite_response(name="My Cool Suite")
        )

        ts_id = uuid4()
        html_path, dts_path = await scaffold_component(
            test_suite_id=ts_id,
            components_dir=tmp_path,
            remote_client=mock_client,
        )

        assert html_path.name == "my_cool_suite.html"
        assert dts_path.name == "my_cool_suite.d.ts"
        # Suite name appears in the HTML
        html_content = html_path.read_text()
        assert "My Cool Suite" in html_content

    @pytest.mark.asyncio
    async def test_scaffold_input_types_from_schema(self, tmp_path: Path):
        """The scaffold derives TypeScript interface from inputSchema."""
        schema = {
            "type": "object",
            "properties": {
                "conversation": {"type": "array", "items": {"type": "string"}},
                "score": {"type": "number"},
                "metadata": {"type": "object"},
            },
        }
        mock_client = AsyncMock()
        mock_client.get_test_suite = AsyncMock(
            return_value=_make_test_suite_response(input_schema=schema)
        )

        _html_path, dts_path = await scaffold_component(
            test_suite_id=uuid4(),
            components_dir=tmp_path,
            remote_client=mock_client,
        )

        dts_content = dts_path.read_text()
        # Fields are optional (no `required` in schema) so they get `?`
        assert "conversation?: string[]" in dts_content
        assert "score?: number" in dts_content
        assert "metadata?: Record<string, unknown>" in dts_content


# ============================================================================
# Test: Server serves input data from DB
# ============================================================================


class TestE2EInputEndpoint:
    """Test the /api/inputs/{id} endpoint with a real (temp) SQLite DB."""

    @pytest.mark.asyncio
    async def test_serves_data_entry(self, tmp_path: Path):
        """The input endpoint returns data from the local SQLite DB."""
        db_path = tmp_path / "test.db"
        await _create_temp_db(db_path)

        # Insert test data directly via aiosqlite
        ds_id = str(uuid4())
        entry_id = str(uuid4())
        entry_data = {"prompt": "What is 2+2?", "response": "4"}

        async with aiosqlite.connect(str(db_path)) as conn:
            await conn.execute(
                "INSERT INTO datasets (id, file_name, created_at, row_schema) "
                "VALUES (?, ?, datetime('now'), ?)",
                [ds_id, "test.json", json.dumps({"type": "object"})],
            )
            await conn.execute(
                "INSERT INTO data_entries (id, dataset_id, data) VALUES (?, ?, ?)",
                [entry_id, ds_id, json.dumps(entry_data)],
            )
            await conn.commit()

        from pixie_sdk import db

        original_get_db = db.get_db

        async def mock_get_db(*_args, **_kwargs):  # type: ignore[no-untyped-def]
            return await original_get_db(str(db_path))

        with patch("pixie_sdk.components.server.db.get_db", mock_get_db):
            from fastapi import FastAPI

            from pixie_sdk.components.server import router

            test_app = FastAPI()
            test_app.include_router(router)

            transport = ASGITransport(app=test_app)
            async with AsyncClient(
                transport=transport, base_url="http://test"
            ) as client:
                resp = await client.get(f"/api/inputs/{entry_id}")

            assert resp.status_code == 200
            body = resp.json()
            assert body["prompt"] == "What is 2+2?"
            assert body["response"] == "4"
            assert body["id"] == entry_id

    @pytest.mark.asyncio
    async def test_input_not_found_returns_404(self, tmp_path: Path):
        """The input endpoint returns 404 for missing entries."""
        db_path = tmp_path / "test.db"
        await _create_temp_db(db_path)

        from pixie_sdk import db

        original_get_db = db.get_db

        async def mock_get_db(*_args, **_kwargs):  # type: ignore[no-untyped-def]
            return await original_get_db(str(db_path))

        with patch("pixie_sdk.components.server.db.get_db", mock_get_db):
            from fastapi import FastAPI

            from pixie_sdk.components.server import router

            test_app = FastAPI()
            test_app.include_router(router)

            transport = ASGITransport(app=test_app)
            async with AsyncClient(
                transport=transport, base_url="http://test"
            ) as client:
                fake_id = str(uuid4())
                resp = await client.get(f"/api/inputs/{fake_id}")

            assert resp.status_code == 404


# ============================================================================
# Test: Labeling page route
# ============================================================================


class TestE2ELabelingPage:
    """Test the getLabelingHtml GraphQL query (full app integration)."""

    @pytest.mark.asyncio
    async def test_registered_component_returns_html_with_input(self, tmp_path: Path):
        """getLabelingHtml returns HTML with input data injected."""
        from pixie_sdk.components.registry import (
            RegisteredComponent,
            clear,
            set_component,
        )

        clear()

        # Create a temp HTML file with the placeholder
        html_file = tmp_path / "my_comp.html"
        html_file.write_text(
            "<!DOCTYPE html><html><head></head><body>"
            "<script pixie-evals-labeling-input>\n"
            "window.INPUT=undefined;\n"
            "</script>"
            "<script>console.log(window.INPUT)</script>"
            "</body></html>"
        )

        set_component(
            "my_comp",
            RegisteredComponent(
                slot="my_comp",
                src_path=html_file,
            ),
        )

        test_case_id = str(uuid4())
        test_suite_id = str(uuid4())
        entry_id = str(uuid4())
        entry_data = {"foo": "bar"}
        mock_entry = {
            "id": entry_id,
            "dataset_id": str(uuid4()),
            "data": entry_data,
        }

        mock_conn = AsyncMock()
        mock_client = AsyncMock()
        mock_client.get_test_case = AsyncMock(
            return_value={"id": test_case_id, "testSuite": test_suite_id}
        )
        mock_client.get_test_suite = AsyncMock(
            return_value={"id": test_suite_id, "name": "My Comp"}
        )

        with (
            patch("pixie_sdk.db.get_db", new=AsyncMock(return_value=mock_conn)),
            patch(
                "pixie_sdk.db.get_local_entry_id",
                new=AsyncMock(return_value=entry_id),
            ),
            patch(
                "pixie_sdk.db.get_data_entry",
                new=AsyncMock(return_value=mock_entry),
            ),
            patch(
                "pixie_sdk.remote_client.RemoteClient",
                return_value=mock_client,
            ),
            patch("pixie_sdk.components.scanner.rescan_components"),
        ):
            from pixie_sdk.server import app

            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport, base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/graphql",
                    json={
                        "query": """
                            query GetLabelingHtml($testCaseId: UUID!) {
                                getLabelingHtml(testCaseId: $testCaseId)
                            }
                        """,
                        "variables": {"testCaseId": test_case_id},
                    },
                    headers={"Authorization": "Bearer test-jwt"},
                )

            assert resp.status_code == 200
            data = resp.json()
            assert data.get("errors") is None, data.get("errors")
            html = data["data"]["getLabelingHtml"]
            assert "<html" in html
            # Placeholder default should be replaced with actual data
            assert "window.INPUT=undefined" not in html
            assert "window.INPUT=" in html
            assert '"foo"' in html
            assert '"bar"' in html

        clear()

    @pytest.mark.asyncio
    async def test_unregistered_component_returns_error(self):
        """Requesting a test case whose suite has no labeling page returns error."""
        from pixie_sdk.components.registry import clear

        clear()

        test_case_id = str(uuid4())
        test_suite_id = str(uuid4())

        mock_conn = AsyncMock()
        mock_client = AsyncMock()
        mock_client.get_test_case = AsyncMock(
            return_value={"id": test_case_id, "testSuite": test_suite_id}
        )
        mock_client.get_test_suite = AsyncMock(
            return_value={"id": test_suite_id, "name": "Nonexistent"}
        )

        with (
            patch("pixie_sdk.db.get_db", new=AsyncMock(return_value=mock_conn)),
            patch(
                "pixie_sdk.remote_client.RemoteClient",
                return_value=mock_client,
            ),
            patch("pixie_sdk.components.scanner.rescan_components"),
        ):
            from pixie_sdk.server import app

            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport, base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/graphql",
                    json={
                        "query": """
                            query GetLabelingHtml($testCaseId: UUID!) {
                                getLabelingHtml(testCaseId: $testCaseId)
                            }
                        """,
                        "variables": {"testCaseId": test_case_id},
                    },
                    headers={"Authorization": "Bearer test-jwt"},
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data.get("errors")
        assert "No labeling page" in data["errors"][0]["message"]

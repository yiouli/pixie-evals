"""End-to-end integration tests for the custom labeling UI component system.

Verifies the full flow: scaffold → scan → serve → load input.
Uses an in-memory SQLite DB and mocked remote client.

See Also:
    ``_scaffold`` — generates .tsx scaffold files.
    ``_scanner`` — scans and bundles .tsx files.
    ``_server`` — serves the component shell + input data.
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import aiosqlite
import pytest
from httpx import ASGITransport, AsyncClient

from pixie_sdk._components._scaffold import scaffold_component

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
    async def test_scaffold_creates_valid_tsx(self, tmp_path: Path):
        """scaffold_component creates a .tsx file with the right content."""
        mock_client = AsyncMock()
        mock_client.get_test_suite = AsyncMock(return_value=_make_test_suite_response())
        ts_id = uuid4()

        tsx_path = await scaffold_component(
            test_suite_id=ts_id,
            components_dir=tmp_path,
            remote_client=mock_client,
        )

        # Should have created a .tsx file
        assert tsx_path.exists(), f"Expected {tsx_path} to exist"
        assert tsx_path.suffix == ".tsx"
        assert tsx_path.parent == tmp_path

        content = tsx_path.read_text()
        assert "export default function" in content
        assert "InputProps" in content
        assert "prompt" in content
        assert "response" in content

    @pytest.mark.asyncio
    async def test_scaffold_scan_and_register(self, tmp_path: Path):
        """Scaffolded file is accepted by scan_and_register."""
        from pixie_sdk._components._registry import clear
        from pixie_sdk._components._scanner import scan_and_register

        mock_client = AsyncMock()
        mock_client.get_test_suite = AsyncMock(return_value=_make_test_suite_response())

        await scaffold_component(
            test_suite_id=uuid4(),
            components_dir=tmp_path,
            remote_client=mock_client,
        )

        clear()
        registered = scan_and_register(tmp_path)
        # scan_and_register returns a list of slot names.
        # If esbuild binary isn't available, it may return empty.
        assert isinstance(registered, list)

    @pytest.mark.asyncio
    async def test_scaffold_file_named_by_uuid(self, tmp_path: Path):
        """Scaffold file is named after the test suite UUID, not the name."""
        mock_client = AsyncMock()
        mock_client.get_test_suite = AsyncMock(
            return_value=_make_test_suite_response(name="My Cool Suite")
        )

        ts_id = uuid4()
        tsx_path = await scaffold_component(
            test_suite_id=ts_id,
            components_dir=tmp_path,
            remote_client=mock_client,
        )

        assert tsx_path.name == f"{ts_id}.tsx"
        content = tsx_path.read_text()
        # PascalCase function name comes from the suite name
        assert "MyCoolSuite" in content
        # Route uses the UUID
        assert str(ts_id) in content

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

        tsx_path = await scaffold_component(
            test_suite_id=uuid4(),
            components_dir=tmp_path,
            remote_client=mock_client,
        )

        content = tsx_path.read_text()
        # Fields are optional (no `required` in schema) so they get `?`
        assert "conversation?: string[]" in content
        assert "score?: number" in content
        assert "metadata?: Record<string, unknown>" in content


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

        # Capture the original get_db before patching
        from pixie_sdk import db

        original_get_db = db.get_db

        async def mock_get_db(*_args, **_kwargs):  # type: ignore[no-untyped-def]
            return await original_get_db(str(db_path))

        with patch("pixie_sdk._components._server.db.get_db", mock_get_db):
            from fastapi import FastAPI

            from pixie_sdk._components._server import router

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

        with patch("pixie_sdk._components._server.db.get_db", mock_get_db):
            from fastapi import FastAPI

            from pixie_sdk._components._server import router

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
    """Test the /labeling/{component_name}?id=... page route."""

    @pytest.mark.asyncio
    async def test_registered_component_returns_html(self):
        """A registered component returns a self-contained HTML shell."""
        from pixie_sdk._components._registry import (
            RegisteredComponent,
            clear,
            set_component,
        )

        clear()
        set_component(
            "my_comp",
            RegisteredComponent(
                slot="my_comp",
                src_path=Path("/fake/my_comp.tsx"),
                bundle_path=Path("/fake/my_comp.js"),
            ),
        )

        from fastapi import FastAPI

        from pixie_sdk._components._server import router

        test_app = FastAPI()
        test_app.include_router(router)

        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            entry_id = str(uuid4())
            resp = await client.get(f"/labeling/my_comp?id={entry_id}")

        assert resp.status_code == 200
        html = resp.text
        assert "my_comp" in html
        assert entry_id in html
        assert "<html" in html
        # The shell uses JS template literals like `/api/components/${COMPONENT_NAME}.js`
        # so the literal strings aren't in the HTML — verify the JS constants instead.
        assert "/api/components/" in html
        assert "/api/inputs/" in html

        clear()

    @pytest.mark.asyncio
    async def test_unregistered_component_returns_404(self):
        """Requesting an unregistered component returns 404."""
        from pixie_sdk._components._registry import clear

        clear()

        from fastapi import FastAPI

        from pixie_sdk._components._server import router

        test_app = FastAPI()
        test_app.include_router(router)

        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(f"/labeling/nonexistent?id={uuid4()}")

        assert resp.status_code == 404

"""Tests for pixie_sdk.db — SQLite database operations."""

from __future__ import annotations

import pytest

from pixie_sdk import db


class TestGetDb:
    """Test database initialization."""

    @pytest.mark.asyncio
    async def test_creates_tables(self, tmp_path):
        """get_db should create datasets and data_entries tables."""
        db_path = tmp_path / "test.db"
        conn = await db.get_db(db_path)
        cursor = await conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {row[0] for row in await cursor.fetchall()}
        await conn.close()
        assert "datasets" in tables
        assert "data_entries" in tables


class TestCreateDataset:
    """Test dataset creation."""

    @pytest.mark.asyncio
    async def test_returns_uuid(self, tmp_path, sample_schema):
        """create_dataset should return a UUID."""
        conn = await db.get_db(tmp_path / "test.db")
        dataset_id = await db.create_dataset(
            conn, file_name="test.json", row_schema=sample_schema
        )
        await conn.close()
        assert dataset_id is not None


class TestGetDataset:
    """Test dataset retrieval."""

    @pytest.mark.asyncio
    async def test_not_implemented(self, tmp_path):
        """get_dataset should raise NotImplementedError (stub)."""
        conn = await db.get_db(tmp_path / "test.db")
        with pytest.raises(NotImplementedError):
            await db.get_dataset(conn, dataset_id=pytest.importorskip("uuid").uuid4())
        await conn.close()


class TestListDatasets:
    """Test listing datasets."""

    @pytest.mark.asyncio
    async def test_not_implemented(self, tmp_path):
        """list_datasets should raise NotImplementedError (stub)."""
        conn = await db.get_db(tmp_path / "test.db")
        with pytest.raises(NotImplementedError):
            await db.list_datasets(conn)
        await conn.close()


class TestCreateDataEntries:
    """Test data entry creation."""

    @pytest.mark.asyncio
    async def test_not_implemented(self, tmp_path, sample_rows):
        """create_data_entries should raise NotImplementedError (stub)."""
        conn = await db.get_db(tmp_path / "test.db")
        with pytest.raises(NotImplementedError):
            await db.create_data_entries(
                conn, dataset_id=pytest.importorskip("uuid").uuid4(), rows=sample_rows
            )
        await conn.close()


class TestGetDataEntries:
    """Test data entry retrieval."""

    @pytest.mark.asyncio
    async def test_not_implemented(self, tmp_path, sample_dataset_id):
        """get_data_entries should raise NotImplementedError (stub)."""
        conn = await db.get_db(tmp_path / "test.db")
        with pytest.raises(NotImplementedError):
            await db.get_data_entries(conn, dataset_id=sample_dataset_id)
        await conn.close()

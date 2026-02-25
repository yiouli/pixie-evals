"""Tests for pixie_sdk.db — SQLite database operations."""

from __future__ import annotations

import asyncio

import pytest
import pytest_asyncio

from pixie_sdk import db

# ============================================================================
# Helpers
# ============================================================================


@pytest_asyncio.fixture
async def conn(tmp_path):
    """Provide a fresh DB connection for each test."""
    connection = await db.get_db(tmp_path / "test.db")
    yield connection
    await connection.close()


@pytest_asyncio.fixture
async def dataset_with_entries(conn, sample_rows, sample_schema):
    """Create a dataset with entries and return (dataset_id, entry_ids)."""
    dataset_id = await db.create_dataset(
        conn, file_name="test.json", row_schema=sample_schema
    )
    entry_ids = await db.create_data_entries(
        conn, dataset_id=dataset_id, rows=sample_rows
    )
    return dataset_id, entry_ids


# ============================================================================
# TestGetDb
# ============================================================================


class TestGetDb:
    """Test database initialization."""

    @pytest.mark.asyncio
    async def test_creates_tables(self, tmp_path):
        """get_db should create datasets and data_entries tables."""
        db_path = tmp_path / "test.db"
        connection = await db.get_db(db_path)
        cursor = await connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
        tables = {row[0] for row in await cursor.fetchall()}
        await connection.close()
        assert "datasets" in tables
        assert "data_entries" in tables


# ============================================================================
# TestCreateDataset
# ============================================================================


class TestCreateDataset:
    """Test dataset creation."""

    @pytest.mark.asyncio
    async def test_returns_uuid(self, conn, sample_schema):
        """create_dataset should return a UUID."""
        dataset_id = await db.create_dataset(
            conn, file_name="test.json", row_schema=sample_schema
        )
        assert dataset_id is not None


# ============================================================================
# TestGetDataset
# ============================================================================


class TestGetDataset:
    """Test dataset retrieval."""

    @pytest.mark.asyncio
    async def test_returns_created_dataset(self, conn, sample_schema):
        """get_dataset should return the created dataset with all fields."""
        dataset_id = await db.create_dataset(
            conn, file_name="test.json", row_schema=sample_schema
        )
        result = await db.get_dataset(conn, dataset_id)
        assert result is not None
        assert result["id"] == str(dataset_id)
        assert result["file_name"] == "test.json"
        assert result["row_schema"] == sample_schema
        assert "created_at" in result
        assert result["test_suite_id"] is None

    @pytest.mark.asyncio
    async def test_returns_test_suite_id_when_set(self, conn, sample_schema):
        """get_dataset should return test_suite_id when provided at creation."""
        from uuid import uuid4

        ts_id = str(uuid4())
        dataset_id = await db.create_dataset(
            conn, file_name="linked.json", row_schema=sample_schema, test_suite_id=ts_id
        )
        result = await db.get_dataset(conn, dataset_id)
        assert result is not None
        assert result["test_suite_id"] == ts_id

    @pytest.mark.asyncio
    async def test_returns_none_for_missing(self, conn):
        """get_dataset should return None for a non-existent ID."""
        from uuid import uuid4

        result = await db.get_dataset(conn, uuid4())
        assert result is None


# ============================================================================
# TestListDatasets
# ============================================================================


class TestListDatasets:
    """Test listing datasets."""

    @pytest.mark.asyncio
    async def test_returns_all(self, conn, sample_schema):
        """list_datasets should return all created datasets."""
        for i in range(3):
            await db.create_dataset(
                conn, file_name=f"file_{i}.json", row_schema=sample_schema
            )
        result = await db.list_datasets(conn)
        assert len(result) == 3

    @pytest.mark.asyncio
    async def test_empty_db(self, conn):
        """list_datasets should return empty list when no datasets exist."""
        result = await db.list_datasets(conn)
        assert result == []

    @pytest.mark.asyncio
    async def test_ordered_by_created_at_desc(self, conn, sample_schema):
        """list_datasets should return newest first."""
        id1 = await db.create_dataset(
            conn, file_name="first.json", row_schema=sample_schema
        )
        await asyncio.sleep(0.01)
        id2 = await db.create_dataset(
            conn, file_name="second.json", row_schema=sample_schema
        )
        result = await db.list_datasets(conn)
        assert result[0]["file_name"] == "second.json"
        assert result[1]["file_name"] == "first.json"


# ============================================================================
# TestCreateDataEntries
# ============================================================================


class TestCreateDataEntries:
    """Test data entry creation."""

    @pytest.mark.asyncio
    async def test_returns_uuids(self, conn, sample_schema, sample_rows):
        """create_data_entries should return a UUID per row."""
        dataset_id = await db.create_dataset(
            conn, file_name="test.json", row_schema=sample_schema
        )
        entry_ids = await db.create_data_entries(
            conn, dataset_id=dataset_id, rows=sample_rows
        )
        assert len(entry_ids) == len(sample_rows)

    @pytest.mark.asyncio
    async def test_entries_retrievable(self, dataset_with_entries, conn, sample_rows):
        """Created entries should be retrievable with matching data."""
        dataset_id, entry_ids = dataset_with_entries
        entries = await db.get_data_entries(
            conn, dataset_id=dataset_id, offset=0, limit=100
        )
        assert len(entries) == len(sample_rows)
        retrieved_data = [e["data"] for e in entries]
        for row in sample_rows:
            assert row in retrieved_data


# ============================================================================
# TestGetDataEntries
# ============================================================================


class TestGetDataEntries:
    """Test data entry retrieval."""

    @pytest.mark.asyncio
    async def test_pagination(self, conn, sample_schema):
        """get_data_entries should support offset and limit."""
        dataset_id = await db.create_dataset(
            conn, file_name="test.json", row_schema=sample_schema
        )
        rows = [{"i": i} for i in range(10)]
        await db.create_data_entries(conn, dataset_id=dataset_id, rows=rows)

        result = await db.get_data_entries(
            conn, dataset_id=dataset_id, offset=5, limit=3
        )
        assert len(result) == 3

    @pytest.mark.asyncio
    async def test_filters_by_dataset(self, conn, sample_schema):
        """get_data_entries should only return entries for the given dataset."""
        id1 = await db.create_dataset(
            conn, file_name="a.json", row_schema=sample_schema
        )
        id2 = await db.create_dataset(
            conn, file_name="b.json", row_schema=sample_schema
        )
        await db.create_data_entries(conn, dataset_id=id1, rows=[{"x": 1}, {"x": 2}])
        await db.create_data_entries(conn, dataset_id=id2, rows=[{"y": 3}])

        entries1 = await db.get_data_entries(conn, dataset_id=id1)
        entries2 = await db.get_data_entries(conn, dataset_id=id2)
        assert len(entries1) == 2
        assert len(entries2) == 1


# ============================================================================
# TestGetDataEntry
# ============================================================================


class TestGetDataEntry:
    """Test single data entry retrieval."""

    @pytest.mark.asyncio
    async def test_returns_single(self, dataset_with_entries, conn, sample_rows):
        """get_data_entry should return the entry with matching data."""
        dataset_id, entry_ids = dataset_with_entries
        entry = await db.get_data_entry(conn, entry_ids[0])
        assert entry is not None
        assert entry["data"] == sample_rows[0]

    @pytest.mark.asyncio
    async def test_returns_none(self, conn):
        """get_data_entry should return None for non-existent ID."""
        from uuid import uuid4

        result = await db.get_data_entry(conn, uuid4())
        assert result is None


# ============================================================================
# TestCountDataEntries
# ============================================================================


class TestCountDataEntries:
    """Test entry counting."""

    @pytest.mark.asyncio
    async def test_counts(self, dataset_with_entries, conn):
        """count_data_entries should return the correct count."""
        dataset_id, entry_ids = dataset_with_entries
        count = await db.count_data_entries(conn, dataset_id)
        assert count == len(entry_ids)

    @pytest.mark.asyncio
    async def test_zero_for_empty(self, conn):
        """count_data_entries should return 0 when no entries exist."""
        from uuid import uuid4

        count = await db.count_data_entries(conn, uuid4())
        assert count == 0


# ============================================================================
# TestLinkDatasetToTestSuite
# ============================================================================


class TestLinkDatasetToTestSuite:
    """Test linking a dataset to a remote test suite."""

    @pytest.mark.asyncio
    async def test_links_successfully(self, conn, sample_schema):
        """link_dataset_to_test_suite should set the test_suite_id."""
        from uuid import uuid4

        dataset_id = await db.create_dataset(
            conn, file_name="test.json", row_schema=sample_schema
        )
        ts_id = str(uuid4())
        result = await db.link_dataset_to_test_suite(
            conn, dataset_id=dataset_id, test_suite_id=ts_id
        )
        assert result is True

        dataset = await db.get_dataset(conn, dataset_id)
        assert dataset is not None
        assert dataset["test_suite_id"] == ts_id

    @pytest.mark.asyncio
    async def test_returns_false_for_missing_dataset(self, conn):
        """link_dataset_to_test_suite should return False for non-existent dataset."""
        from uuid import uuid4

        result = await db.link_dataset_to_test_suite(
            conn, dataset_id=uuid4(), test_suite_id=str(uuid4())
        )
        assert result is False

    @pytest.mark.asyncio
    async def test_overwrites_existing_link(self, conn, sample_schema):
        """link_dataset_to_test_suite should overwrite a previously set test_suite_id."""
        from uuid import uuid4

        ts_id_1 = str(uuid4())
        ts_id_2 = str(uuid4())
        dataset_id = await db.create_dataset(
            conn, file_name="test.json", row_schema=sample_schema, test_suite_id=ts_id_1
        )
        await db.link_dataset_to_test_suite(
            conn, dataset_id=dataset_id, test_suite_id=ts_id_2
        )
        dataset = await db.get_dataset(conn, dataset_id)
        assert dataset is not None
        assert dataset["test_suite_id"] == ts_id_2

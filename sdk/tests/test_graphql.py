"""Tests for pixie_sdk.graphql — Strawberry GraphQL schema."""

from __future__ import annotations

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from pixie_sdk.graphql import (
    CreationStatus,
    DataEntryType,
    DatasetType,
    Mutation,
    Query,
    Subscription,
    TestSuiteCreateInput,
    schema,
)

# ============================================================================
# Helpers
# ============================================================================


def _mock_info(db_conn=None):
    """Create a mock Strawberry Info object with a DB context."""
    info = MagicMock()
    info.context = {"db": db_conn or AsyncMock()}
    return info


def _make_dataset_dict(**overrides):
    """Create a dataset dict as returned by db functions."""
    base = {
        "id": str(uuid4()),
        "file_name": "test.json",
        "created_at": datetime.now().isoformat(),
        "row_schema": {"type": "object", "properties": {}},
    }
    base.update(overrides)
    return base


def _make_entry_dict(**overrides):
    """Create a data entry dict as returned by db functions."""
    base = {
        "id": str(uuid4()),
        "dataset_id": str(uuid4()),
        "data": {"prompt": "hello", "response": "world"},
    }
    base.update(overrides)
    return base


# ============================================================================
# TestSchema
# ============================================================================


class TestSchema:
    """Test that the schema is well-formed."""

    def test_schema_has_query(self):
        """Schema should include a Query type."""
        assert schema.query is not None

    def test_schema_has_mutation(self):
        """Schema should include a Mutation type."""
        assert schema.mutation is not None

    def test_schema_has_subscription(self):
        """Schema should include a Subscription type."""
        assert schema.subscription is not None


# ============================================================================
# TestQueryListDatasets (F4)
# ============================================================================


class TestQueryListDatasets:
    """Test the list_datasets query."""

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_empty(self, mock_db):
        """list_datasets returns empty list when no datasets exist."""
        mock_db.list_datasets = AsyncMock(return_value=[])
        query = Query()
        result = await query.list_datasets(info=_mock_info())
        assert result == []

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_returns_types(self, mock_db):
        """list_datasets returns DatasetType objects."""
        mock_db.list_datasets = AsyncMock(
            return_value=[_make_dataset_dict(), _make_dataset_dict()]
        )
        query = Query()
        result = await query.list_datasets(info=_mock_info())
        assert len(result) == 2
        assert all(isinstance(d, DatasetType) for d in result)


# ============================================================================
# TestQueryGetDataset (F4)
# ============================================================================


class TestQueryGetDataset:
    """Test the get_dataset query."""

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_found(self, mock_db):
        """get_dataset returns DatasetType for existing dataset."""
        ds_id = uuid4()
        mock_db.get_dataset = AsyncMock(return_value=_make_dataset_dict(id=str(ds_id)))
        query = Query()
        result = await query.get_dataset(info=_mock_info(), id=ds_id)
        assert result is not None
        assert isinstance(result, DatasetType)
        assert result.id == ds_id

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_not_found(self, mock_db):
        """get_dataset returns None for non-existent ID."""
        mock_db.get_dataset = AsyncMock(return_value=None)
        query = Query()
        result = await query.get_dataset(info=_mock_info(), id=uuid4())
        assert result is None


# ============================================================================
# TestQueryGetDataEntries (F4)
# ============================================================================


class TestQueryGetDataEntries:
    """Test the get_data_entries query."""

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_returns_entries(self, mock_db):
        """get_data_entries returns DataEntryType objects."""
        mock_db.get_data_entries = AsyncMock(
            return_value=[_make_entry_dict(), _make_entry_dict(), _make_entry_dict()]
        )
        query = Query()
        result = await query.get_data_entries(info=_mock_info(), dataset_id=uuid4())
        assert len(result) == 3
        assert all(isinstance(e, DataEntryType) for e in result)


# ============================================================================
# TestQueryDataEntryCount (F4)
# ============================================================================


class TestQueryDataEntryCount:
    """Test the data_entry_count query."""

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_returns_count(self, mock_db):
        """data_entry_count returns the integer count."""
        mock_db.count_data_entries = AsyncMock(return_value=42)
        query = Query()
        result = await query.data_entry_count(info=_mock_info(), dataset_id=uuid4())
        assert result == 42


# ============================================================================
# TestQueryRenderLabelingUi (F5)
# ============================================================================


class TestQueryRenderLabelingUi:
    """Test the render_labeling_ui query."""

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_returns_html(self, mock_db):
        """render_labeling_ui returns HTML containing the data."""
        entry = _make_entry_dict()
        mock_db.get_data_entry = AsyncMock(return_value=entry)
        query = Query()
        result = await query.render_labeling_ui(info=_mock_info(), entry_id=uuid4())
        assert isinstance(result, str)
        assert "Test Case Data" in result or "prompt" in result

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_not_found(self, mock_db):
        """render_labeling_ui returns error HTML for missing entry."""
        mock_db.get_data_entry = AsyncMock(return_value=None)
        query = Query()
        result = await query.render_labeling_ui(info=_mock_info(), entry_id=uuid4())
        assert "not found" in result.lower()


# ============================================================================
# TestMutationDeleteDataset
# ============================================================================


class TestMutationDeleteDataset:
    """Test the delete_dataset mutation."""

    @pytest.mark.asyncio
    async def test_returns_true(self):
        """delete_dataset returns True."""
        mock_conn = AsyncMock()
        mutation = Mutation()
        result = await mutation.delete_dataset(info=_mock_info(mock_conn), id=uuid4())
        assert result is True


# ============================================================================
# TestCreateTestSuiteProgress (F8)
# ============================================================================


class TestCreateTestSuiteProgress:
    """Test the create_test_suite_progress subscription."""

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.embed")
    @patch("pixie_sdk.graphql.db")
    @patch("pixie_sdk.graphql.RemoteClient", create=True)
    async def test_yields_creating_status(self, mock_remote_cls, mock_db, mock_embed):
        """First yield should have status=CREATING."""
        # Patch remote client import inside the subscription
        with patch("pixie_sdk.remote_client.RemoteClient") as mock_rc_class:
            mock_client = AsyncMock()
            mock_client.create_test_suite = AsyncMock(return_value=uuid4())
            mock_client.add_test_cases = AsyncMock(return_value=True)
            mock_rc_class.return_value = mock_client

            mock_db.get_data_entries = AsyncMock(return_value=[_make_entry_dict()])
            mock_embed.embed_batch = AsyncMock(return_value=[[0.1, 0.2]])

            sub = Subscription()
            inp = TestSuiteCreateInput(
                name="test",
                input_schema={"type": "object"},
            )
            info = _mock_info()

            progress_updates = []
            async for update in sub.create_test_suite_progress(
                info=info, dataset_id=uuid4(), input=inp
            ):
                progress_updates.append(update)

            assert progress_updates[0].status == CreationStatus.CREATING

    @pytest.mark.asyncio
    async def test_yields_error_on_remote_failure(self):
        """Should yield ERROR when remote client fails."""
        with patch("pixie_sdk.remote_client.RemoteClient") as mock_rc_class:
            mock_client = AsyncMock()
            mock_client.create_test_suite = AsyncMock(
                side_effect=Exception("Connection refused")
            )
            mock_rc_class.return_value = mock_client

            sub = Subscription()
            inp = TestSuiteCreateInput(
                name="test",
                input_schema={"type": "object"},
            )
            info = _mock_info()

            progress_updates = []
            async for update in sub.create_test_suite_progress(
                info=info, dataset_id=uuid4(), input=inp
            ):
                progress_updates.append(update)

            assert any(u.status == CreationStatus.ERROR for u in progress_updates)

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.embed")
    @patch("pixie_sdk.graphql.db")
    async def test_yields_complete(self, mock_db, mock_embed):
        """Last yield should have status=COMPLETE and progress=1.0."""
        with patch("pixie_sdk.remote_client.RemoteClient") as mock_rc_class:
            ts_id = uuid4()
            mock_client = AsyncMock()
            mock_client.create_test_suite = AsyncMock(return_value=ts_id)
            mock_client.add_test_cases = AsyncMock(return_value=True)
            mock_rc_class.return_value = mock_client

            mock_db.get_data_entries = AsyncMock(
                return_value=[_make_entry_dict(), _make_entry_dict()]
            )
            mock_embed.embed_batch = AsyncMock(return_value=[[0.1, 0.2], [0.3, 0.4]])

            sub = Subscription()
            inp = TestSuiteCreateInput(
                name="test",
                input_schema={"type": "object"},
            )
            info = _mock_info()

            progress_updates = []
            async for update in sub.create_test_suite_progress(
                info=info, dataset_id=uuid4(), input=inp
            ):
                progress_updates.append(update)

            last = progress_updates[-1]
            assert last.status == CreationStatus.COMPLETE
            assert last.progress == 1.0
            assert last.test_suite_id == ts_id

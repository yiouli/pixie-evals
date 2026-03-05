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
        "test_suite_id": None,
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
# TestMutationLinkDatasetToTestSuite
# ============================================================================


class TestMutationLinkDatasetToTestSuite:
    """Test the link_dataset_to_test_suite mutation."""

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_returns_true_on_success(self, mock_db):
        """link_dataset_to_test_suite returns True when db succeeds."""
        mock_db.link_dataset_to_test_suite = AsyncMock(return_value=True)
        mutation = Mutation()
        result = await mutation.link_dataset_to_test_suite(
            info=_mock_info(), dataset_id=uuid4(), test_suite_id=uuid4()
        )
        assert result is True
        mock_db.link_dataset_to_test_suite.assert_called_once()

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_returns_false_when_not_found(self, mock_db):
        """link_dataset_to_test_suite returns False when dataset not found."""
        mock_db.link_dataset_to_test_suite = AsyncMock(return_value=False)
        mutation = Mutation()
        result = await mutation.link_dataset_to_test_suite(
            info=_mock_info(), dataset_id=uuid4(), test_suite_id=uuid4()
        )
        assert result is False


# ============================================================================
# TestCreateTestSuiteProgress (F8)
# ============================================================================


class TestCreateTestSuiteProgress:
    """Test the create_test_suite_progress subscription."""

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.embed")
    @patch("pixie_sdk.graphql.db")
    @patch("pixie_sdk.graphql.RemoteClient")
    async def test_yields_creating_status(self, mock_rc_class, mock_db, mock_embed):
        """First yield should have status=CREATING."""
        mock_client = AsyncMock()
        mock_client.create_test_suite = AsyncMock(return_value=uuid4())
        remote_ids = [str(uuid4())]
        mock_client.add_test_cases = AsyncMock(return_value=remote_ids)
        mock_rc_class.return_value = mock_client

        mock_db.get_data_entries = AsyncMock(return_value=[_make_entry_dict()])
        mock_embed.embed_batch = AsyncMock(return_value=[[0.1, 0.2]])
        # The upload loop calls db.get_db() and db.save_test_case_map().
        mock_db.get_db = AsyncMock(return_value=AsyncMock())
        mock_db.save_test_case_map = AsyncMock()

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
        with patch("pixie_sdk.graphql.RemoteClient") as mock_rc_class:
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
        with patch("pixie_sdk.graphql.RemoteClient") as mock_rc_class:
            ts_id = uuid4()
            mock_client = AsyncMock()
            mock_client.create_test_suite = AsyncMock(return_value=ts_id)
            # add_test_cases now returns a list of remote UUID strings.
            remote_ids = [str(uuid4()), str(uuid4())]
            mock_client.add_test_cases = AsyncMock(return_value=remote_ids)
            mock_rc_class.return_value = mock_client

            entries = [_make_entry_dict(), _make_entry_dict()]
            mock_db.get_data_entries = AsyncMock(return_value=entries)
            mock_embed.embed_batch = AsyncMock(return_value=[[0.1, 0.2], [0.3, 0.4]])
            # The upload loop calls db.get_db() and db.save_test_case_map().
            mock_mapping_conn = AsyncMock()
            mock_db.get_db = AsyncMock(return_value=mock_mapping_conn)
            mock_db.save_test_case_map = AsyncMock()

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


# ============================================================================
# TestMutationScaffoldLabelingComponent
# ============================================================================


class TestMutationScaffoldLabelingComponent:
    """Test the scaffold_labeling_component mutation."""

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.get_components_dir")
    @patch("pixie_sdk.graphql.scaffold_component", new_callable=AsyncMock)
    @patch("pixie_sdk.graphql.RemoteClient")
    async def test_returns_path(
        self, mock_rc_cls, mock_scaffold, mock_get_dir, tmp_path
    ):
        """scaffold_labeling_component returns the scaffold file path."""
        from pathlib import Path

        mock_get_dir.return_value = tmp_path / "labeling"
        ts_id = uuid4()
        html_path = Path("labeling/trace_comparison.html")
        dts_path = Path("labeling/trace_comparison.d.ts")
        mock_scaffold.return_value = (html_path, dts_path)

        mutation = Mutation()
        result = await mutation.scaffold_labeling_component(
            info=_mock_info(), test_suite_id=ts_id
        )
        assert result == "labeling/trace_comparison.html"
        mock_scaffold.assert_called_once()
        # Verify test_suite_id was passed
        call_kwargs = mock_scaffold.call_args
        assert call_kwargs.kwargs["test_suite_id"] == ts_id

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.get_components_dir")
    @patch("pixie_sdk.graphql.scaffold_component", new_callable=AsyncMock)
    @patch("pixie_sdk.graphql.RemoteClient")
    async def test_raises_on_not_found(
        self, mock_rc_cls, mock_scaffold, mock_get_dir, tmp_path
    ):
        """scaffold_labeling_component propagates error when test suite not found."""
        mock_get_dir.return_value = tmp_path / "labeling"
        mock_scaffold.side_effect = ValueError("Test suite not found")

        mutation = Mutation()
        with pytest.raises(ValueError, match="not found"):
            await mutation.scaffold_labeling_component(
                info=_mock_info(), test_suite_id=uuid4()
            )


# ============================================================================
# TestMutationCreateDataset
# ============================================================================


class TestMutationCreateDataset:
    """Test the create_dataset mutation."""

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_creates_dataset(self, mock_db):
        """create_dataset returns a DatasetType with correct fields."""
        ds_id = uuid4()
        mock_db.create_dataset = AsyncMock(return_value=ds_id)

        mutation = Mutation()
        schema = {"type": "object", "properties": {"q": {"type": "string"}}}
        result = await mutation.create_dataset(
            info=_mock_info(),
            name="Generated Dataset",
            row_schema=schema,
        )

        assert isinstance(result, DatasetType)
        assert result.id == ds_id
        assert result.file_name == "Generated Dataset"
        assert result.row_schema == schema
        assert result.test_suite_id is None
        mock_db.create_dataset.assert_called_once()

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_with_test_suite_id(self, mock_db):
        """create_dataset passes test_suite_id to db when provided."""
        ds_id = uuid4()
        ts_id = uuid4()
        mock_db.create_dataset = AsyncMock(return_value=ds_id)

        mutation = Mutation()
        result = await mutation.create_dataset(
            info=_mock_info(),
            name="My Dataset",
            row_schema={"type": "object"},
            test_suite_id=ts_id,
        )

        assert result.test_suite_id == ts_id
        call_kwargs = mock_db.create_dataset.call_args
        assert call_kwargs.kwargs.get("test_suite_id") == str(ts_id)


# ============================================================================
# TestMutationAddDataEntry
# ============================================================================


class TestMutationAddDataEntry:
    """Test the add_data_entry mutation."""

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_adds_entry(self, mock_db):
        """add_data_entry returns a DataEntryType with correct fields."""
        ds_id = uuid4()
        entry_id = uuid4()
        mock_db.create_data_entries = AsyncMock(return_value=[entry_id])

        mutation = Mutation()
        data = {"prompt": "hello", "response": "world"}
        info = _mock_info()
        result = await mutation.add_data_entry(
            info=info,
            dataset_id=ds_id,
            data=data,
        )

        assert isinstance(result, DataEntryType)
        assert result.id == entry_id
        assert result.dataset_id == ds_id
        assert result.data == data
        mock_db.create_data_entries.assert_called_once()
        call_kwargs = mock_db.create_data_entries.call_args.kwargs
        assert call_kwargs["dataset_id"] == ds_id
        assert call_kwargs["rows"] == [data]

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql.db")
    async def test_handles_non_dict_data(self, mock_db):
        """add_data_entry handles non-dict data gracefully."""
        entry_id = uuid4()
        ds_id = uuid4()
        mock_db.create_data_entries = AsyncMock(return_value=[entry_id])

        mutation = Mutation()
        # Pass a non-dict (string) — should fall back to empty dict
        result = await mutation.add_data_entry(
            info=_mock_info(),
            dataset_id=ds_id,
            data="not a dict",  # type: ignore[arg-type]
        )

        assert isinstance(result, DataEntryType)
        assert result.data == {}

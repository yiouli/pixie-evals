"""Tests for pixie_sdk.graphql — Strawberry GraphQL schema."""

from __future__ import annotations

import pytest

from pixie_sdk.graphql import Query, Mutation, schema


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


class TestQueryListDatasets:
    """Test the list_datasets query."""

    @pytest.mark.asyncio
    async def test_not_implemented(self):
        """list_datasets should raise NotImplementedError (stub)."""
        query = Query()
        with pytest.raises(NotImplementedError):
            await query.list_datasets(info=None)  # type: ignore[arg-type]


class TestMutationUploadFile:
    """Test the upload_file mutation."""

    @pytest.mark.asyncio
    async def test_not_implemented(self):
        """upload_file should raise NotImplementedError (stub)."""
        mutation = Mutation()
        with pytest.raises(NotImplementedError):
            await mutation.upload_file(
                info=None,  # type: ignore[arg-type]
                file_name="test.json",
                file_path="/tmp/test.json",
            )

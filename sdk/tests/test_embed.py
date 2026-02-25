"""Tests for pixie_sdk.embed — OpenAI embedding utilities."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from pixie_sdk.embed import embed_batch, embed_single


def _make_embedding_response(count: int, dim: int = 4):
    """Create a fake OpenAI embeddings response with `count` vectors."""
    response = MagicMock()
    items = []
    for i in range(count):
        item = MagicMock()
        item.embedding = [float(i)] * dim
        items.append(item)
    response.data = items
    return response


# ============================================================================
# TestEmbedBatch
# ============================================================================


class TestEmbedBatch:
    """Test batch embedding."""

    @pytest.mark.asyncio
    @patch("pixie_sdk.embed._get_client")
    async def test_returns_vectors(self, mock_get_client):
        """embed_batch should return one vector per row."""
        mock_client = MagicMock()
        mock_client.embeddings.create = AsyncMock(
            return_value=_make_embedding_response(3)
        )
        mock_get_client.return_value = mock_client

        rows = [{"a": 1}, {"a": 2}, {"a": 3}]
        result = await embed_batch(rows)

        assert len(result) == 3
        assert all(isinstance(v, list) for v in result)

    @pytest.mark.asyncio
    @patch("pixie_sdk.embed._get_client")
    async def test_serializes_rows(self, mock_get_client):
        """embed_batch should serialize rows to sorted JSON strings."""
        mock_client = MagicMock()
        mock_client.embeddings.create = AsyncMock(
            return_value=_make_embedding_response(1)
        )
        mock_get_client.return_value = mock_client

        await embed_batch([{"b": 2, "a": 1}])

        call_args = mock_client.embeddings.create.call_args
        input_texts = call_args.kwargs.get("input") or call_args[1].get("input")
        assert input_texts == ['{"a": 1, "b": 2}']

    @pytest.mark.asyncio
    @patch("pixie_sdk.embed._get_client")
    async def test_uses_model(self, mock_get_client):
        """embed_batch should pass the model argument to the API."""
        mock_client = MagicMock()
        mock_client.embeddings.create = AsyncMock(
            return_value=_make_embedding_response(1)
        )
        mock_get_client.return_value = mock_client

        await embed_batch([{"a": 1}], model="text-embedding-3-large")

        call_args = mock_client.embeddings.create.call_args
        model = call_args.kwargs.get("model") or call_args[1].get("model")
        assert model == "text-embedding-3-large"

    @pytest.mark.asyncio
    @patch("pixie_sdk.embed._get_client")
    async def test_handles_error(self, mock_get_client):
        """embed_batch should raise RuntimeError on API failure."""
        mock_client = MagicMock()
        mock_client.embeddings.create = AsyncMock(side_effect=Exception("API error"))
        mock_get_client.return_value = mock_client

        with pytest.raises(RuntimeError, match="Embedding failed"):
            await embed_batch([{"a": 1}])

    @pytest.mark.asyncio
    @patch("pixie_sdk.embed._get_client")
    async def test_chunks_large_input(self, mock_get_client):
        """embed_batch should split >2048 rows into multiple API calls."""
        total = 3000

        def mock_create(**kwargs):
            n = len(kwargs["input"])
            return _make_embedding_response(n)

        mock_client = MagicMock()
        mock_client.embeddings.create = AsyncMock(side_effect=mock_create)
        mock_get_client.return_value = mock_client

        rows = [{"i": i} for i in range(total)]
        result = await embed_batch(rows)

        assert len(result) == total
        assert mock_client.embeddings.create.call_count == 2  # 2048 + 952


# ============================================================================
# TestEmbedSingle
# ============================================================================


class TestEmbedSingle:
    """Test single-row embedding."""

    @pytest.mark.asyncio
    @patch("pixie_sdk.embed.embed_batch")
    async def test_delegates(self, mock_embed_batch):
        """embed_single should delegate to embed_batch."""
        mock_embed_batch.return_value = [[0.1, 0.2, 0.3]]

        result = await embed_single({"a": 1})

        assert result == [0.1, 0.2, 0.3]
        mock_embed_batch.assert_called_once_with(
            [{"a": 1}], model="text-embedding-3-small"
        )

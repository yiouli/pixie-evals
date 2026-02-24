"""Tests for pixie_sdk.embed — OpenAI embedding utilities."""

from __future__ import annotations

import pytest

from pixie_sdk.embed import embed_batch, embed_single


class TestEmbedBatch:
    """Test batch embedding."""

    @pytest.mark.asyncio
    async def test_not_implemented(self, sample_rows):
        """embed_batch should raise NotImplementedError (stub)."""
        with pytest.raises(NotImplementedError):
            await embed_batch(sample_rows)


class TestEmbedSingle:
    """Test single-row embedding."""

    @pytest.mark.asyncio
    async def test_not_implemented(self):
        """embed_single should raise NotImplementedError (stub)."""
        with pytest.raises(NotImplementedError):
            await embed_single({"prompt": "hello", "response": "world"})

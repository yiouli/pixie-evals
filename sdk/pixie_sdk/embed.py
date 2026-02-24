"""Embedding utilities for the Pixie SDK.

Wraps the OpenAI text embedding API for batch embedding of test case data.
"""

from __future__ import annotations

import json
from typing import Any

from openai import AsyncOpenAI


def _get_client() -> AsyncOpenAI:
    """Get or create the OpenAI client."""
    return AsyncOpenAI()


async def embed_batch(
    rows: list[dict[str, Any]],
    *,
    model: str = "text-embedding-3-small",
) -> list[list[float]]:
    """Embed a batch of data rows using OpenAI's text embedding API.

    Each row is serialized to a JSON string before embedding.

    Args:
        rows: List of data row dicts to embed.
        model: OpenAI embedding model name.

    Returns:
        List of embedding vectors (list of floats), one per row.

    Raises:
        RuntimeError: If the OpenAI API call fails.
    """
    try:
        client = _get_client()
        texts = [json.dumps(row, sort_keys=True) for row in rows]
        response = await client.embeddings.create(input=texts, model=model)
        return [item.embedding for item in response.data]
    except Exception as e:
        raise RuntimeError(f"OpenAI embedding failed: {e}") from e


async def embed_single(
    row: dict[str, Any],
    *,
    model: str = "text-embedding-3-small",
) -> list[float]:
    """Embed a single data row.

    Args:
        row: Data row dict to embed.
        model: OpenAI embedding model name.

    Returns:
        Embedding vector.
    """
    embeddings = await embed_batch([row], model=model)
    return embeddings[0]

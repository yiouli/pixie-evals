# F6: OpenAI Embedding

**Scope**: `sdk/pixie_sdk/embed.py`
**Phase**: 2 (no dependencies)
**Tests**: `sdk/tests/test_embed.py`

## Overview

Wrap the OpenAI text embedding API to convert data rows into embedding vectors. Used by F8 (creation pipeline) to embed test cases before uploading to the remote server.

## Functions to Implement

### `embed_batch(rows, *, model) -> list[list[float]]`

1. Serialize each row to a JSON string: `json.dumps(row, sort_keys=True)`
2. Call the OpenAI embeddings API with the batch:
   ```python
   from openai import AsyncOpenAI
   client = AsyncOpenAI()  # Uses OPENAI_API_KEY env var
   response = await client.embeddings.create(
       input=texts,
       model=model,
   )
   ```
3. Extract embedding vectors from response: `[item.embedding for item in response.data]`
4. Return the list of vectors

**Batch size**: OpenAI supports up to 2048 inputs per call. If `len(rows) > 2048`, split into chunks and make multiple API calls.

**Error handling**: Wrap API errors in `RuntimeError(f"Embedding failed: {e}")`.

### `embed_single(row, *, model) -> list[float]`

Convenience wrapper: `return (await embed_batch([row], model=model))[0]`

## Configuration

- Model default: `text-embedding-3-small` (1536 dimensions)
- API key: from `OPENAI_API_KEY` environment variable (standard OpenAI client behavior)
- No custom base URL needed unless user sets `OPENAI_BASE_URL`

## Test Plan

Update `sdk/tests/test_embed.py` — all tests MUST mock the OpenAI client.

| Test | Setup | Assertion |
|------|-------|-----------|
| `test_embed_batch_returns_vectors` | Mock `AsyncOpenAI().embeddings.create` → fake response with 3 embeddings | Returns list of 3 lists of floats |
| `test_embed_batch_serializes_rows` | Mock, capture input | Input texts are JSON-serialized rows |
| `test_embed_batch_uses_model` | Mock, capture model param | Model matches the passed `model` arg |
| `test_embed_batch_handles_error` | Mock raises `openai.APIError` | Raises `RuntimeError` |
| `test_embed_batch_chunks_large_input` | 3000 rows, mock | Makes 2 API calls (2048 + 952) |
| `test_embed_single_delegates` | Mock `embed_batch` | Calls `embed_batch` with single-element list |

## Implementation Notes

- Use `AsyncOpenAI` (not sync `OpenAI`) since the SDK server is async
- The `openai` package is already in `pyproject.toml` dependencies
- Embedding dimensions for `text-embedding-3-small`: 1536 floats
- Sort keys in JSON serialization for deterministic embeddings
```

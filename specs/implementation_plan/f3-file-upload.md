# F3: File Upload

**Scope**: `sdk/pixie_sdk/graphql.py` (mutation), `sdk/pixie_sdk/server.py` (multipart config)
**Phase**: 3 (depends on F1, F2, F4)
**Tests**: `sdk/tests/test_graphql.py`

## Overview

Implement file upload using Strawberry's native `Upload` scalar over a single GraphQL multipart mutation. The frontend sends a standard [GraphQL multipart request](https://github.com/jaydenseric/graphql-multipart-request-spec) — no separate REST endpoint is needed.

## Dependencies

Add `python-multipart` via the `strawberry-graphql[fastapi]` extras in `pyproject.toml`:

```toml
[tool.poetry.dependencies]
strawberry-graphql = { version = "...", extras = ["fastapi"] }
```

## Server Configuration

Enable multipart uploads on the Strawberry `GraphQLRouter` in `server.py`:

```python
from strawberry.fastapi import GraphQLRouter

graphql_app = GraphQLRouter(
    schema,
    context_getter=get_context,
    multipart_uploads_enabled=True,  # required for Upload scalar
)
```

> **Security note**: multipart uploads are disabled by default. Since the SDK only runs locally, this is safe. Do not enable this on any public-facing server without CSRF protection.

## GraphQL Mutation: `upload_file(file: Upload!) -> DatasetType`

Use Strawberry's `Upload` scalar. For the FastAPI integration, the runtime type is `fastapi.UploadFile`.

```python
import strawberry
from strawberry.file_uploads import Upload

@strawberry.type
class Mutation:
    @strawberry.mutation
    async def upload_file(self, info: Info, file: Upload) -> DatasetType:
        ...
```

**Implementation steps**:

1. Read the original filename: `file_name = file.filename`
2. Read bytes: `data = await file.read()`
3. Write to a temp file preserving the extension (needed by `ingest.load_to_rows`):
   ```python
   import tempfile, os
   suffix = os.path.splitext(file_name)[1]
   with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
       tmp.write(data)
       tmp_path = tmp.name
   ```
4. Call `ingest.load_to_rows(tmp_path)` to parse the data
5. Call `ingest.infer_schema(rows)` to get the JSON schema
6. Call `db.create_dataset(conn, file_name=file_name, row_schema=schema)`
7. Call `db.create_data_entries(conn, dataset_id=dataset_id, rows=rows)`
8. Delete the temp file: `os.unlink(tmp_path)` (in a `finally` block)
9. Return a `DatasetType` with the created dataset info

**DB connection management**: The GraphQL context provides a DB connection via `info.context["db"]` — set up in the context getter (see F4).

### Context Getter Update

Update `server.py` to inject a DB connection into the GraphQL context:

```python
async def get_context() -> dict:
    db_conn = await db.get_db()
    return {"db": db_conn}
```

## Test Plan

### `test_graphql.py`

Tests use `httpx.AsyncClient` (or `starlette.testclient.TestClient`) against the FastAPI app, sending a properly structured GraphQL multipart request.

| Test | Setup | Assertion |
|------|-------|-----------|
| `test_upload_file_creates_dataset` | POST multipart with JSON file content | Returns `DatasetType` with correct `file_name` |
| `test_upload_file_stores_entries` | POST multipart with 3-row JSON | `data_entry_count` returns 3 |
| `test_upload_file_infers_schema` | POST multipart with known JSON structure | `row_schema` matches expected schema |
| `test_upload_file_cleans_up_temp` | POST multipart, check no temp files remain | Temp file is deleted after ingestion |

**Sending a multipart request in tests** (using `TestClient` against the FastAPI app):

```python
response = client.post(
    "/graphql",
    data={
        "operations": json.dumps({
            "query": "mutation($file: Upload!) { uploadFile(file: $file) { id fileName } }",
            "variables": {"file": None},
        }),
        "map": json.dumps({"file": ["variables.file"]}),
    },
    files={"file": ("data.json", b'[{"a":1}]', "application/json")},
)
```

## Implementation Notes

- A single GraphQL multipart mutation replaces the previous two-step REST+GraphQL flow — no `POST /upload` REST endpoint
- The temp file is an implementation detail of the mutation; `ingest.load_to_rows` still accepts a path (no change to F1)
- Always delete the temp file in a `finally` block to avoid leaks on error
- The `Upload` scalar is `fastapi.UploadFile` at runtime when using the FastAPI integration

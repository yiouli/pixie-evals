# F8: Test Suite Creation Pipeline

**Scope**: `sdk/pixie_sdk/graphql.py` — Subscription resolver
**Phase**: 4 (depends on F2, F6, F7)
**Tests**: `sdk/tests/test_graphql.py`

## Overview

Implement the `create_test_suite_progress` subscription that orchestrates the full test suite creation pipeline. The frontend subscribes to this to get real-time progress updates while the SDK:

1. Creates the test suite on the remote server
2. Embeds all data entries in batches
3. Uploads embedded test cases to the remote server

## Subscription: `create_test_suite_progress`

### Input

- `dataset_id: UUID` — local dataset to use as source
- `input: TestSuiteCreateInput` — contains `name`, `description`, `metric_ids`, `input_schema`

### Output (yielded)

`TestSuiteCreationProgress` with:
- `status: CreationStatus` — enum: CREATING, EMBEDDING, UPLOADING, COMPLETE, ERROR
- `message: str` — human-readable status message
- `progress: float` — 0.0 to 1.0
- `test_suite_id: UUID | None` — set once the test suite is created on remote

### Pipeline Steps

```
1. CREATING  (progress: 0.0)
   └── Call remote_client.create_test_suite(name, metric_ids, config, description)
   └── Yield: status=CREATING, message="Creating test suite...", progress=0.0

2. CREATING  (progress: 0.1)
   └── Test suite created, capture test_suite_id
   └── Yield: status=CREATING, message="Test suite created", progress=0.1, test_suite_id=id

3. EMBEDDING (progress: 0.1 → 0.6)
   └── Load all data entries from local DB: db.get_data_entries(conn, dataset_id=dataset_id, limit=999999)
   └── Split into batches of EMBED_BATCH_SIZE (default 100)
   └── For each batch:
       └── Call embed.embed_batch(batch_rows)
       └── Store embeddings in memory
       └── Yield: status=EMBEDDING, message=f"Embedding batch {i}/{total}", progress=0.1 + 0.5 * (i/total)

4. UPLOADING (progress: 0.6 → 1.0)
   └── Split embedded entries into upload batches of UPLOAD_BATCH_SIZE (default 50)
   └── For each batch:
       └── Build TestCaseWithLabelInput list (embedding + optional description)
       └── Call remote_client.add_test_cases(test_suite_id, test_cases)
       └── Yield: status=UPLOADING, message=f"Uploading batch {i}/{total}", progress=0.6 + 0.4 * (i/total)

5. COMPLETE   (progress: 1.0)
   └── Yield: status=COMPLETE, message="Test suite created successfully", progress=1.0, test_suite_id=id
```

### Error Handling

If any step fails:
```
└── Yield: status=ERROR, message=f"Error: {str(e)}", progress=current_progress, test_suite_id=id_if_available
└── Return (stop subscription)
```

## Configuration Constants

```python
EMBED_BATCH_SIZE = 100   # Rows per OpenAI embedding call
UPLOAD_BATCH_SIZE = 50   # Test cases per addTestCases mutation
```

These should be module-level constants in `graphql.py` or configurable via env vars.

## Test Plan

### `test_graphql.py` — `TestCreateTestSuiteProgress`

All tests mock `db`, `embed`, and the remote client.

| Test | Setup | Assertion |
|------|-------|-----------|
| `test_yields_creating_status` | Mock all deps | First yield has `status=CREATING` |
| `test_creates_test_suite_on_remote` | Mock remote client | `create_test_suite` called with correct args |
| `test_yields_embedding_progress` | 200 rows, batch=100 | Yields 2 EMBEDDING updates |
| `test_yields_uploading_progress` | 100 entries, upload batch=50 | Yields 2 UPLOADING updates |
| `test_yields_complete` | Mock all successful | Last yield has `status=COMPLETE, progress=1.0` |
| `test_yields_error_on_remote_failure` | Mock `create_test_suite` raises | Yields `status=ERROR` |
| `test_yields_error_on_embed_failure` | Mock `embed_batch` raises | Yields `status=ERROR` |
| `test_includes_test_suite_id` | Mock successful creation | All yields after creation include `test_suite_id` |

## Implementation Notes

- The subscription is an `AsyncGenerator` — use `yield` to emit progress
- Import `embed` and remote client inside the resolver to enable easy mocking
- The remote client needs an auth token — this should be passed via the GraphQL context or the `TestSuiteCreateInput` (TBD: how frontend passes auth token to SDK)
- Consider adding a `token` field to `TestSuiteCreateInput` or getting it from a header
```

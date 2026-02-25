
### `specs/f2-sdk-database.md`

```markdown
# F2: SDK Database CRUD

**Scope**: `sdk/pixie_sdk/db.py`
**Phase**: 1 (no dependencies)
**Tests**: `sdk/tests/test_db.py`

## Overview

Implement all stub database operations for local SQLite storage. The `get_db` and `create_dataset` functions are already implemented; implement the remaining 6 stubs.

## Functions to Implement

### `get_dataset(db, dataset_id) -> dict | None`

```sql
SELECT id, file_name, created_at, row_schema FROM datasets WHERE id = ?
```

Return a dict with keys `id` (UUID), `file_name` (str), `created_at` (str), `row_schema` (parsed JSON dict). Return `None` if not found.

### `list_datasets(db) -> list[dict]`

```sql
SELECT id, file_name, created_at, row_schema FROM datasets ORDER BY created_at DESC
```

Return list of dicts (same shape as `get_dataset`). Empty list if none.

### `create_data_entries(db, *, dataset_id, rows) -> list[UUID]`

For each row in `rows`:
1. Generate `uuid4()`
2. Store `(str(id), str(dataset_id), json.dumps(row))`

Use `executemany` for performance. Commit after all inserts. Return list of UUIDs.

### `get_data_entries(db, *, dataset_id, offset, limit) -> list[dict]`

```sql
SELECT id, dataset_id, data FROM data_entries
WHERE dataset_id = ? LIMIT ? OFFSET ?
```

Parse `data` from JSON string back to dict. Return list of dicts with keys `id`, `dataset_id`, `data`.

### `get_data_entry(db, entry_id) -> dict | None`

```sql
SELECT id, dataset_id, data FROM data_entries WHERE id = ?
```

Return dict or `None`.

### `count_data_entries(db, dataset_id) -> int`

```sql
SELECT COUNT(*) FROM data_entries WHERE dataset_id = ?
```

## Test Plan

Update test_db.py — replace `NotImplementedError` tests with real behavior tests.

### All tests use `tmp_path` fixture for isolated SQLite

| Test Class | Test | Setup | Assertion |
|------------|------|-------|-----------|
| `TestGetDataset` | `test_returns_created_dataset` | `create_dataset`, then `get_dataset` | All fields match |
| `TestGetDataset` | `test_returns_none_for_missing` | Empty DB | Returns `None` |
| `TestListDatasets` | `test_returns_all` | Create 3 datasets | Returns 3 items |
| `TestListDatasets` | `test_empty_db` | No creates | Returns `[]` |
| `TestListDatasets` | `test_ordered_by_created_at_desc` | Create 2 with delay | First item is newest |
| `TestCreateDataEntries` | `test_returns_uuids` | Create entries | Returns list of UUIDs matching row count |
| `TestCreateDataEntries` | `test_entries_retrievable` | Create then get | Data matches input rows |
| `TestGetDataEntries` | `test_pagination` | Create 10 entries | `offset=5, limit=3` returns 3 items |
| `TestGetDataEntries` | `test_filters_by_dataset` | 2 datasets with entries | Only returns entries for specified dataset |
| `TestGetDataEntry` | `test_returns_single` | Create entry, get by ID | Data matches |
| `TestGetDataEntry` | `test_returns_none` | Empty DB | Returns `None` |
| `TestCountDataEntries` | `test_counts` | Create 5 entries | Returns 5 |
| `TestCountDataEntries` | `test_zero_for_empty` | No entries | Returns 0 |

## Implementation Notes

- All functions receive an open `aiosqlite.Connection` — they do NOT manage connection lifecycle
- UUID values are stored as TEXT in SQLite; convert with `UUID(row["id"])` when reading
- `row_schema` is stored as JSON string; parse with `json.loads` when reading
- `data` field in `data_entries` is stored as JSON string; parse with `json.loads` when reading
- Use `await db.commit()` after writes
```

# F4: SDK GraphQL Queries

**Scope**: `sdk/pixie_sdk/graphql.py` — Query class resolvers
**Phase**: 2 (depends on F2)
**Tests**: `sdk/tests/test_graphql.py`

## Overview

Wire the 4 query resolvers in the SDK GraphQL schema to call the corresponding `db.py` functions and return Strawberry types.

## Resolvers to Implement

### `list_datasets(info) -> list[DatasetType]`

1. Get DB connection from `info.context["db"]`
2. Call `await db.list_datasets(conn)`
3. Convert each dict to `DatasetType`:
   - `id`: `UUID(d["id"])`
   - `file_name`: `d["file_name"]`
   - `created_at`: `datetime.fromisoformat(d["created_at"])`
   - `row_schema`: `d["row_schema"]` (already a dict, passes as JSON scalar)

### `get_dataset(info, id) -> DatasetType | None`

1. Call `await db.get_dataset(conn, id)`
2. Return `None` if not found, else convert to `DatasetType`

### `get_data_entries(info, dataset_id, offset, limit) -> list[DataEntryType]`

1. Call `await db.get_data_entries(conn, dataset_id=dataset_id, offset=offset, limit=limit)`
2. Convert each to `DataEntryType`

### `data_entry_count(info, dataset_id) -> int`

1. Call `await db.count_data_entries(conn, dataset_id)`
2. Return the integer directly

## Converter Helper

Create a module-level helper or keep inline:

```python
def _dataset_to_type(d: dict) -> DatasetType:
    return DatasetType(
        id=UUID(d["id"]) if isinstance(d["id"], str) else d["id"],
        file_name=d["file_name"],
        created_at=datetime.fromisoformat(d["created_at"]) if isinstance(d["created_at"], str) else d["created_at"],
        row_schema=d["row_schema"],
    )
```

## Test Plan

Update test_graphql.py — replace stub tests, add real behavior tests.

All tests mock `db` functions or use a real in-memory SQLite.

| Test | Setup | Assertion |
|------|-------|-----------|
| `test_list_datasets_empty` | Mock `db.list_datasets` → `[]` | Returns empty list |
| `test_list_datasets_returns_types` | Mock with 2 dataset dicts | Returns 2 `DatasetType` objects |
| `test_get_dataset_found` | Mock `db.get_dataset` → dict | Returns `DatasetType` with matching ID |
| `test_get_dataset_not_found` | Mock → `None` | Returns `None` |
| `test_get_data_entries` | Mock with 3 entries | Returns 3 `DataEntryType` objects |
| `test_data_entry_count` | Mock → `42` | Returns `42` |

## Implementation Notes

- The GraphQL context must include a `db` connection — this is set up in F3's context getter
- Resolver tests should mock `db` module functions with `@patch("pixie_sdk.graphql.db")`
- The `render_labeling_ui` query is handled separately in F5
```

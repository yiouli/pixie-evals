# F1: File Ingestion

**Scope**: `sdk/pixie_sdk/ingest.py`
**Phase**: 1 (no dependencies)
**Tests**: `sdk/tests/test_ingest.py`

## Overview

Implement two pure functions that load data files into row dicts and infer a JSON Schema from them. These are used by F3 (file upload) to process user-uploaded datasets.

## Functions to Implement

### `load_to_rows(path: str) -> list[dict[str, Any]]`

Load a data file from disk into a list of dicts. Must support:

| Format | Detection | Library |
|--------|-----------|---------|
| JSON array | MIME contains `json` OR extension `.json`, content starts with `[` | `json.loads` |
| JSONL | MIME contains `json` OR extension `.jsonl`, content does NOT start with `[` | `json.loads` line-by-line |
| CSV | Extension `.csv` | `polars.read_csv().to_dicts()` |
| Parquet | Extension `.parquet` | `polars.read_parquet().to_dicts()` |

**Error handling**:
- Raise `ValueError("Unsupported file format: {path}")` for unknown formats
- Raise `ValueError("Empty dataset")` if the file produces zero rows

**MIME detection**: Use `python-magic` via `magic.from_file(path, mime=True)`.

### `infer_schema(rows: list[dict[str, Any]]) -> dict[str, Any]`

Use the `genson` library to build a JSON Schema from all rows:

```python
from genson import SchemaBuilder
builder = SchemaBuilder()
for row in rows:
    builder.add_object(row)
return builder.to_schema()
```

**Edge cases**:
- Empty list → raise `ValueError("Cannot infer schema from empty data")`
- Single row → valid schema from one sample

## Test Plan

Update `sdk/tests/test_ingest.py` — replace `NotImplementedError` tests with real tests.

### `TestLoadToRows`

| Test | Setup | Assertion |
|------|-------|-----------|
| `test_loads_json_array` | Write `[{"a":1},{"a":2}]` to `tmp_path/data.json` | Returns 2 dicts with key `a` |
| `test_loads_jsonl` | Write two JSON lines to `tmp_path/data.jsonl` | Returns 2 dicts |
| `test_loads_csv` | Write CSV with header `a,b` + 2 rows to `tmp_path/data.csv` | Returns 2 dicts with keys `a`, `b` |
| `test_loads_parquet` | Use `polars.DataFrame({"a":[1,2]}).write_parquet(...)` | Returns 2 dicts |
| `test_raises_on_unsupported` | Create `tmp_path/data.xyz` | Raises `ValueError` |
| `test_raises_on_empty_json` | Write `[]` to `tmp_path/data.json` | Raises `ValueError` |

### `TestInferSchema`

| Test | Setup | Assertion |
|------|-------|-----------|
| `test_infers_string_fields` | `[{"name": "Alice"}]` | Schema has `properties.name.type == "string"` |
| `test_infers_mixed_types` | `[{"x": 1, "y": "hi"}]` | Schema has `integer` + `string` properties |
| `test_raises_on_empty` | `[]` | Raises `ValueError` |
| `test_multiple_rows_merge` | Rows with different keys | Schema includes all keys |

## Implementation Notes

- `load_to_rows` is synchronous — no `async` needed (file I/O is fast for expected sizes)
- Do NOT import `datasets` (HuggingFace) for now — the spec mentions it as a fallback but it adds a heavy dependency; raise `ValueError` for unsupported formats instead
```

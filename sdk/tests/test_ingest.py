"""Tests for pixie_sdk.ingest — file loading and schema inference."""

from __future__ import annotations

import json

import polars as pl
import pytest

from pixie_sdk.ingest import infer_schema, load_to_rows

# ============================================================================
# TestLoadToRows
# ============================================================================


class TestLoadToRows:
    """Test file loading into row dicts."""

    def test_loads_json_array(self, tmp_path):
        """load_to_rows loads a JSON array file into row dicts."""
        path = tmp_path / "data.json"
        path.write_text(json.dumps([{"a": 1}, {"a": 2}]))
        rows = load_to_rows(str(path))
        assert len(rows) == 2
        assert rows[0]["a"] == 1
        assert rows[1]["a"] == 2

    def test_loads_jsonl(self, tmp_path):
        """load_to_rows loads a JSONL file into row dicts."""
        path = tmp_path / "data.jsonl"
        path.write_text('{"a": 1}\n{"a": 2}\n')
        rows = load_to_rows(str(path))
        assert len(rows) == 2
        assert rows[0]["a"] == 1
        assert rows[1]["a"] == 2

    def test_loads_csv(self, tmp_path):
        """load_to_rows loads a CSV file into row dicts."""
        path = tmp_path / "data.csv"
        path.write_text("a,b\n1,x\n2,y\n")
        rows = load_to_rows(str(path))
        assert len(rows) == 2
        assert set(rows[0].keys()) == {"a", "b"}

    def test_loads_parquet(self, tmp_path):
        """load_to_rows loads a Parquet file into row dicts."""
        path = tmp_path / "data.parquet"
        pl.DataFrame({"a": [1, 2], "b": ["x", "y"]}).write_parquet(str(path))
        rows = load_to_rows(str(path))
        assert len(rows) == 2
        assert rows[0]["a"] == 1

    def test_raises_on_unsupported(self, tmp_path):
        """load_to_rows raises ValueError for unsupported formats."""
        path = tmp_path / "data.xyz"
        path.write_text("not a dataset")
        with pytest.raises(ValueError, match="Unsupported file format"):
            load_to_rows(str(path))

    def test_raises_on_empty_json(self, tmp_path):
        """load_to_rows raises ValueError for an empty JSON array."""
        path = tmp_path / "data.json"
        path.write_text("[]")
        with pytest.raises(ValueError, match="Empty dataset"):
            load_to_rows(str(path))


# ============================================================================
# TestInferSchema
# ============================================================================


class TestInferSchema:
    """Test JSON schema inference."""

    def test_infers_string_fields(self):
        """infer_schema identifies string fields."""
        schema = infer_schema([{"name": "Alice"}])
        assert "properties" in schema
        assert schema["properties"]["name"]["type"] == "string"

    def test_infers_mixed_types(self):
        """infer_schema handles integer and string properties."""
        schema = infer_schema([{"x": 1, "y": "hi"}])
        assert schema["properties"]["x"]["type"] == "integer"
        assert schema["properties"]["y"]["type"] == "string"

    def test_raises_on_empty(self):
        """infer_schema raises ValueError for empty list."""
        with pytest.raises(ValueError, match="Cannot infer schema from empty data"):
            infer_schema([])

    def test_multiple_rows_merge(self):
        """infer_schema merges keys from multiple rows."""
        schema = infer_schema([{"a": 1}, {"b": "two"}])
        assert "a" in schema["properties"]
        assert "b" in schema["properties"]

"""Tests for pixie_sdk.ingest — file loading and schema inference."""

from __future__ import annotations

import pytest

from pixie_sdk.ingest import load_to_rows, infer_schema


class TestLoadToRows:
    """Test file loading into row dicts."""

    def test_not_implemented(self):
        """load_to_rows should raise NotImplementedError (stub)."""
        with pytest.raises(NotImplementedError):
            load_to_rows("/tmp/nonexistent.json")


class TestInferSchema:
    """Test JSON schema inference."""

    def test_not_implemented(self, sample_rows):
        """infer_schema should raise NotImplementedError (stub)."""
        with pytest.raises(NotImplementedError):
            infer_schema(sample_rows)

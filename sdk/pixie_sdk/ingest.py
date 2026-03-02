"""File ingestion utilities for the Pixie SDK.

Loads various file formats (JSON, JSONL, CSV, Parquet) into a list
of dicts and infers a JSON schema from the data.
"""

from __future__ import annotations

import json
from typing import Any

import magic
import polars as pl
from genson import SchemaBuilder


def load_to_rows(path: str) -> list[dict[str, Any]]:
    """Load a data file into a list of row dicts.

    Supports JSON, JSONL, CSV, and Parquet formats.

    Args:
        path: Path to the data file.

    Returns:
        List of dicts, one per row.

    Raises:
        ValueError: If the file format is unsupported or the dataset is empty.
    """
    mime = magic.from_file(path, mime=True)
    rows: list[dict[str, Any]]

    if "json" in mime or path.endswith((".json", ".jsonl")):
        with open(path) as f:
            content = f.read().strip()
            if content.startswith("["):
                rows = json.loads(content)
            else:  # JSONL
                rows = [json.loads(line) for line in content.splitlines() if line]

    elif path.endswith(".csv"):
        rows = pl.read_csv(path).to_dicts()

    elif path.endswith(".parquet"):
        rows = pl.read_parquet(path).to_dicts()

    else:
        raise ValueError(f"Unsupported file format: {path}")

    if not rows:
        raise ValueError("Empty dataset")

    return rows


def infer_schema(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Infer a JSON Schema from a list of row dicts.

    Uses the genson library to build a schema by observing all rows.

    Args:
        rows: List of dicts to infer the schema from.

    Returns:
        A JSON Schema dict describing the row structure.

    Raises:
        ValueError: If the rows list is empty.
    """
    if not rows:
        raise ValueError("Cannot infer schema from empty data")

    builder = SchemaBuilder()
    for row in rows:
        builder.add_object(row)
    return dict(builder.to_schema())

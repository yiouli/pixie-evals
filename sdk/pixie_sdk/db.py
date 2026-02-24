"""SQLite database operations for the Pixie SDK.

Manages local storage of datasets and data entries using aiosqlite.
Raw test case data never leaves the user's local machine.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

import aiosqlite

# Default database path — can be overridden via environment variable
DEFAULT_DB_PATH = Path("pixie_sdk.db")

# ============================================================================
# Schema
# ============================================================================

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS datasets (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    row_schema TEXT NOT NULL  -- JSON schema inferred from the data
);

CREATE TABLE IF NOT EXISTS data_entries (
    id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL,
    data TEXT NOT NULL,  -- JSON object for one row
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);
"""


async def get_db(db_path: Path | str = DEFAULT_DB_PATH) -> aiosqlite.Connection:
    """Open (or create) the SQLite database and ensure the schema exists.

    Args:
        db_path: Path to the SQLite database file.

    Returns:
        An open aiosqlite connection.
    """
    db = await aiosqlite.connect(str(db_path))
    db.row_factory = aiosqlite.Row
    await db.executescript(SCHEMA_SQL)
    return db


# ============================================================================
# Dataset Operations
# ============================================================================


async def create_dataset(
    db: aiosqlite.Connection,
    *,
    file_name: str,
    row_schema: dict[str, Any],
) -> UUID:
    """Create a new dataset record.

    Args:
        db: Database connection.
        file_name: Original file name of the uploaded data.
        row_schema: JSON Schema inferred from the data rows.

    Returns:
        The UUID of the newly created dataset.
    """
    dataset_id = uuid4()
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "INSERT INTO datasets (id, file_name, created_at, row_schema) VALUES (?, ?, ?, ?)",
        (str(dataset_id), file_name, now, json.dumps(row_schema)),
    )
    await db.commit()
    return dataset_id


async def get_dataset(
    db: aiosqlite.Connection,
    dataset_id: UUID,
) -> dict[str, Any] | None:
    """Get a dataset by ID.

    Args:
        db: Database connection.
        dataset_id: UUID of the dataset.

    Returns:
        Dataset dict with id, file_name, created_at, row_schema, or None.
    """
    cursor = await db.execute(
        "SELECT id, file_name, created_at, row_schema FROM datasets WHERE id = ?",
        (str(dataset_id),),
    )
    row = await cursor.fetchone()
    if not row:
        return None
    return {
        "id": row["id"],
        "file_name": row["file_name"],
        "created_at": row["created_at"],
        "row_schema": json.loads(row["row_schema"]),
    }


async def list_datasets(db: aiosqlite.Connection) -> list[dict[str, Any]]:
    """List all datasets.

    Args:
        db: Database connection.

    Returns:
        List of dataset dicts.
    """
    cursor = await db.execute(
        "SELECT id, file_name, created_at, row_schema FROM datasets ORDER BY created_at DESC"
    )
    rows = await cursor.fetchall()
    return [
        {
            "id": row["id"],
            "file_name": row["file_name"],
            "created_at": row["created_at"],
            "row_schema": json.loads(row["row_schema"]),
        }
        for row in rows
    ]


# ============================================================================
# Data Entry Operations
# ============================================================================


async def create_data_entries(
    db: aiosqlite.Connection,
    *,
    dataset_id: UUID,
    rows: list[dict[str, Any]],
) -> list[UUID]:
    """Insert multiple data entry rows for a dataset.

    Each row is assigned a UUID and stored as JSON.

    Args:
        db: Database connection.
        dataset_id: UUID of the parent dataset.
        rows: List of dicts representing individual data rows.

    Returns:
        List of UUIDs for the created entries.
    """
    entry_ids = [uuid4() for _ in rows]
    entries = [
        (str(entry_id), str(dataset_id), json.dumps(row))
        for entry_id, row in zip(entry_ids, rows)
    ]
    await db.executemany(
        "INSERT INTO data_entries (id, dataset_id, data) VALUES (?, ?, ?)",
        entries,
    )
    await db.commit()
    return entry_ids


async def get_data_entries(
    db: aiosqlite.Connection,
    *,
    dataset_id: UUID,
    offset: int = 0,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Retrieve data entries for a dataset with pagination.

    Args:
        db: Database connection.
        dataset_id: UUID of the parent dataset.
        offset: Number of entries to skip.
        limit: Maximum number of entries to return.

    Returns:
        List of data entry dicts with id, dataset_id, and data.
    """
    cursor = await db.execute(
        "SELECT id, dataset_id, data FROM data_entries WHERE dataset_id = ? LIMIT ? OFFSET ?",
        (str(dataset_id), limit, offset),
    )
    rows = await cursor.fetchall()
    return [
        {
            "id": row["id"],
            "dataset_id": row["dataset_id"],
            "data": json.loads(row["data"]),
        }
        for row in rows
    ]


async def get_data_entry(
    db: aiosqlite.Connection,
    entry_id: UUID,
) -> dict[str, Any] | None:
    """Get a single data entry by ID.

    Args:
        db: Database connection.
        entry_id: UUID of the data entry.

    Returns:
        Data entry dict or None.
    """
    cursor = await db.execute(
        "SELECT id, dataset_id, data FROM data_entries WHERE id = ?",
        (str(entry_id),),
    )
    row = await cursor.fetchone()
    if not row:
        return None
    return {
        "id": row["id"],
        "dataset_id": row["dataset_id"],
        "data": json.loads(row["data"]),
    }


async def count_data_entries(
    db: aiosqlite.Connection,
    dataset_id: UUID,
) -> int:
    """Count the number of data entries for a dataset.

    Args:
        db: Database connection.
        dataset_id: UUID of the parent dataset.

    Returns:
        Number of entries.
    """
    cursor = await db.execute(
        "SELECT COUNT(*) as count FROM data_entries WHERE dataset_id = ?",
        (str(dataset_id),),
    )
    row = await cursor.fetchone()
    return row["count"] if row else 0

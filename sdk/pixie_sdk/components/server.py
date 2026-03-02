"""FastAPI routes for the custom labeling UI component system.

Provides routes to:
- List all registered component slot names.
- Load raw input objects from the local SQLite database.

The labeling HTML serving has been moved to the GraphQL query
``getLabelingHtml`` in ``graphql.py``.

Mount this router on the main FastAPI app::

    from pixie_sdk.components.server import router as components_router
    app.include_router(components_router)

See Also:
    ``registry`` — stores component metadata.
    ``db.get_data_entry`` — fetches a data entry from local SQLite.
    ``graphql.Query.get_labeling_html`` — serves labeling pages via GraphQL.
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException

from pixie_sdk import db
from pixie_sdk.components.registry import (
    list_slots,
)
from pixie_sdk.components.scanner import rescan_components

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# Component List Route
# ============================================================================


@router.get("/api/components")
async def list_components() -> dict[str, list[str]]:
    """List all registered labeling component slot names.

    Re-scans the components directory before returning to ensure
    freshly added files are discovered.

    Returns:
        JSON object with a ``slots`` key containing the sorted list.
    """
    rescan_components()
    return {"slots": list_slots()}


# ============================================================================
# Input Object Route
# ============================================================================


@router.get("/api/inputs/{input_id}")
async def get_input(input_id: str) -> dict:
    """Load an input object (data entry) by ID from the local SQLite database.

    The *input_id* may be either a **local** data-entry UUID or a
    **remote** test-case UUID.  The endpoint first checks the
    ``test_case_map`` table to resolve remote IDs to local ones,
    then falls back to a direct lookup.

    Args:
        input_id: UUID string — remote test case ID or local data entry ID.

    Returns:
        The data entry's ``data`` dict with an added ``id`` key.

    Raises:
        HTTPException: 404 if no data entry exists with the given ID.
    """
    return await _load_input(input_id)


# ============================================================================
# Helpers
# ============================================================================


async def _load_input(input_id: str) -> dict:
    """Fetch an input object from SQLite, resolving remote IDs if needed.

    Args:
        input_id: UUID string — remote test case ID or local data entry ID.

    Returns:
        The data entry's ``data`` dict with an added ``id`` key.

    Raises:
        HTTPException: 404 if no data entry exists with the given ID.
    """
    conn = await db.get_db()
    try:
        # Try to resolve a remote test case ID to a local data entry ID.
        local_id = await db.get_local_entry_id(conn, input_id)
        lookup_id = UUID(local_id) if local_id else UUID(input_id)

        entry = await db.get_data_entry(conn, lookup_id)
    finally:
        await conn.close()

    if entry is None:
        raise HTTPException(
            status_code=404,
            detail=f"Data entry '{input_id}' not found",
        )

    result: dict = entry["data"]
    result["id"] = entry["id"]
    return result

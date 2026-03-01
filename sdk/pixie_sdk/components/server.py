"""FastAPI routes for the custom labeling UI component system.

Provides routes to:
- Serve a labeling HTML page with the input data injected.
- List all registered component slot names.
- Load raw input objects from the local SQLite database.

The key mechanism: each user-authored ``.html`` file contains a
``<script pixie-evals-labeling-input>`` placeholder block.  When the
page is requested, the framework reads the HTML, fetches the input object
from SQLite, and replaces the placeholder block with::

    <script pixie-evals-labeling-input>
    window.INPUT = { ...data... };
    </script>

Mount this router on the main FastAPI app::

    from pixie_sdk.components.server import router as components_router
    app.include_router(components_router)

See Also:
    ``registry`` — stores component metadata.
    ``db.get_data_entry`` — fetches a data entry from local SQLite.
"""

from __future__ import annotations

import json
import re
from uuid import UUID

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

from pixie_sdk import db
from pixie_sdk.components import PLACEHOLDER_ATTR
from pixie_sdk.components.registry import get_component, list_slots

router = APIRouter()


# ============================================================================
# Component List Route
# ============================================================================


@router.get("/api/components")
async def list_components() -> dict[str, list[str]]:
    """List all registered labeling component slot names.

    Returns:
        JSON object with a ``slots`` key containing the sorted list.
    """
    return {"slots": list_slots()}


# ============================================================================
# Labeling Page Route
# ============================================================================


@router.get("/labeling/{component_name}")
async def labeling_page(component_name: str, id: str) -> HTMLResponse:
    """Serve a labeling HTML page with input data injected.

    Reads the registered ``.html`` file, fetches the input object from
    the local SQLite database, and replaces the
    ``<script pixie-evals-labeling-input></script>`` placeholder with a
    ``<script>`` block that sets ``const INPUT = { ... };``.

    Args:
        component_name: The component slot name (filename stem).
        id: The input object ID (data entry UUID or remote test case UUID).

    Returns:
        The HTML page with the input data injected.

    Raises:
        HTTPException: 404 if no component is registered or input not found.
    """
    component = get_component(component_name)
    if component is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No labeling page registered for '{component_name}'. "
                f"Available: {list_slots()}"
            ),
        )

    # Read the user's HTML file.
    html = component.src_path.read_text(encoding="utf-8")

    # Fetch the input object from the local database.
    input_data = await _load_input(id)

    # Replace the placeholder <script pixie-evals-labeling-input>…</script>
    # block with the actual data assignment.
    pattern = rf"<script\s+{re.escape(PLACEHOLDER_ATTR)}>[^<]*</script>"
    injection = (
        f"<script {PLACEHOLDER_ATTR}>\n"
        f"window.INPUT={json.dumps(input_data)};\n"
        f"</script>"
    )
    html = re.sub(pattern, injection, html, flags=re.DOTALL)

    return HTMLResponse(content=html)


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

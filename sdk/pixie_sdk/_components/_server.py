"""FastAPI routes for the custom labeling UI component system.

Provides routes to:
- Serve the HTML shell page for a labeling component.
- Serve the transpiled ESM bundle for a component.
- List all registered component slot names.
- Load input objects from the local SQLite database.

Mount this router on the main FastAPI app::

    from pixie_sdk._components._server import router as components_router
    app.include_router(components_router)

See Also:
    ``_shell.render_shell`` — generates the HTML page content.
    ``_registry`` — stores component metadata and bundle paths.
    ``db.get_data_entry`` — fetches a data entry from local SQLite.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, HTMLResponse

from pixie_sdk import db
from pixie_sdk._components._registry import get_component, list_slots
from pixie_sdk._components._shell import render_shell

router = APIRouter()


# ============================================================================
# Component Bundle Routes
# ============================================================================


@router.get("/api/components/{slot}.js")
async def serve_component(slot: str) -> FileResponse:
    """Serve the transpiled ESM bundle for a registered component.

    Args:
        slot: The component slot name (filename stem).

    Returns:
        The ``.js`` bundle file with ``Cache-Control: no-cache``.

    Raises:
        HTTPException: 404 if no component is registered for *slot*.
    """
    component = get_component(slot)
    if component is None:
        raise HTTPException(
            status_code=404,
            detail=f"No component registered for slot '{slot}'",
        )
    return FileResponse(
        component.bundle_path,
        media_type="application/javascript",
        headers={"Cache-Control": "no-cache"},
    )


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
    """Serve the standalone HTML labeling page for a component.

    The page loads the component's ESM bundle and the input object
    dynamically in the browser.

    Args:
        component_name: The component slot name.
        id: The input object ID (passed to the shell as a JS constant).

    Returns:
        Self-contained HTML page.

    Raises:
        HTTPException: 404 if no component is registered for *component_name*.
    """
    component = get_component(component_name)
    if component is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No component registered for '{component_name}'. "
                f"Available: {list_slots()}"
            ),
        )
    return HTMLResponse(
        content=render_shell(component_name=component_name, input_id=id)
    )


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

    The stored ``data`` JSON is returned directly — the shell page
    spreads these keys as props into the labeling component.

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

    # The `data` field is the parsed JSON object (a dict).
    # Include the entry id so the component can reference it.
    result: dict = entry["data"]
    result["id"] = entry["id"]
    return result

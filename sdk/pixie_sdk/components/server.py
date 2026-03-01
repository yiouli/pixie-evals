"""FastAPI routes for the custom labeling UI component system.

Provides routes to:
- Serve a labeling HTML page with the input data injected.
- List all registered component slot names.
- Load raw input objects from the local SQLite database.

The labeling endpoint accepts a **remote test case UUID** and resolves
everything from it: the test suite (via the remote pixie-server), the
correct HTML template (via the test suite name → slot), and the input
data (via the local SQLite ``test_case_map``).

Authentication is via the standard ``Authorization: Bearer <token>``
header, which is forwarded to the remote pixie-server.

Mount this router on the main FastAPI app::

    from pixie_sdk.components.server import router as components_router
    app.include_router(components_router)

See Also:
    ``registry`` — stores component metadata.
    ``db.get_data_entry`` — fetches a data entry from local SQLite.
"""

from __future__ import annotations

import json
import logging
import re
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import HTMLResponse

from pixie_sdk import db
from pixie_sdk.components import PLACEHOLDER_ATTR
from pixie_sdk.components.registry import (
    get_component,
    list_slots,
)
from pixie_sdk.components.scaffold import to_snake_case
from pixie_sdk.remote_client import RemoteClient

logger = logging.getLogger(__name__)

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


@router.get("/labeling/{test_case_id}")
async def labeling_page(
    test_case_id: str,
    authorization: str | None = Header(None),
) -> HTMLResponse:
    """Serve a labeling HTML page for a remote test case.

    The *test_case_id* is a remote test case UUID.  The server:

    1. Authenticates via the ``Authorization: Bearer <token>`` header.
    2. Queries the remote pixie-server for the test case's test suite.
    3. Resolves the test suite name to a local labeling HTML file.
    4. Fetches the input data from local SQLite (via ``test_case_map``).
    5. Injects the data into the HTML and returns it.

    Args:
        test_case_id: Remote test case UUID.
        authorization: ``Authorization: Bearer <token>`` header.

    Returns:
        The HTML page with the input data injected.

    Raises:
        HTTPException: 401 if no valid auth header.
        HTTPException: 404 if test case, suite, labeling page, or data
            not found.
    """
    # --- Auth ---
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization: Bearer <token> header required",
        )
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authorization: Bearer <token> header required",
        )

    # --- Validate UUID ---
    try:
        tc_uuid = UUID(test_case_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid test case ID: '{test_case_id}'",
        )

    # --- Resolve test case → test suite → labeling page ---
    client = RemoteClient(auth_token=token)

    test_case = await client.get_test_case(tc_uuid)
    if test_case is None:
        raise HTTPException(
            status_code=404,
            detail=f"Test case '{test_case_id}' not found on remote server",
        )

    suite_id = test_case.get("testSuite")
    if not suite_id:
        raise HTTPException(
            status_code=404,
            detail=f"Test case '{test_case_id}' has no test suite",
        )

    suite = await client.get_test_suite(UUID(str(suite_id)))
    if suite is None:
        raise HTTPException(
            status_code=404,
            detail=f"Test suite '{suite_id}' not found on remote server",
        )

    suite_name: str = suite.get("name", "")
    slot = to_snake_case(suite_name) if suite_name else ""
    component = get_component(slot) if slot else None
    if component is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No labeling page registered for test suite "
                f"'{suite_name}' (slot: '{slot}'). "
                f"Available: {list_slots()}"
            ),
        )

    # --- Read HTML ---
    html = component.src_path.read_text(encoding="utf-8")

    # --- Load input data from local SQLite ---
    input_data = await _load_input(test_case_id)

    # --- Inject data into HTML ---
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

"""FastAPI server for the Pixie SDK.

Serves the local Strawberry GraphQL API for dataset management,
Jinja2-rendered labeling UIs, and proxies to the remote pixie-server.
The server runs on the user's local machine — raw data never leaves.
"""

from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import UUID

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from jinja2 import Environment, FileSystemLoader
from strawberry.fastapi import GraphQLRouter

from pixie_sdk import db
from pixie_sdk.graphql import schema

# ============================================================================
# Configuration
# ============================================================================

SDK_PORT = int(os.environ.get("PIXIE_SDK_PORT", "8100"))
TEMPLATES_DIR = Path(__file__).parent / "templates"
STATIC_DIR = Path(__file__).parent / "dist"

_jinja_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=True,
)


# ============================================================================
# Context
# ============================================================================


async def get_context() -> dict:
    """Provide a DB connection to all GraphQL resolvers."""
    conn = await db.get_db()
    return {"db": conn}


# ============================================================================
# Lifespan
# ============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler — initialise DB on startup."""
    conn = await db.get_db()
    await conn.close()
    yield


# ============================================================================
# App
# ============================================================================

app = FastAPI(
    title="Pixie SDK Server",
    description="Local server for the Pixie AI Evals SDK",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Strawberry GraphQL with multipart upload support
graphql_app = GraphQLRouter(
    schema,
    context_getter=get_context,  # type: ignore[arg-type]
    multipart_uploads_enabled=True,
)
app.include_router(graphql_app, prefix="/graphql")


# ============================================================================
# REST Endpoints
# ============================================================================


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/labeling-ui/{entry_id}", response_class=HTMLResponse)
async def labeling_ui(entry_id: str, template: str | None = None) -> str:
    """Render the labeling UI for a data entry as HTML.

    Used by the frontend to display in an iframe.

    Args:
        entry_id: UUID of the data entry.
        template: Optional template name override.

    Returns:
        Rendered HTML string.

    Raises:
        HTTPException: 404 if entry not found.
    """
    conn = await db.get_db()
    entry = await db.get_data_entry(conn, UUID(entry_id))
    await conn.close()

    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    tpl_name = template or "default.html"

    try:
        tmpl = _jinja_env.get_template(tpl_name)
        return tmpl.render(entry_id=entry_id, data=entry["data"])
    except Exception:
        data_json = json.dumps(entry["data"], indent=2)
        return f"<html><body><pre>{data_json}</pre></body></html>"


# ============================================================================
# SPA Static Files
# ============================================================================

# Mount the frontend SPA at '/' — must come LAST so API routes take priority.
# StaticFiles with html=True serves index.html for any unmatched path (SPA routing).
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="spa")


# ============================================================================
# Entry Point
# ============================================================================


def main() -> None:
    """Run the SDK server with uvicorn."""
    import uvicorn

    uvicorn.run(
        "pixie_sdk.server:app",
        host="0.0.0.0",
        port=SDK_PORT,
        reload=True,
    )


if __name__ == "__main__":
    main()

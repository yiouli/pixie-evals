"""FastAPI server for the Pixie SDK.

Serves the local Strawberry GraphQL API for dataset management,
a REST endpoint for file uploads, and Jinja2-rendered labeling UIs.
The server runs on the user's local machine — raw data never leaves.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from strawberry.fastapi import GraphQLRouter

from pixie_sdk.graphql import schema

# ============================================================================
# Configuration
# ============================================================================

SDK_PORT = int(os.environ.get("PIXIE_SDK_PORT", "8100"))
TEMPLATES_DIR = Path(__file__).parent / "templates"


# ============================================================================
# Lifespan
# ============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler — initialise DB on startup."""
    # Startup: ensure SQLite schema exists
    from pixie_sdk.db import get_db

    db = await get_db()
    await db.close()
    yield
    # Shutdown: cleanup if needed


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

# Mount Strawberry GraphQL (queries, mutations, subscriptions)
graphql_app = GraphQLRouter(schema)
app.include_router(graphql_app, prefix="/graphql")


# ============================================================================
# REST Endpoints
# ============================================================================


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/upload")
async def upload_file(file: UploadFile) -> dict[str, str]:
    """Upload a data file for ingestion.

    Saves the uploaded file to a temp directory and returns the
    temp path so the GraphQL mutation can ingest it.

    Args:
        file: The uploaded file.

    Returns:
        Dict with ``file_name`` and ``file_path``.
    """
    import tempfile
    from pathlib import Path

    temp_dir = Path(tempfile.gettempdir()) / "pixie_uploads"
    temp_dir.mkdir(exist_ok=True)

    file_path = temp_dir / (file.filename or "uploaded_file")
    content = await file.read()

    with open(file_path, "wb") as f:
        f.write(content)

    return {"file_name": file.filename or "uploaded_file", "file_path": str(file_path)}


@app.get("/labeling-ui/{entry_id}", response_class=HTMLResponse)
async def labeling_ui(entry_id: str, template: str | None = None) -> str:
    """Render the labeling UI for a data entry as HTML.

    Used by the frontend to display in an iframe.

    Args:
        entry_id: UUID of the data entry.
        template: Optional template name override.

    Returns:
        Rendered HTML string.
    """
    from uuid import UUID
    from jinja2 import Environment, FileSystemLoader

    from pixie_sdk.db import get_db, get_data_entry

    db = await get_db()
    entry = await get_data_entry(db, UUID(entry_id))
    await db.close()

    if not entry:
        return "<html><body><h1>Entry not found</h1></body></html>"

    env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))
    template_name = template or "default.html"

    try:
        tmpl = env.get_template(template_name)
        return tmpl.render(entry=entry)
    except Exception:
        # Fallback to a simple JSON display
        import json

        data_json = json.dumps(entry["data"], indent=2)
        return f"<html><body><pre>{data_json}</pre></body></html>"


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

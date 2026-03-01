"""FastAPI server for the Pixie SDK.

Serves the local Strawberry GraphQL API for dataset management,
custom TSX labeling components (bundled with esbuild), and proxies
to the remote pixie-server.  The server runs on the user's local
machine — raw data never leaves.

See Also:
    ``_components`` — the custom labeling UI component system.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from strawberry.fastapi import GraphQLRouter

from pixie_sdk import db
from pixie_sdk._components import get_components_dir
from pixie_sdk._components._scanner import scan_and_register
from pixie_sdk._components._server import router as components_router
from pixie_sdk.graphql import schema

# ============================================================================
# Configuration
# ============================================================================

SDK_PORT = int(os.environ.get("PIXIE_SDK_PORT", "8100"))
STATIC_DIR = Path(__file__).parent / "dist"
VENDOR_DIR = Path(__file__).parent / "static" / "vendor"


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
    """Application lifespan handler — initialise DB and scan components."""
    conn = await db.get_db()
    await conn.close()

    # Scan and bundle user labeling components.
    components_dir = get_components_dir()
    resolved = (
        components_dir if components_dir.is_absolute() else Path.cwd() / components_dir
    )
    print(f"[pixie-sdk] Scanning {resolved} for labeling components...")
    scan_and_register(resolved)

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

# Custom labeling UI component routes.
app.include_router(components_router)

# Vendored React ESM files for the labeling shell import-map.
if VENDOR_DIR.exists():
    app.mount("/vendor", StaticFiles(directory=VENDOR_DIR), name="vendor")


# ============================================================================
# REST Endpoints
# ============================================================================


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


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

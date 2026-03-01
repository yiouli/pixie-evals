"""Public API for the custom labeling UI component system.

Users place ``.tsx`` files in a ``labeling/`` folder (configurable).
At ``serve()`` time the framework discovers, bundles, and serves each
component as a standalone labeling page.

Usage::

    import pixie_sdk
    from pixie_sdk._components import set_components_dir

    # Optional — default is "./labeling"
    set_components_dir("./ui/labeling")

See Also:
    ``_scanner.scan_and_register`` — called during server startup.
    ``_server`` — FastAPI routes for serving bundles and pages.
    ``_registry`` — in-memory component store.
"""

from __future__ import annotations

from pathlib import Path

# ============================================================================
# Module State
# ============================================================================

#: Default components directory, relative to CWD at ``serve()`` time.
_components_dir: Path = Path("labeling")


# ============================================================================
# Public Interface
# ============================================================================


def set_components_dir(path: str | Path) -> None:
    """Override the default components folder.

    Call before ``serve()`` if your folder is not named ``labeling``.

    Args:
        path: Path to the folder containing ``.tsx`` labeling components.
              May be relative (resolved against CWD at ``serve()`` time)
              or absolute.

    Example::

        set_components_dir("./my_ui_components")
    """
    global _components_dir
    _components_dir = Path(path)


def get_components_dir() -> Path:
    """Return the currently configured components directory.

    Returns:
        The ``Path`` set via ``set_components_dir()`` or the default.
    """
    return _components_dir

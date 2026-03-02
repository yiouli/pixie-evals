"""Public API for the custom labeling UI component system.

Users place ``.html`` files in a ``labeling/`` folder (configurable).
At ``serve()`` time the framework discovers and registers each HTML file.
When a labeling page is requested, the framework reads the HTML, replaces
the ``<script pixie-evals-labeling-input>`` placeholder block with the
actual input data, and serves the result.

Usage::

    from pixie_sdk.components import set_components_dir

    # Optional — default is "./labeling"
    set_components_dir("./ui/labeling")

See Also:
    ``scanner.scan_and_register`` — called during server startup.
    ``server`` — FastAPI routes for serving labeling pages.
    ``registry`` — in-memory component store.
"""

from __future__ import annotations

from pathlib import Path

# ============================================================================
# Module State
# ============================================================================

#: Default components directory, relative to CWD at ``serve()`` time.
_components_dir: Path = Path("labeling")

#: The attribute name on the ``<script>`` placeholder block.
#: At serve time the entire ``<script pixie-evals-labeling-input>…</script>``
#: block is replaced with the actual input data assignment.
PLACEHOLDER_ATTR = "pixie-evals-labeling-input"


# ============================================================================
# Public Interface
# ============================================================================


def set_components_dir(path: str | Path) -> None:
    """Override the default components folder.

    Call before ``serve()`` if your folder is not named ``labeling``.

    Args:
        path: Path to the folder containing ``.html`` labeling components.
              May be relative (resolved against CWD at ``serve()`` time)
              or absolute.

    Example::

        set_components_dir("./my_labeling_pages")
    """
    global _components_dir
    _components_dir = Path(path)


def get_components_dir() -> Path:
    """Return the currently configured components directory.

    Returns:
        The ``Path`` set via ``set_components_dir()`` or the default.
    """
    return _components_dir

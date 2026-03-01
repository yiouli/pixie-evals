"""Walk the components folder and register each ``.html`` file.

Called during ``serve()`` startup and refreshed on demand to pick up
new or changed files without restarting the server.

See Also:
    ``registry`` — stores the resulting ``RegisteredComponent`` entries.
"""

from __future__ import annotations

from pathlib import Path

from pixie_sdk.components.registry import RegisteredComponent, clear, set_component


def scan_and_register(components_dir: Path) -> list[str]:
    """Discover all ``.html`` files in *components_dir* and register them.

    Only direct children are scanned (non-recursive).  Each ``.html``
    file is registered with its filename stem as the slot name.

    Args:
        components_dir: Absolute path to the folder containing user
            ``.html`` labeling pages.

    Returns:
        Sorted list of slot names that were successfully registered.
    """
    if not components_dir.exists():
        print(
            f"[pixie-sdk] Components folder not found: {components_dir}. "
            "No labeling components loaded."
        )
        return []

    html_files = sorted(components_dir.glob("*.html"))

    if not html_files:
        print(f"[pixie-sdk] No .html files found in {components_dir}.")
        return []

    registered: list[str] = []
    for html_file in html_files:
        slot = html_file.stem
        set_component(
            slot,
            RegisteredComponent(
                slot=slot,
                src_path=html_file.resolve(),
            ),
        )
        registered.append(slot)
        print(f"[pixie-sdk] ✓ {slot}")

    print(f"[pixie-sdk] {len(registered)} labeling page(s) ready.")
    return registered


def rescan_components() -> list[str]:
    """Re-scan the configured components directory.

    Clears the existing registry and re-discovers all ``.html`` files.
    Called automatically before serving a labeling page so that files
    added or removed after server startup are picked up immediately.

    Returns:
        Sorted list of slot names that were successfully registered.
    """
    from pixie_sdk.components import get_components_dir

    components_dir = get_components_dir()
    resolved = (
        components_dir if components_dir.is_absolute() else Path.cwd() / components_dir
    )
    clear()
    return scan_and_register(resolved)

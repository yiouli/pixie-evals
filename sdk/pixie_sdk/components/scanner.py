"""Walk the components folder and register each ``.html`` file.

Called once inside ``serve()`` before the server accepts connections.
Not called at import time — nothing happens until the user starts the server.

See Also:
    ``registry`` — stores the resulting ``RegisteredComponent`` entries.
"""

from __future__ import annotations

from pathlib import Path

from pixie_sdk.components.registry import RegisteredComponent, set_component


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

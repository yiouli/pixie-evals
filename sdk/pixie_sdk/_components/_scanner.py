"""Walk the components folder, bundle each ``.tsx`` file, and populate the registry.

Called once inside ``serve()`` before the server accepts connections.
Not called at import time — nothing happens until the user starts the server.

See Also:
    ``_bundler.bundle_component`` — transpiles a single ``.tsx`` file.
    ``_registry`` — stores the resulting ``RegisteredComponent`` entries.
"""

from __future__ import annotations

from pathlib import Path

from pixie_sdk._components._bundler import ComponentBundleError, bundle_component
from pixie_sdk._components._registry import RegisteredComponent, set_component


def scan_and_register(components_dir: Path) -> list[str]:
    """Discover all ``.tsx`` files in *components_dir* and bundle them.

    Only direct children are scanned (non-recursive).  Each successfully
    bundled file is registered via ``set_component()``.  Files that fail
    to bundle emit a warning but do **not** raise — the remaining files
    are still processed.

    Args:
        components_dir: Absolute path to the folder containing user
            ``.tsx`` labeling components.

    Returns:
        Sorted list of slot names that were successfully registered.
    """
    if not components_dir.exists():
        print(
            f"[pixie-sdk] Components folder not found: {components_dir}. "
            "No labeling components loaded."
        )
        return []

    tsx_files = sorted(components_dir.glob("*.tsx"))

    if not tsx_files:
        print(f"[pixie-sdk] No .tsx files found in {components_dir}.")
        return []

    registered: list[str] = []
    for tsx_file in tsx_files:
        slot = tsx_file.stem  # "trace_comparison.tsx" → "trace_comparison"
        try:
            bundle_path = bundle_component(tsx_file, slot)
            set_component(
                slot,
                RegisteredComponent(
                    slot=slot,
                    src_path=tsx_file.resolve(),
                    bundle_path=bundle_path,
                ),
            )
            registered.append(slot)
            print(f"[pixie-sdk] ✓ {slot}")
        except ComponentBundleError as e:
            print(f"[pixie-sdk] ✗ {slot} (bundle failed)")
            print(str(e))

    print(f"[pixie-sdk] {len(registered)}/{len(tsx_files)} components ready.")
    return registered

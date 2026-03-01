"""Central in-memory store mapping component names to their source and bundle paths.

The registry is rebuilt each process run — no persistence needed.
Components are registered during ``scan_and_register()`` at server startup.

See Also:
    ``_scanner.scan_and_register`` — populates this registry.
    ``_server`` — reads from this registry to serve bundles and pages.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

# ============================================================================
# Data Model
# ============================================================================


@dataclass
class RegisteredComponent:
    """A labeling component discovered, bundled, and ready to serve.

    Attributes:
        slot: The component identifier derived from the filename
              (e.g. ``"trace_comparison"``).
        src_path: Absolute path to the original user ``.tsx`` file.
        bundle_path: Absolute path to the transpiled ESM ``.js`` bundle
                     in the ephemeral temp directory.
    """

    slot: str
    src_path: Path
    bundle_path: Path


# ============================================================================
# Registry State
# ============================================================================

_registry: dict[str, RegisteredComponent] = {}


# ============================================================================
# Public Interface
# ============================================================================


def get_component(slot: str) -> RegisteredComponent | None:
    """Look up a registered component by slot name.

    Args:
        slot: Component identifier (e.g. ``"trace_comparison"``).

    Returns:
        The ``RegisteredComponent`` if found, otherwise ``None``.
    """
    return _registry.get(slot)


def set_component(slot: str, component: RegisteredComponent) -> None:
    """Register (or overwrite) a component in the registry.

    Args:
        slot: Component identifier.
        component: The ``RegisteredComponent`` to store.
    """
    _registry[slot] = component


def list_slots() -> list[str]:
    """Return a sorted list of all registered component slot names.

    Returns:
        Sorted list of slot strings.
    """
    return sorted(_registry.keys())


def clear() -> None:
    """Remove all entries from the registry.

    Primarily used in tests to reset state between runs.
    """
    _registry.clear()

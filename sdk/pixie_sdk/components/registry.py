"""Central in-memory store mapping component slot names to their HTML source paths.

The registry is rebuilt each process run — no persistence needed.
Components are registered during ``scan_and_register()`` at server startup.

See Also:
    ``scanner.scan_and_register`` — populates this registry.
    ``server`` — reads from this registry to serve labeling pages.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

# ============================================================================
# Data Model
# ============================================================================


@dataclass
class RegisteredComponent:
    """A labeling component discovered and ready to serve.

    Attributes:
        slot: The component identifier derived from the filename stem
              (e.g. ``"adf79684-0327-4261-9f6f-70719c0c947b"``).
        src_path: Absolute path to the user ``.html`` file.
    """

    slot: str
    src_path: Path


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
        slot: Component identifier.

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

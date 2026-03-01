"""Tests for pixie_sdk._components._registry — in-memory component store."""

from __future__ import annotations

from pathlib import Path

import pytest

from pixie_sdk._components._registry import (
    RegisteredComponent,
    clear,
    get_component,
    list_slots,
    set_component,
)


@pytest.fixture(autouse=True)
def _clean_registry():
    """Clear registry state before and after each test."""
    clear()
    yield
    clear()


class TestRegisteredComponent:
    """Test the RegisteredComponent dataclass."""

    def test_fields(self):
        """All fields should be accessible on an instance."""
        c = RegisteredComponent(
            slot="demo",
            src_path=Path("/a/demo.tsx"),
            bundle_path=Path("/tmp/demo.js"),
        )
        assert c.slot == "demo"
        assert c.src_path == Path("/a/demo.tsx")
        assert c.bundle_path == Path("/tmp/demo.js")


class TestGetComponent:
    """Test get_component()."""

    def test_returns_none_for_missing(self):
        """Looking up a non-existent slot returns None."""
        assert get_component("nonexistent") is None

    def test_returns_registered(self):
        """Looking up a registered slot returns the component."""
        comp = RegisteredComponent(
            slot="abc",
            src_path=Path("/x/abc.tsx"),
            bundle_path=Path("/y/abc.js"),
        )
        set_component("abc", comp)
        assert get_component("abc") is comp


class TestSetComponent:
    """Test set_component()."""

    def test_register_and_retrieve(self):
        """A registered component can be retrieved."""
        comp = RegisteredComponent(
            slot="foo",
            src_path=Path("/a/foo.tsx"),
            bundle_path=Path("/b/foo.js"),
        )
        set_component("foo", comp)
        assert get_component("foo") is comp

    def test_overwrite(self):
        """Registering the same slot twice overwrites the previous entry."""
        comp1 = RegisteredComponent(
            slot="x", src_path=Path("/1.tsx"), bundle_path=Path("/1.js")
        )
        comp2 = RegisteredComponent(
            slot="x", src_path=Path("/2.tsx"), bundle_path=Path("/2.js")
        )
        set_component("x", comp1)
        set_component("x", comp2)
        assert get_component("x") is comp2


class TestListSlots:
    """Test list_slots()."""

    def test_empty(self):
        """Empty registry returns empty list."""
        assert list_slots() == []

    def test_sorted(self):
        """Slots are returned in sorted order."""
        for name in ["charlie", "alpha", "bravo"]:
            set_component(
                name,
                RegisteredComponent(
                    slot=name,
                    src_path=Path(f"/{name}.tsx"),
                    bundle_path=Path(f"/{name}.js"),
                ),
            )
        assert list_slots() == ["alpha", "bravo", "charlie"]


class TestClear:
    """Test clear()."""

    def test_removes_all(self):
        """clear() empties the registry."""
        set_component(
            "x",
            RegisteredComponent(
                slot="x", src_path=Path("/x.tsx"), bundle_path=Path("/x.js")
            ),
        )
        assert list_slots() != []
        clear()
        assert list_slots() == []

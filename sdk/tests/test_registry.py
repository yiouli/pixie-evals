"""Tests for pixie_sdk.components.registry — in-memory component store."""

from __future__ import annotations

from pathlib import Path

import pytest

from pixie_sdk.components.registry import (
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
            src_path=Path("/a/demo.html"),
        )
        assert c.slot == "demo"
        assert c.src_path == Path("/a/demo.html")


class TestGetComponent:
    """Test get_component()."""

    def test_returns_none_for_missing(self):
        """Looking up a non-existent slot returns None."""
        assert get_component("nonexistent") is None

    def test_returns_registered(self):
        """Looking up a registered slot returns the component."""
        comp = RegisteredComponent(
            slot="abc",
            src_path=Path("/x/abc.html"),
        )
        set_component("abc", comp)
        assert get_component("abc") is comp


class TestSetComponent:
    """Test set_component()."""

    def test_register_and_retrieve(self):
        """A registered component can be retrieved."""
        comp = RegisteredComponent(
            slot="foo",
            src_path=Path("/a/foo.html"),
        )
        set_component("foo", comp)
        assert get_component("foo") is comp

    def test_overwrite(self):
        """Registering the same slot twice overwrites the previous entry."""
        comp1 = RegisteredComponent(
            slot="x",
            src_path=Path("/1.html"),
        )
        comp2 = RegisteredComponent(
            slot="x",
            src_path=Path("/2.html"),
        )
        set_component("x", comp1)
        set_component("x", comp2)
        assert get_component("x") is comp2


class TestListSlots:
    """Test list_slots()."""

    def test_empty(self):
        """Empty registry returns empty list."""
        assert list_slots() == []

    def test_sorted_order(self):
        """list_slots returns slot names in sorted order."""
        set_component(
            "beta", RegisteredComponent(slot="beta", src_path=Path("/b.html"))
        )
        set_component(
            "alpha", RegisteredComponent(slot="alpha", src_path=Path("/a.html"))
        )
        assert list_slots() == ["alpha", "beta"]


class TestClear:
    """Test clear()."""

    def test_clears_all(self):
        """clear() empties the registry."""
        set_component("x", RegisteredComponent(slot="x", src_path=Path("/x.html")))
        assert list_slots() == ["x"]
        clear()
        assert list_slots() == []

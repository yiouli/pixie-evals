"""Tests for pixie_sdk.components — public API (__init__.py)."""

from __future__ import annotations

from pathlib import Path

from pixie_sdk.components import (
    PLACEHOLDER_ATTR,
    get_components_dir,
    set_components_dir,
)


class TestComponentsDir:
    """Test set_components_dir / get_components_dir."""

    def test_default_is_labeling(self):
        """The default components dir is 'labeling'."""
        set_components_dir("labeling")
        assert get_components_dir() == Path("labeling")

    def test_set_string(self):
        """set_components_dir accepts a string."""
        set_components_dir("./my_ui")
        assert get_components_dir() == Path("./my_ui")
        set_components_dir("labeling")

    def test_set_path(self):
        """set_components_dir accepts a Path."""
        set_components_dir(Path("/absolute/path"))
        assert get_components_dir() == Path("/absolute/path")
        set_components_dir("labeling")

    def test_round_trip(self):
        """Setting and getting returns the same value."""
        set_components_dir("custom_folder")
        assert get_components_dir() == Path("custom_folder")
        set_components_dir("labeling")


class TestPlaceholderAttr:
    """Test the PLACEHOLDER_ATTR constant."""

    def test_placeholder_attr_value(self):
        """PLACEHOLDER_ATTR is the expected attribute name."""
        assert PLACEHOLDER_ATTR == "pixie-evals-labeling-input"

"""Tests for pixie_sdk._components — public API (__init__.py)."""

from __future__ import annotations

from pathlib import Path

from pixie_sdk._components import get_components_dir, set_components_dir


class TestComponentsDir:
    """Test set_components_dir / get_components_dir."""

    def test_default_is_labeling(self):
        """The default components dir is 'labeling'."""
        # Reset to default.
        set_components_dir("labeling")
        assert get_components_dir() == Path("labeling")

    def test_set_string(self):
        """set_components_dir accepts a string."""
        set_components_dir("./my_ui")
        assert get_components_dir() == Path("./my_ui")
        # Restore default.
        set_components_dir("labeling")

    def test_set_path(self):
        """set_components_dir accepts a Path."""
        set_components_dir(Path("/absolute/path"))
        assert get_components_dir() == Path("/absolute/path")
        # Restore default.
        set_components_dir("labeling")

    def test_round_trip(self):
        """Setting and getting returns the same value."""
        set_components_dir("custom_folder")
        assert get_components_dir() == Path("custom_folder")
        set_components_dir("labeling")

"""Tests for pixie_sdk._components._scanner — folder scanning and registration."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from pixie_sdk._components._bundler import ComponentBundleError
from pixie_sdk._components._registry import clear, get_component
from pixie_sdk._components._scanner import scan_and_register


@pytest.fixture(autouse=True)
def _clean_registry():
    """Clear registry state before and after each test."""
    clear()
    yield
    clear()


class TestScanAndRegister:
    """Test scan_and_register()."""

    def test_missing_directory(self, tmp_path, capsys):
        """Non-existent directory returns empty list and prints warning."""
        result = scan_and_register(tmp_path / "nonexistent")
        assert result == []
        captured = capsys.readouterr()
        assert "not found" in captured.out

    def test_empty_directory(self, tmp_path, capsys):
        """Directory with no .tsx files returns empty list."""
        result = scan_and_register(tmp_path)
        assert result == []
        captured = capsys.readouterr()
        assert "No .tsx files" in captured.out

    def test_ignores_non_tsx(self, tmp_path, capsys):
        """Non-.tsx files are ignored."""
        (tmp_path / "readme.md").write_text("# Readme")
        (tmp_path / "helper.ts").write_text("export const x = 1;")
        (tmp_path / "style.css").write_text("body {}")

        result = scan_and_register(tmp_path)
        assert result == []

    @patch("pixie_sdk._components._scanner.bundle_component")
    def test_registers_valid_tsx(self, mock_bundle, tmp_path):
        """Valid .tsx files are bundled and registered."""
        # Create two .tsx files.
        (tmp_path / "alpha.tsx").write_text("export default function Alpha() {}")
        (tmp_path / "beta.tsx").write_text("export default function Beta() {}")

        # Mock successful bundling.
        def fake_bundle(src, slot):
            out = tmp_path / f"{slot}.js"
            out.write_text(f"// {slot}")
            return out

        mock_bundle.side_effect = fake_bundle

        result = scan_and_register(tmp_path)
        assert result == ["alpha", "beta"]
        assert get_component("alpha") is not None
        assert get_component("beta") is not None

    @patch("pixie_sdk._components._scanner.bundle_component")
    def test_partial_failure(self, mock_bundle, tmp_path, capsys):
        """A failing file doesn't prevent others from registering."""
        (tmp_path / "good.tsx").write_text("export default function Good() {}")
        (tmp_path / "bad.tsx").write_text("syntax error!")

        def fake_bundle(src, slot):
            if slot == "bad":
                raise ComponentBundleError("parse error")
            out = tmp_path / f"{slot}.js"
            out.write_text(f"// {slot}")
            return out

        mock_bundle.side_effect = fake_bundle

        result = scan_and_register(tmp_path)
        assert result == ["good"]
        assert get_component("good") is not None
        assert get_component("bad") is None

        captured = capsys.readouterr()
        assert "✓ good" in captured.out
        assert "✗ bad" in captured.out
        assert "1/2 components ready" in captured.out

    @patch("pixie_sdk._components._scanner.bundle_component")
    def test_deterministic_order(self, mock_bundle, tmp_path):
        """Files are processed in sorted order for deterministic output."""

        def fake_bundle(src, slot):
            out = tmp_path / f"{slot}.js"
            out.write_text(f"// {slot}")
            return out

        mock_bundle.side_effect = fake_bundle

        # Create files in non-sorted order.
        for name in ["zebra", "apple", "mango"]:
            (tmp_path / f"{name}.tsx").write_text(
                f"export default function {name}() {{}}"
            )

        result = scan_and_register(tmp_path)
        assert result == ["apple", "mango", "zebra"]

    @patch("pixie_sdk._components._scanner.bundle_component")
    def test_uses_stem_as_slot(self, mock_bundle, tmp_path):
        """The filename stem (without .tsx) is used as the slot name."""

        def fake_bundle(src, slot):
            out = tmp_path / f"{slot}.js"
            out.write_text("")
            return out

        mock_bundle.side_effect = fake_bundle

        (tmp_path / "trace_comparison.tsx").write_text(
            "export default function TC() {}"
        )

        result = scan_and_register(tmp_path)
        assert result == ["trace_comparison"]
        comp = get_component("trace_comparison")
        assert comp is not None
        assert comp.slot == "trace_comparison"

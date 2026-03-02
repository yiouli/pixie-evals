"""Tests for pixie_sdk.components.scanner — folder scanning and registration."""

from __future__ import annotations

import pytest

from pixie_sdk.components.registry import clear, get_component
from pixie_sdk.components.scanner import scan_and_register


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
        """Directory with no .html files returns empty list."""
        result = scan_and_register(tmp_path)
        assert result == []
        captured = capsys.readouterr()
        assert "No .html files" in captured.out

    def test_ignores_non_html(self, tmp_path, capsys):
        """Non-.html files are ignored."""
        (tmp_path / "readme.md").write_text("# Readme")
        (tmp_path / "helper.ts").write_text("export const x = 1;")
        (tmp_path / "style.css").write_text("body {}")
        (tmp_path / "component.tsx").write_text("export default function C() {}")

        result = scan_and_register(tmp_path)
        assert result == []

    def test_registers_valid_html(self, tmp_path):
        """Valid .html files are registered."""
        (tmp_path / "alpha.html").write_text("<html><body>Alpha</body></html>")
        (tmp_path / "beta.html").write_text("<html><body>Beta</body></html>")

        result = scan_and_register(tmp_path)
        assert result == ["alpha", "beta"]
        assert get_component("alpha") is not None
        assert get_component("beta") is not None

    def test_deterministic_order(self, tmp_path):
        """Files are processed in sorted order for deterministic output."""
        (tmp_path / "zebra.html").write_text("<html></html>")
        (tmp_path / "alpha.html").write_text("<html></html>")
        (tmp_path / "middle.html").write_text("<html></html>")

        result = scan_and_register(tmp_path)
        assert result == ["alpha", "middle", "zebra"]

    def test_stem_as_slot(self, tmp_path):
        """The slot name is the filename stem (without .html extension)."""
        (tmp_path / "my-suite-id.html").write_text("<html></html>")

        result = scan_and_register(tmp_path)
        assert result == ["my-suite-id"]
        comp = get_component("my-suite-id")
        assert comp is not None
        assert comp.src_path == (tmp_path / "my-suite-id.html").resolve()

    def test_uuid_as_slot(self, tmp_path):
        """UUID-style filenames work correctly as slots."""
        uuid_name = "adf79684-0327-4261-9f6f-70719c0c947b"
        (tmp_path / f"{uuid_name}.html").write_text("<html></html>")

        result = scan_and_register(tmp_path)
        assert result == [uuid_name]
        assert get_component(uuid_name) is not None

    def test_prints_count(self, tmp_path, capsys):
        """scan_and_register prints the count of registered pages."""
        (tmp_path / "a.html").write_text("<html></html>")
        (tmp_path / "b.html").write_text("<html></html>")

        scan_and_register(tmp_path)
        captured = capsys.readouterr()
        assert "2 labeling page(s) ready" in captured.out

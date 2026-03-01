"""Tests for pixie_sdk._components._shell — HTML shell generator."""

from __future__ import annotations

from pixie_sdk._components._shell import render_shell


class TestRenderShell:
    """Test render_shell()."""

    def test_contains_component_name(self):
        """The shell HTML includes the component name as a JS constant."""
        html = render_shell("trace_comparison", "abc123")
        assert 'COMPONENT_NAME = "trace_comparison"' in html

    def test_contains_input_id(self):
        """The shell HTML includes the input ID as a JS constant."""
        html = render_shell("trace_comparison", "abc123")
        assert 'INPUT_ID = "abc123"' in html

    def test_title_from_slot(self):
        """The page title is derived from the slot name."""
        html = render_shell("trace_comparison", "x")
        assert "<title>Trace Comparison</title>" in html

    def test_import_map_present(self):
        """The shell includes an import map for React."""
        html = render_shell("demo", "x")
        assert '"importmap"' in html
        assert "/vendor/react.mjs" in html
        assert "/vendor/react-dom-client.mjs" in html
        assert "/vendor/react-jsx-runtime.mjs" in html

    def test_loads_bundle(self):
        """The shell imports the component bundle dynamically."""
        html = render_shell("my_comp", "id1")
        assert "/api/components/" in html

    def test_fetches_input(self):
        """The shell fetches the input object from /api/inputs/."""
        html = render_shell("demo", "entry_42")
        assert "/api/inputs/" in html

    def test_error_boundary(self):
        """The shell includes a React ErrorBoundary class."""
        html = render_shell("demo", "x")
        assert "ErrorBoundary" in html
        assert "getDerivedStateFromError" in html

    def test_is_complete_html(self):
        """The output is a complete HTML document."""
        html = render_shell("demo", "x")
        assert html.startswith("<!DOCTYPE html>")
        assert "</html>" in html

    def test_no_unresolved_placeholders(self):
        """No Python format placeholders remain after rendering."""
        html = render_shell("trace_comparison", "abc")
        # Python format placeholders use single braces: {name}.
        # JS template literals use ${name} — those are fine.
        # Verify no Python-style placeholders survived.
        assert "{component_name}" not in html
        assert "{input_id}" not in html
        # {title} appears inside JS `${title}` — that's a JS template
        # literal, not a Python placeholder, so we only check the Python ones.

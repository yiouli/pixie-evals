"""Tests for pixie_sdk.components.scaffold — HTML + d.ts scaffold generation."""

from __future__ import annotations

from unittest.mock import AsyncMock
from uuid import UUID

import pytest

from pixie_sdk.components import PLACEHOLDER_ATTR
from pixie_sdk.components.scaffold import (
    _build_fields,
    _json_schema_to_ts_type,
    _to_snake_case,
    scaffold_component,
)

# ============================================================================
# _to_snake_case
# ============================================================================


class TestToSnakeCase:
    """Test _to_snake_case helper."""

    def test_spaces(self):
        assert _to_snake_case("Trace Comparison") == "trace_comparison"

    def test_camel_case(self):
        assert _to_snake_case("TraceComparison") == "trace_comparison"

    def test_already_snake(self):
        assert _to_snake_case("trace_comparison") == "trace_comparison"

    def test_special_chars(self):
        assert _to_snake_case("LLM Output - Review!") == "llm_output_review"

    def test_mixed(self):
        assert _to_snake_case("My TestSuite v2") == "my_test_suite_v2"


# ============================================================================
# _json_schema_to_ts_type
# ============================================================================


class TestJsonSchemaToTsType:
    """Test JSON Schema → TypeScript type mapping."""

    def test_string(self):
        assert _json_schema_to_ts_type({"type": "string"}) == "string"

    def test_number(self):
        assert _json_schema_to_ts_type({"type": "number"}) == "number"

    def test_integer(self):
        assert _json_schema_to_ts_type({"type": "integer"}) == "number"

    def test_boolean(self):
        assert _json_schema_to_ts_type({"type": "boolean"}) == "boolean"

    def test_array_of_strings(self):
        assert (
            _json_schema_to_ts_type({"type": "array", "items": {"type": "string"}})
            == "string[]"
        )

    def test_object(self):
        assert _json_schema_to_ts_type({"type": "object"}) == "Record<string, unknown>"

    def test_unknown_type(self):
        assert _json_schema_to_ts_type({"type": "null"}) == "unknown"

    def test_missing_type(self):
        assert _json_schema_to_ts_type({}) == "unknown"


# ============================================================================
# _build_fields
# ============================================================================


class TestBuildFields:
    """Test InputProps field generation from JSON Schema."""

    def test_with_properties(self):
        schema = {
            "type": "object",
            "properties": {
                "input": {"type": "string"},
                "score": {"type": "number"},
            },
            "required": ["input"],
        }
        result = _build_fields(schema)
        assert "input: string;" in result
        assert "score?: number;" in result

    def test_empty_properties(self):
        schema = {"type": "object", "properties": {}}
        result = _build_fields(schema)
        assert "[key: string]: unknown;" in result

    def test_no_properties_key(self):
        schema = {"type": "object"}
        result = _build_fields(schema)
        assert "[key: string]: unknown;" in result

    def test_all_required(self):
        schema = {
            "type": "object",
            "properties": {
                "a": {"type": "string"},
                "b": {"type": "boolean"},
            },
            "required": ["a", "b"],
        }
        result = _build_fields(schema)
        assert "a: string;" in result
        assert "b: boolean;" in result
        assert "?" not in result


# ============================================================================
# scaffold_component (async)
# ============================================================================


class TestScaffoldComponent:
    """Test scaffold_component with a mocked RemoteClient."""

    @pytest.mark.asyncio
    async def test_creates_html_and_dts_files(self, tmp_path):
        """Should create an .html and .d.ts file."""
        mock_client = AsyncMock()
        mock_client.get_test_suite.return_value = {
            "id": "adf79684-0327-4261-9f6f-70719c0c947b",
            "name": "Trace Comparison",
            "description": "Compare traces",
            "config": {
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "input": {"type": "string"},
                        "output": {"type": "string"},
                        "expected": {"type": "string"},
                    },
                    "required": ["input", "output"],
                }
            },
        }

        test_id = UUID("adf79684-0327-4261-9f6f-70719c0c947b")
        html_path, dts_path = await scaffold_component(
            test_suite_id=test_id,
            components_dir=tmp_path / "labeling",
            remote_client=mock_client,
        )

        # HTML file — named by normalized suite name
        assert html_path.exists()
        assert html_path.name == "trace_comparison.html"
        assert html_path.parent == tmp_path / "labeling"

        html_content = html_path.read_text()
        assert PLACEHOLDER_ATTR in html_content
        assert "Trace Comparison" in html_content
        assert "trace_comparison.d.ts" in html_content

        # d.ts file
        assert dts_path.exists()
        assert dts_path.name == "trace_comparison.d.ts"
        assert dts_path.parent == tmp_path / "labeling"

        dts_content = dts_path.read_text()
        assert "interface InputProps" in dts_content
        assert "input: string;" in dts_content
        assert "output: string;" in dts_content
        assert "expected?: string;" in dts_content  # not required
        assert "declare const INPUT: InputProps;" in dts_content

    @pytest.mark.asyncio
    async def test_raises_if_not_found(self, tmp_path):
        """Should raise ValueError when the test suite is not found."""
        mock_client = AsyncMock()
        mock_client.get_test_suite.return_value = None

        with pytest.raises(ValueError, match="not found"):
            await scaffold_component(
                test_suite_id=UUID("00000000-0000-0000-0000-000000000000"),
                components_dir=tmp_path / "labeling",
                remote_client=mock_client,
            )

    @pytest.mark.asyncio
    async def test_config_as_json_string(self, tmp_path):
        """Config may arrive as a JSON string; scaffold should handle it."""
        import json

        test_id = UUID("adf79684-0327-4261-9f6f-70719c0c947b")
        mock_client = AsyncMock()
        mock_client.get_test_suite.return_value = {
            "id": str(test_id),
            "name": "String Config Suite",
            "config": json.dumps(
                {
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "text": {"type": "string"},
                        },
                    }
                }
            ),
        }

        html_path, dts_path = await scaffold_component(
            test_suite_id=test_id,
            components_dir=tmp_path / "labeling",
            remote_client=mock_client,
        )

        assert html_path.name == "string_config_suite.html"
        dts_content = dts_path.read_text()
        assert "text" in dts_content

    @pytest.mark.asyncio
    async def test_empty_schema(self, tmp_path):
        """Suite with no inputSchema should produce a fallback interface."""
        test_id = UUID("adf79684-0327-4261-9f6f-70719c0c947b")
        mock_client = AsyncMock()
        mock_client.get_test_suite.return_value = {
            "id": str(test_id),
            "name": "Empty Schema",
            "config": {},
        }

        _html_path, dts_path = await scaffold_component(
            test_suite_id=test_id,
            components_dir=tmp_path / "labeling",
            remote_client=mock_client,
        )

        dts_content = dts_path.read_text()
        assert "[key: string]: unknown;" in dts_content

    @pytest.mark.asyncio
    async def test_creates_directory(self, tmp_path):
        """Should create the components_dir if it doesn't exist."""
        deep_dir = tmp_path / "a" / "b" / "labeling"
        assert not deep_dir.exists()

        test_id = UUID("adf79684-0327-4261-9f6f-70719c0c947b")
        mock_client = AsyncMock()
        mock_client.get_test_suite.return_value = {
            "id": str(test_id),
            "name": "New Suite",
            "config": {},
        }

        html_path, _dts_path = await scaffold_component(
            test_suite_id=test_id,
            components_dir=deep_dir,
            remote_client=mock_client,
        )

        assert deep_dir.exists()
        assert html_path.exists()

    @pytest.mark.asyncio
    async def test_input_schema_snake_case_key(self, tmp_path):
        """Remote server returns 'input_schema' (snake_case); scaffold must accept it."""
        mock_client = AsyncMock()
        mock_client.get_test_suite.return_value = {
            "id": "adf79684-0327-4261-9f6f-70719c0c947b",
            "name": "demo",
            "config": {
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "summary": {"type": "string"},
                        "transcript": {
                            "type": "array",
                            "items": {"type": "object"},
                        },
                        "function_called": {
                            "type": "array",
                            "items": {"type": "object"},
                        },
                    },
                    "required": ["summary", "transcript", "function_called"],
                }
            },
        }

        test_id = UUID("adf79684-0327-4261-9f6f-70719c0c947b")
        _html_path, dts_path = await scaffold_component(
            test_suite_id=test_id,
            components_dir=tmp_path / "labeling",
            remote_client=mock_client,
        )

        dts_content = dts_path.read_text()
        assert "summary: string;" in dts_content
        assert "transcript: Record<string, unknown>[];" in dts_content
        assert "function_called: Record<string, unknown>[];" in dts_content
        assert "[key: string]: unknown;" not in dts_content

    @pytest.mark.asyncio
    async def test_dts_named_after_suite(self, tmp_path):
        """The .d.ts file is named after the normalized suite name, not UUID."""
        mock_client = AsyncMock()
        mock_client.get_test_suite.return_value = {
            "id": "adf79684-0327-4261-9f6f-70719c0c947b",
            "name": "My Cool Suite",
            "config": {},
        }

        test_id = UUID("adf79684-0327-4261-9f6f-70719c0c947b")
        html_path, dts_path = await scaffold_component(
            test_suite_id=test_id,
            components_dir=tmp_path / "labeling",
            remote_client=mock_client,
        )

        # Both files are named by normalized suite name
        assert html_path.name == "my_cool_suite.html"
        assert dts_path.name == "my_cool_suite.d.ts"

    @pytest.mark.asyncio
    async def test_html_is_valid_document(self, tmp_path):
        """The generated HTML is a complete HTML document."""
        mock_client = AsyncMock()
        mock_client.get_test_suite.return_value = {
            "id": "adf79684-0327-4261-9f6f-70719c0c947b",
            "name": "Test",
            "config": {},
        }

        test_id = UUID("adf79684-0327-4261-9f6f-70719c0c947b")
        html_path, _dts_path = await scaffold_component(
            test_suite_id=test_id,
            components_dir=tmp_path / "labeling",
            remote_client=mock_client,
        )

        html = html_path.read_text()
        assert html.startswith("<!DOCTYPE html>")
        assert "</html>" in html
        assert "<title>" in html

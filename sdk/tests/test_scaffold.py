"""Tests for pixie_sdk._components._scaffold — TSX scaffold generation."""

from __future__ import annotations

from unittest.mock import AsyncMock
from uuid import UUID

import pytest

from pixie_sdk._components._scaffold import (
    _build_fields,
    _json_schema_to_ts_type,
    _to_pascal_case,
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
# _to_pascal_case
# ============================================================================


class TestToPascalCase:
    """Test _to_pascal_case helper."""

    def test_simple(self):
        assert _to_pascal_case("trace_comparison") == "TraceComparison"

    def test_single_word(self):
        assert _to_pascal_case("demo") == "Demo"

    def test_multiple_words(self):
        assert _to_pascal_case("llm_output_review") == "LlmOutputReview"


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
        assert "score?: number;" in result  # optional because not required

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
    async def test_creates_tsx_file(self, tmp_path):
        """Should create a .tsx file named after the test suite UUID."""
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
        result = await scaffold_component(
            test_suite_id=test_id,
            components_dir=tmp_path / "labeling",
            remote_client=mock_client,
        )

        assert result.exists()
        # File is named after the test suite UUID
        assert result.name == "adf79684-0327-4261-9f6f-70719c0c947b.tsx"
        assert result.parent == tmp_path / "labeling"

        content = result.read_text()
        assert "export interface InputProps" in content
        assert "input: string;" in content
        assert "output: string;" in content
        assert "expected?: string;" in content  # not required
        # Function name is PascalCase from suite name
        assert "export default function TraceComparison" in content
        # Route uses the UUID
        assert "/labeling/adf79684-0327-4261-9f6f-70719c0c947b" in content
        # Suite name appears in comment and h2
        assert "Trace Comparison" in content

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

        result = await scaffold_component(
            test_suite_id=test_id,
            components_dir=tmp_path / "labeling",
            remote_client=mock_client,
        )

        assert result.name == f"{test_id}.tsx"
        content = result.read_text()
        assert "text" in content

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

        result = await scaffold_component(
            test_suite_id=test_id,
            components_dir=tmp_path / "labeling",
            remote_client=mock_client,
        )

        content = result.read_text()
        assert "[key: string]: unknown;" in content

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

        result = await scaffold_component(
            test_suite_id=test_id,
            components_dir=deep_dir,
            remote_client=mock_client,
        )

        assert deep_dir.exists()
        assert result.exists()

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
        result = await scaffold_component(
            test_suite_id=test_id,
            components_dir=tmp_path / "labeling",
            remote_client=mock_client,
        )

        content = result.read_text()
        assert "summary: string;" in content
        assert "transcript: Record<string, unknown>[];" in content
        assert "function_called: Record<string, unknown>[];" in content
        # Should NOT have the fallback
        assert "[key: string]: unknown;" not in content

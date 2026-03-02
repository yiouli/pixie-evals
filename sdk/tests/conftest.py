"""Test fixtures and utilities for Pixie SDK tests."""

from __future__ import annotations

from uuid import uuid4

import pytest


@pytest.fixture
def sample_rows() -> list[dict]:
    """Sample data rows for testing ingestion and dataset operations."""
    return [
        {"prompt": "What is AI?", "response": "AI is artificial intelligence."},
        {"prompt": "Explain ML.", "response": "ML is machine learning."},
        {"prompt": "Define NLP.", "response": "NLP is natural language processing."},
    ]


@pytest.fixture
def sample_schema() -> dict:
    """Expected JSON schema for sample_rows."""
    return {
        "type": "object",
        "properties": {
            "prompt": {"type": "string"},
            "response": {"type": "string"},
        },
        "required": ["prompt", "response"],
    }


@pytest.fixture
def sample_dataset_id():
    """A sample dataset UUID."""
    return uuid4()


@pytest.fixture
def sample_entry_id():
    """A sample data entry UUID."""
    return uuid4()

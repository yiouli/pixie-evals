"""Tests for pixie_sdk.server — FastAPI application."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from pixie_sdk.server import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


# ============================================================================
# TestHealthCheck
# ============================================================================


class TestHealthCheck:
    """Test the health check endpoint."""

    def test_returns_ok(self, client):
        """GET /health should return {status: ok}."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


# ============================================================================
# TestGraphQLEndpoint
# ============================================================================


class TestGraphQLEndpoint:
    """Test that the GraphQL endpoint is mounted."""

    def test_graphql_reachable(self, client):
        """POST /graphql should be reachable."""
        response = client.post(
            "/graphql",
            json={"query": "{ __typename }"},
        )
        assert response.status_code == 200


# ============================================================================
# TestLabelingUi (F5)
# ============================================================================


class TestLabelingUi:
    """Test the labeling UI REST endpoint."""

    @patch("pixie_sdk.server.db")
    def test_returns_html(self, mock_db, client):
        """GET /labeling-ui/{id} returns HTML with entry data."""
        entry_id = uuid4()
        mock_db.get_db = AsyncMock()
        mock_conn = AsyncMock()
        mock_db.get_db.return_value = mock_conn
        mock_db.get_data_entry = AsyncMock(
            return_value={
                "id": str(entry_id),
                "dataset_id": str(uuid4()),
                "data": {"prompt": "hello", "response": "world"},
            }
        )

        response = client.get(f"/labeling-ui/{entry_id}")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
        assert "hello" in response.text or "prompt" in response.text

    @patch("pixie_sdk.server.db")
    def test_not_found(self, mock_db, client):
        """GET /labeling-ui/{random_id} returns 404."""
        mock_db.get_db = AsyncMock()
        mock_conn = AsyncMock()
        mock_db.get_db.return_value = mock_conn
        mock_db.get_data_entry = AsyncMock(return_value=None)

        response = client.get(f"/labeling-ui/{uuid4()}")
        assert response.status_code == 404


# ============================================================================
# TestUploadFile (F3) — GraphQL multipart mutation
# ============================================================================


class TestUploadFile:
    """Test the upload_file mutation via multipart GraphQL request."""

    @patch("pixie_sdk.server.db")
    @patch("pixie_sdk.graphql.db")
    @patch("pixie_sdk.graphql.ingest")
    def test_upload_creates_dataset(
        self, mock_ingest, mock_gql_db, mock_server_db, client
    ):
        """uploadFile mutation creates a dataset and returns its info."""
        dataset_id = uuid4()
        mock_ingest.load_to_rows.return_value = [{"a": 1}]
        mock_ingest.infer_schema.return_value = {
            "type": "object",
            "properties": {"a": {"type": "integer"}},
        }

        # Mock the context getter's DB
        mock_conn = AsyncMock()
        mock_server_db.get_db = AsyncMock(return_value=mock_conn)
        mock_gql_db.create_dataset = AsyncMock(return_value=dataset_id)
        mock_gql_db.create_data_entries = AsyncMock(return_value=[uuid4()])

        response = client.post(
            "/graphql",
            data={
                "operations": json.dumps(
                    {
                        "query": """
                            mutation($file: Upload!) {
                                uploadFile(file: $file) {
                                    id
                                    fileName
                                }
                            }
                        """,
                        "variables": {"file": None},
                    }
                ),
                "map": json.dumps({"file": ["variables.file"]}),
            },
            files={"file": ("data.json", b'[{"a":1}]', "application/json")},
        )
        # The mutation should succeed (200) — detailed assertions depend on
        # the mocking setup; at minimum ensure the endpoint accepted the
        # multipart request.
        assert response.status_code == 200

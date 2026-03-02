"""Tests for pixie_sdk.server — FastAPI application."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from pixie_sdk.components.registry import RegisteredComponent, clear, set_component
from pixie_sdk.server import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clean_registry():
    """Clear the component registry before each test."""
    clear()
    yield
    clear()


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
# TestComponentRoutes — labeling component system
# ============================================================================


class TestComponentRoutes:
    """Test the labeling component HTTP routes."""

    @patch("pixie_sdk.components.server.rescan_components")
    def test_list_components_empty(self, mock_rescan, client):
        """GET /api/components returns empty list when nothing registered."""
        response = client.get("/api/components")
        assert response.status_code == 200
        assert response.json() == {"slots": []}
        mock_rescan.assert_called_once()

    @patch("pixie_sdk.components.server.rescan_components")
    def test_list_components_with_entries(self, mock_rescan, client, tmp_path):
        """GET /api/components returns registered slot names."""
        html_file = tmp_path / "demo.html"
        html_file.write_text("<html></html>")
        set_component(
            "demo",
            RegisteredComponent(slot="demo", src_path=html_file),
        )

        response = client.get("/api/components")
        assert response.status_code == 200
        assert response.json() == {"slots": ["demo"]}

    def test_input_returns_data_entry(self, client):
        """GET /api/inputs/{id} returns the data entry from the DB."""
        entry_id = str(uuid4())
        entry_data = {"input": "hello", "output": "world"}
        mock_entry = {
            "id": entry_id,
            "dataset_id": str(uuid4()),
            "data": entry_data,
        }

        with patch("pixie_sdk.components.server.db") as mock_db:
            mock_conn = AsyncMock()
            mock_db.get_db = AsyncMock(return_value=mock_conn)
            mock_db.get_local_entry_id = AsyncMock(return_value=None)
            mock_db.get_data_entry = AsyncMock(return_value=mock_entry)
            mock_conn.close = AsyncMock()

            response = client.get(f"/api/inputs/{entry_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["input"] == "hello"
            assert data["output"] == "world"
            assert data["id"] == entry_id

    def test_input_resolves_remote_id(self, client):
        """GET /api/inputs/{remote_id} resolves via test_case_map."""
        remote_id = str(uuid4())
        local_id = str(uuid4())
        entry_data = {"prompt": "hi", "response": "bye"}
        mock_entry = {
            "id": local_id,
            "dataset_id": str(uuid4()),
            "data": entry_data,
        }

        with patch("pixie_sdk.components.server.db") as mock_db:
            mock_conn = AsyncMock()
            mock_db.get_db = AsyncMock(return_value=mock_conn)
            mock_db.get_local_entry_id = AsyncMock(return_value=local_id)
            mock_db.get_data_entry = AsyncMock(return_value=mock_entry)
            mock_conn.close = AsyncMock()

            response = client.get(f"/api/inputs/{remote_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["prompt"] == "hi"
            assert data["id"] == local_id

    def test_input_not_found(self, client):
        """GET /api/inputs/{id} returns 404 for missing entry."""
        entry_id = str(uuid4())

        with patch("pixie_sdk.components.server.db") as mock_db:
            mock_conn = AsyncMock()
            mock_db.get_db = AsyncMock(return_value=mock_conn)
            mock_db.get_local_entry_id = AsyncMock(return_value=None)
            mock_db.get_data_entry = AsyncMock(return_value=None)
            mock_conn.close = AsyncMock()

            response = client.get(f"/api/inputs/{entry_id}")
            assert response.status_code == 404


# ============================================================================
# TestGetLabelingHtmlQuery — GraphQL query for labeling pages
# ============================================================================


class TestGetLabelingHtmlQuery:
    """Test the getLabelingHtml GraphQL query."""

    def test_returns_html_with_injected_input(self, client, tmp_path):
        """getLabelingHtml returns HTML with input data injected."""
        test_case_id = str(uuid4())
        test_suite_id = str(uuid4())
        local_entry_id = str(uuid4())

        # Register a labeling page under the slot "demo"
        html_file = tmp_path / "demo.html"
        html_file.write_text(
            "<!DOCTYPE html><html><head></head><body>"
            "<script pixie-evals-labeling-input>\n"
            "window.INPUT=undefined;\n"
            "</script>"
            "<script>console.log(window.INPUT)</script>"
            "</body></html>"
        )
        set_component(
            "demo",
            RegisteredComponent(slot="demo", src_path=html_file),
        )

        entry_data = {"prompt": "hello", "response": "world"}
        mock_entry = {
            "id": local_entry_id,
            "dataset_id": str(uuid4()),
            "data": entry_data,
        }

        mock_conn = AsyncMock()
        mock_client = AsyncMock()
        mock_client.get_test_case = AsyncMock(
            return_value={"id": test_case_id, "testSuite": test_suite_id}
        )
        mock_client.get_test_suite = AsyncMock(
            return_value={"id": test_suite_id, "name": "Demo"}
        )

        with (
            patch("pixie_sdk.db.get_db", new=AsyncMock(return_value=mock_conn)),
            patch(
                "pixie_sdk.db.get_local_entry_id",
                new=AsyncMock(return_value=local_entry_id),
            ),
            patch(
                "pixie_sdk.db.get_data_entry", new=AsyncMock(return_value=mock_entry)
            ),
            patch(
                "pixie_sdk.remote_client.RemoteClient", return_value=mock_client
            ) as MockClient,
            patch("pixie_sdk.components.scanner.rescan_components"),
        ):
            response = client.post(
                "/graphql",
                json={
                    "query": """
                        query GetLabelingHtml($testCaseId: UUID!) {
                            getLabelingHtml(testCaseId: $testCaseId)
                        }
                    """,
                    "variables": {"testCaseId": test_case_id},
                },
                headers={"Authorization": "Bearer my-jwt-token"},
            )
            assert response.status_code == 200
            data = response.json()
            html = data["data"]["getLabelingHtml"]
            assert "window.INPUT=undefined" not in html
            assert "window.INPUT=" in html
            assert '"prompt"' in html
            assert '"hello"' in html

            # Verify auth token forwarded to RemoteClient
            MockClient.assert_called_once_with(auth_token="my-jwt-token")

    def test_no_auth_returns_error(self, client):
        """getLabelingHtml without auth token returns an error."""
        test_case_id = str(uuid4())

        mock_conn = AsyncMock()
        with patch("pixie_sdk.db.get_db", new=AsyncMock(return_value=mock_conn)):
            response = client.post(
                "/graphql",
                json={
                    "query": """
                        query GetLabelingHtml($testCaseId: UUID!) {
                            getLabelingHtml(testCaseId: $testCaseId)
                        }
                    """,
                    "variables": {"testCaseId": test_case_id},
                },
            )
            assert response.status_code == 200
            data = response.json()
            assert data.get("errors")
            assert "Authorization token required" in data["errors"][0]["message"]

    def test_test_case_not_found_returns_error(self, client):
        """getLabelingHtml returns error when test case not on remote."""
        test_case_id = str(uuid4())

        mock_conn = AsyncMock()
        mock_client = AsyncMock()
        mock_client.get_test_case = AsyncMock(return_value=None)

        with (
            patch("pixie_sdk.db.get_db", new=AsyncMock(return_value=mock_conn)),
            patch("pixie_sdk.remote_client.RemoteClient", return_value=mock_client),
        ):
            response = client.post(
                "/graphql",
                json={
                    "query": """
                        query GetLabelingHtml($testCaseId: UUID!) {
                            getLabelingHtml(testCaseId: $testCaseId)
                        }
                    """,
                    "variables": {"testCaseId": test_case_id},
                },
                headers={"Authorization": "Bearer my-jwt-token"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data.get("errors")
            assert "not found on remote" in data["errors"][0]["message"]

    def test_no_labeling_page_returns_error(self, client):
        """getLabelingHtml returns error when no labeling page for suite."""
        test_case_id = str(uuid4())
        test_suite_id = str(uuid4())

        mock_conn = AsyncMock()
        mock_client = AsyncMock()
        mock_client.get_test_case = AsyncMock(
            return_value={"id": test_case_id, "testSuite": test_suite_id}
        )
        mock_client.get_test_suite = AsyncMock(
            return_value={"id": test_suite_id, "name": "Unknown Suite"}
        )

        with (
            patch("pixie_sdk.db.get_db", new=AsyncMock(return_value=mock_conn)),
            patch("pixie_sdk.remote_client.RemoteClient", return_value=mock_client),
            patch("pixie_sdk.components.scanner.rescan_components"),
        ):
            response = client.post(
                "/graphql",
                json={
                    "query": """
                        query GetLabelingHtml($testCaseId: UUID!) {
                            getLabelingHtml(testCaseId: $testCaseId)
                        }
                    """,
                    "variables": {"testCaseId": test_case_id},
                },
                headers={"Authorization": "Bearer my-jwt-token"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data.get("errors")
            assert "No labeling page" in data["errors"][0]["message"]


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
        assert response.status_code == 200

"""Tests for pixie_sdk.server — FastAPI application."""

from __future__ import annotations

import pytest


class TestHealthCheck:
    """Test the health check endpoint."""

    @pytest.mark.asyncio
    async def test_returns_ok(self):
        """GET /health should return {status: ok}."""
        from fastapi.testclient import TestClient
        from pixie_sdk.server import app

        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestGraphQLEndpoint:
    """Test that the GraphQL endpoint is mounted."""

    @pytest.mark.asyncio
    async def test_graphql_reachable(self):
        """POST /graphql should be reachable."""
        from fastapi.testclient import TestClient
        from pixie_sdk.server import app

        client = TestClient(app)
        response = client.post(
            "/graphql",
            json={"query": "{ __typename }"},
        )
        assert response.status_code == 200

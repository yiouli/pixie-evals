"""Stub remote client for calling the pixie-server.

This will be replaced by ariadne-codegen generated code.
For now, we provide minimal stubs for development.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any
from uuid import UUID

import httpx

logger = logging.getLogger(__name__)


def _get_remote_endpoint() -> str:
    """Get the remote pixie-server GraphQL endpoint from env."""
    return os.environ.get("PIXIE_SERVER_URL", "http://localhost:8000/graphql")


def _get_auth_token() -> str | None:
    """Get the auth token from env."""
    return os.environ.get("PIXIE_AUTH_TOKEN")


class RemoteClient:
    """Client for pixie-server GraphQL API."""

    def __init__(
        self,
        endpoint: str | None = None,
        auth_token: str | None = None,
    ) -> None:
        """Initialise the remote client.

        Args:
            endpoint: GraphQL endpoint URL. Defaults to PIXIE_SERVER_URL env var.
            auth_token: JWT bearer token to attach to every request. When
                provided this takes precedence over the PIXIE_AUTH_TOKEN env
                var, allowing the SDK server to forward the token it received
                from the frontend rather than relying on a static env value.
        """
        self.endpoint = endpoint or _get_remote_endpoint()
        # Explicit token wins; fall back to env var so existing usage still works.
        self._auth_token = auth_token if auth_token is not None else _get_auth_token()
        self._client = httpx.AsyncClient(timeout=60.0)

    async def _execute(
        self,
        query: str,
        variables: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute a GraphQL query/mutation against the remote server.

        Args:
            query: The GraphQL query string.
            variables: Optional variables dict.

        Returns:
            The 'data' field of the GraphQL response.

        Raises:
            RuntimeError: If the response contains errors.
        """
        headers: dict[str, str] = {"Content-Type": "application/json"}
        token = self._auth_token
        if token:
            headers["Authorization"] = f"Bearer {token}"

        payload: dict[str, Any] = {"query": query}
        if variables:
            payload["variables"] = variables

        resp = await self._client.post(
            self.endpoint,
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()
        body = resp.json()

        if "errors" in body and body["errors"]:
            error_msgs = "; ".join(e.get("message", str(e)) for e in body["errors"])
            raise RuntimeError(f"GraphQL errors: {error_msgs}")

        return body.get("data", {})

    async def create_test_suite(
        self,
        name: str,
        description: str | None,
        metric_ids: list[UUID],
        input_schema: dict[str, Any],
    ) -> UUID:
        """Create a test suite on the remote server.

        Args:
            name: Test suite name.
            description: Optional description.
            metric_ids: List of metric UUIDs.
            input_schema: JSON schema for test case inputs.

        Returns:
            UUID of the created test suite.
        """
        query = """
        mutation CreateTestSuite($name: String!, $metricIds: [UUID!]!, $config: TestSuiteConfigInput!, $description: String) {
            createTestSuite(name: $name, metricIds: $metricIds, config: $config, description: $description)
        }
        """
        data = await self._execute(
            query,
            variables={
                "name": name,
                "description": description,
                "metricIds": [str(mid) for mid in metric_ids],
                "config": {"inputSchema": input_schema},
            },
        )
        return UUID(data["createTestSuite"])

    async def add_test_cases(
        self,
        test_suite_id: UUID,
        test_cases: list[dict[str, Any]],
    ) -> bool:
        """Add test cases to a test suite.

        Args:
            test_suite_id: UUID of the test suite.
            test_cases: List of test case dicts with input, embedding, etc.

        Returns:
            True if successful.
        """
        query = """
        mutation AddTestCases($testSuiteId: UUID!, $testCases: [TestCaseWithLabelInput!]!) {
            addTestCases(testSuiteId: $testSuiteId, testCases: $testCases)
        }
        """
        tc_inputs = [
            {
                "embedding": tc["embedding"],
                "description": tc.get("description"),
            }
            for tc in test_cases
        ]
        await self._execute(
            query,
            variables={
                "testSuiteId": str(test_suite_id),
                "testCases": tc_inputs,
            },
        )
        return True

    async def get_evaluator_with_signature(
        self,
        test_suite_id: UUID,
    ) -> dict[str, Any] | None:
        """Get the evaluator signature and saved program for a test suite.

        Args:
            test_suite_id: UUID of the test suite.

        Returns:
            Dict with input_schema, output_schema, saved_program, or None.
        """
        query = """
        query GetEvaluatorWithSignature($testSuiteId: UUID!) {
            getEvaluatorWithSignature(testSuiteId: $testSuiteId) {
                inputSchema
                outputSchema
                savedProgram
            }
        }
        """
        data = await self._execute(
            query,
            variables={"testSuiteId": str(test_suite_id)},
        )
        result = data.get("getEvaluatorWithSignature")
        if not result:
            return None

        return {
            "input_schema": result["inputSchema"],
            "output_schema": result["outputSchema"],
            "saved_program": result.get("savedProgram"),
        }

    async def label_test_cases(
        self,
        test_suite_id: UUID,
        labels: list[dict[str, Any]],
    ) -> list[str]:
        """Submit labels for test cases on the remote server.

        Args:
            test_suite_id: UUID of the test suite.
            labels: List of label dicts with test_case_id, labels (metric_id, value), notes, metadata.

        Returns:
            List of created label IDs.
        """
        query = """
        mutation LabelTestCases($testSuiteId: UUID!, $labels: [LabelDetailsInput!]!) {
            labelTestCases(testSuiteId: $testSuiteId, labels: $labels)
        }
        """
        gql_labels = [
            {
                "testCaseId": str(lbl["test_case_id"]),
                "labels": [
                    {
                        "metricId": str(ml["metric_id"]),
                        "value": ml["value"],
                    }
                    for ml in lbl["labels"]
                ],
                "notes": lbl.get("notes"),
                "metadata": lbl.get("metadata"),
            }
            for lbl in labels
        ]
        data = await self._execute(
            query,
            variables={
                "testSuiteId": str(test_suite_id),
                "labels": gql_labels,
            },
        )
        return data.get("labelTestCases", [])

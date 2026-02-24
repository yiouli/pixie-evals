"""Stub remote client for calling the pixie-server.

This will be replaced by ariadne-codegen generated code.
For now, we provide minimal stubs for development.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID


class RemoteClient:
    """Stub client for pixie-server GraphQL API."""

    def __init__(self, endpoint: str):
        self.endpoint = endpoint

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
        # TODO: Implement with ariadne-codegen generated client
        raise NotImplementedError("Remote client not yet generated")

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
        # TODO: Implement with ariadne-codegen generated client
        raise NotImplementedError("Remote client not yet generated")

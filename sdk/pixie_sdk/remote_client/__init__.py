"""Remote client for calling the pixie-server GraphQL API.

This module provides :class:`RemoteClient`, a thin convenience wrapper
around the ariadne-codegen-generated :class:`PixieServerClient`.  It adds
a familiar ``(endpoint, auth_token=)`` constructor that the rest of the SDK
code-base already uses and exposes high-level helper methods that return
plain dicts for backward compatibility with existing callers.

The generated types (Pydantic models, input classes) are re-exported from
``pixie_sdk.remote_client.generated`` so callers can gradually migrate to
the fully-typed interface.

To regenerate the underlying client after changing the pixie-server schema::

    # 1. Fetch the latest schema (requires a running pixie-server)
    npx get-graphql-schema http://localhost:8000/graphql > sdk/remote_client/schema.graphql

    # 2. Run ariadne-codegen
    cd sdk && uv run ariadne-codegen
"""

from __future__ import annotations

import logging
import os
from typing import Any
from uuid import UUID

from pixie_sdk.remote_client.generated import (  # noqa: F401 – re-export
    LabelDetailsInput,
    MetricLabelInputGql,
    PixieServerClient,
    TestCaseWithLabelInput,
    TestSuiteConfigInput,
)

logger = logging.getLogger(__name__)


def _get_remote_endpoint() -> str:
    """Get the remote pixie-server GraphQL endpoint from env."""
    return os.environ.get("PIXIE_SERVER_URL", "http://localhost:8000/graphql")


class RemoteClient:
    """High-level async client for the remote pixie-server.

    Wraps the ariadne-codegen-generated :class:`PixieServerClient` with a
    convenience constructor and dict-returning helper methods so existing
    callers continue to work without changes.

    New code should prefer using the generated client directly::

        from pixie_sdk.remote_client.generated import PixieServerClient

    Args:
        endpoint: GraphQL endpoint URL.  Falls back to ``PIXIE_SERVER_URL``
            env var, then ``http://localhost:8000/graphql``.
        auth_token: JWT bearer token attached to every request.
    """

    def __init__(
        self,
        endpoint: str | None = None,
        *,
        auth_token: str | None = None,
    ) -> None:
        self.endpoint = endpoint or _get_remote_endpoint()
        self._auth_token = auth_token or os.environ.get("PIXIE_AUTH_TOKEN")
        headers: dict[str, str] = {}
        if self._auth_token:
            headers["Authorization"] = f"Bearer {self._auth_token}"
        self._client = PixieServerClient(url=self.endpoint, headers=headers)

    # ------------------------------------------------------------------
    # Query helpers (dict returns for backward compat)
    # ------------------------------------------------------------------

    async def get_test_case(
        self,
        test_case_id: UUID,
    ) -> dict[str, Any] | None:
        """Fetch a single test case by ID from the remote server.

        Args:
            test_case_id: UUID of the test case.

        Returns:
            Dict with ``id``, ``testSuite``, ``description``, ``createdAt``,
            or ``None`` if not found.
        """
        result = await self._client.get_test_cases_with_label(
            ids=[str(test_case_id)],
        )
        items = result.get_test_cases_with_label
        if items:
            tc = items[0].test_case
            return {
                "id": tc.id,
                "testSuite": tc.test_suite,
                "description": tc.description,
                "createdAt": tc.created_at,
            }
        return None

    async def get_test_suite(
        self,
        test_suite_id: UUID,
    ) -> dict[str, Any] | None:
        """Fetch a single test suite by ID from the remote server.

        Args:
            test_suite_id: UUID of the test suite.

        Returns:
            Dict with ``id``, ``name``, ``description``, ``config``,
            or ``None`` if not found.
        """
        result = await self._client.list_test_suites()
        target = str(test_suite_id)
        for suite in result.list_test_suites:
            if suite.id == target:
                return {
                    "id": suite.id,
                    "name": suite.name,
                    "description": suite.description,
                    "config": suite.config,
                }
        return None

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
        config = TestSuiteConfigInput(inputSchema=input_schema)
        result = await self._client.create_test_suite(
            name=name,
            metric_ids=[str(mid) for mid in metric_ids],
            config=config,
            description=description,
        )
        return UUID(result.create_test_suite)

    async def add_test_cases(
        self,
        test_suite_id: UUID,
        test_cases: list[dict[str, Any]],
    ) -> list[str]:
        """Add test cases to a test suite.

        Args:
            test_suite_id: UUID of the test suite.
            test_cases: List of test case dicts with ``embedding``,
                optional ``description``.

        Returns:
            List of remote test case UUID strings.
        """
        tc_inputs = [
            TestCaseWithLabelInput(
                embedding=tc["embedding"],
                description=tc.get("description"),
            )
            for tc in test_cases
        ]
        result = await self._client.add_test_cases(
            test_suite_id=str(test_suite_id),
            test_cases=tc_inputs,
        )
        return result.add_test_cases

    async def get_evaluator_with_signature(
        self,
        test_suite_id: UUID,
    ) -> dict[str, Any] | None:
        """Get the evaluator signature and saved program for a test suite.

        Args:
            test_suite_id: UUID of the test suite.

        Returns:
            Dict with ``input_schema``, ``output_schema``, ``saved_program``,
            or ``None``.
        """
        result = await self._client.get_evaluator_with_signature(
            test_suite_id=str(test_suite_id),
        )
        sig = result.get_evaluator_with_signature
        if not sig:
            return None
        return {
            "input_schema": sig.input_schema,
            "output_schema": sig.output_schema,
            "saved_program": sig.saved_program,
        }

    async def label_test_cases(
        self,
        test_suite_id: UUID,
        labels: list[dict[str, Any]],
    ) -> list[str]:
        """Submit labels for test cases on the remote server.

        Args:
            test_suite_id: UUID of the test suite.
            labels: List of label dicts with ``test_case_id``, ``labels``
                (each with ``metric_id``, ``value``), optional ``notes``,
                ``metadata``.

        Returns:
            List of created label IDs.
        """
        gql_labels = [
            LabelDetailsInput(
                testCaseId=str(lbl["test_case_id"]),
                labels=[
                    MetricLabelInputGql(
                        metricId=str(ml["metric_id"]),
                        value=ml["value"],
                    )
                    for ml in lbl["labels"]
                ],
                notes=lbl.get("notes"),
                metadata=lbl.get("metadata"),
            )
            for lbl in labels
        ]
        result = await self._client.label_test_cases(
            test_suite_id=str(test_suite_id),
            labels=gql_labels,
        )
        return result.label_test_cases

    async def get_manual_labels_after_cutoff(
        self,
        test_suite_id: UUID,
    ) -> list[dict[str, Any]]:
        """Get test cases with manual labels after the latest optimization cutoff.

        Args:
            test_suite_id: UUID of the test suite.

        Returns:
            List of dicts with ``testCase`` and ``label`` keys.
        """
        result = await self._client.get_manual_labels_after_cutoff(
            test_suite_id=str(test_suite_id),
        )
        items: list[dict[str, Any]] = []
        for entry in result.get_manual_labels_after_cutoff:
            tc = entry.test_case
            item: dict[str, Any] = {
                "testCase": {
                    "id": tc.id,
                    "description": tc.description,
                    "testSuite": tc.test_suite,
                    "createdAt": tc.created_at,
                },
            }
            if entry.label:
                lbl = entry.label
                item["label"] = {
                    "id": lbl.id,
                    "metric": lbl.metric,
                    "testCase": lbl.test_case,
                    "value": lbl.value,
                    "labeledAt": lbl.labeled_at,
                    "labeler": lbl.labeler,
                    "notes": lbl.notes,
                    "metadata": lbl.metadata,
                }
            else:
                item["label"] = None
            items.append(item)
        return items

    async def get_optimization_label_stats(
        self,
        test_suite_id: UUID,
    ) -> dict[str, Any]:
        """Get label counts before and after the latest optimization cutoff.

        Args:
            test_suite_id: UUID of the test suite.

        Returns:
            Dict with ``before_cutoff``, ``after_cutoff``, ``cutoff_date``.
        """
        result = await self._client.get_optimization_label_stats(
            test_suite_id=str(test_suite_id),
        )
        stats = result.get_optimization_label_stats
        return {
            "before_cutoff": stats.before_cutoff,
            "after_cutoff": stats.after_cutoff,
            "cutoff_date": stats.cutoff_date,
        }

    async def create_evaluator(
        self,
        test_suite_id: UUID,
        program_json: str,
        training_cutoff: str,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Create an optimized evaluator on the remote server.

        Args:
            test_suite_id: UUID of the test suite.
            program_json: Serialised DSPy program JSON string.
            training_cutoff: ISO format cutoff datetime string.
            metadata: Optional metadata dict.

        Returns:
            UUID string of the created evaluator.
        """
        result = await self._client.create_evaluator(
            test_suite_id=str(test_suite_id),
            program_json=program_json,
            training_cutoff=training_cutoff,
            metadata=metadata,
        )
        return result.create_evaluator

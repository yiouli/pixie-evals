"""Tests for the optimize_evaluator subscription."""

from __future__ import annotations

import json
import sys
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from pixie_sdk.graphql import (
    OptimizationStatus,
    OptimizationUpdate,
    Subscription,
)

# Pre-import the remote_client module so patch.object works reliably
import pixie_sdk.remote_client as _rc_module

# ============================================================================
# Mock dspy module (not installed in test env)
# ============================================================================


def _make_mock_dspy() -> MagicMock:
    """Create a mock dspy module with Signature, InputField, OutputField, etc."""
    mock_dspy = MagicMock()

    class _FakeSignature:
        pass

    mock_dspy.Signature = _FakeSignature
    mock_dspy.InputField = MagicMock(side_effect=lambda desc="": f"InputField({desc})")
    mock_dspy.OutputField = MagicMock(
        side_effect=lambda desc="": f"OutputField({desc})"
    )
    mock_dspy.ChainOfThought = MagicMock()
    mock_dspy.LM = MagicMock()

    # BootstrapFewShot returns an optimizer with a compile method
    mock_optimizer = MagicMock()
    mock_optimized_module = MagicMock()
    mock_optimized_module.save = MagicMock(
        side_effect=lambda path: _write_mock_program(path)
    )
    mock_optimizer.compile = MagicMock(return_value=mock_optimized_module)
    mock_dspy.BootstrapFewShot = MagicMock(return_value=mock_optimizer)

    # dspy.Example
    class _FakeExample:
        def __init__(self, **kwargs: Any) -> None:
            for k, v in kwargs.items():
                setattr(self, k, v)
            self._input_keys: set[str] = set()

        def with_inputs(self, *keys: str) -> "_FakeExample":
            self._input_keys = set(keys)
            return self

    mock_dspy.Example = _FakeExample

    # dspy.context returns a context manager
    mock_dspy.context = MagicMock(
        return_value=MagicMock(__enter__=MagicMock(), __exit__=MagicMock())
    )

    return mock_dspy


def _write_mock_program(path: str) -> None:
    """Write a mock program JSON file."""
    with open(path, "w") as f:
        json.dump({"state": {"demos": []}}, f)


@pytest.fixture()
def mock_dspy():
    """Fixture that injects a mock dspy into sys.modules."""
    mock = _make_mock_dspy()
    with patch.dict(sys.modules, {"dspy": mock}):
        yield mock


@pytest.fixture()
def mock_dotenv():
    """Fixture that mocks dotenv.load_dotenv."""
    with patch.dict(sys.modules, {"dotenv": MagicMock()}):
        yield


# ============================================================================
# Helpers
# ============================================================================


def _mock_info() -> MagicMock:
    """Create a mock Strawberry Info."""
    info = MagicMock()
    info.context = {"db": AsyncMock()}
    return info


def _make_labeled_item(
    tc_id: str | None = None,
    metric_id: str | None = None,
    description: str | None = None,
    value: Any = "good",
) -> dict[str, Any]:
    """Create a labeled test case item as returned by remote client."""
    return {
        "testCase": {
            "id": tc_id or str(uuid4()),
            "description": description or json.dumps({"prompt": "hello"}),
            "testSuite": str(uuid4()),
            "createdAt": "2024-01-01T00:00:00Z",
        },
        "label": {
            "id": str(uuid4()),
            "metric": metric_id or str(uuid4()),
            "testCase": tc_id or str(uuid4()),
            "value": value,
            "labeledAt": "2024-01-15T00:00:00Z",
            "labeler": str(uuid4()),
            "notes": None,
            "metadata": None,
        },
    }


def _make_evaluator_data(
    input_schema: dict | None = None,
    output_schema: dict | None = None,
) -> dict[str, Any]:
    """Create evaluator data as returned by remote client."""
    return {
        "input_schema": input_schema or {"properties": {"prompt": {"type": "string"}}},
        "output_schema": output_schema
        or {
            "properties": {
                "score": {
                    "type": "string",
                    "description": "Quality score",
                }
            }
        },
        "saved_program": None,
    }


# ============================================================================
# OptimizationUpdate type
# ============================================================================


class TestOptimizationUpdateType:
    """Test the OptimizationUpdate Strawberry type."""

    def test_defaults(self):
        update = OptimizationUpdate(
            status=OptimizationStatus.LOADING,
            message="test",
            progress=0.0,
        )
        assert update.evaluator_id is None

    def test_with_evaluator_id(self):
        eid = str(uuid4())
        update = OptimizationUpdate(
            status=OptimizationStatus.COMPLETE,
            message="done",
            progress=1.0,
            evaluator_id=eid,
        )
        assert update.evaluator_id == eid


# ============================================================================
# optimize_evaluator subscription
# ============================================================================


class TestOptimizeEvaluator:
    """Tests for the optimize_evaluator subscription."""

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql._get_auth_token_from_context", return_value="tok")
    @patch("pixie_sdk.graphql.os.environ", {"PIXIE_SERVER_URL": "http://test/graphql"})
    async def test_error_when_no_labels(self, _mock_auth, mock_dspy, mock_dotenv):
        """Should yield ERROR when no manual labels are found."""
        mock_client = AsyncMock()
        mock_client.get_manual_labels_after_cutoff = AsyncMock(return_value=[])

        with patch.object(_rc_module, "RemoteClient", return_value=mock_client):
            sub = Subscription()
            updates: list[OptimizationUpdate] = []
            async for update in sub.optimize_evaluator(_mock_info(), uuid4()):
                updates.append(update)

        # Should end with ERROR
        assert updates[-1].status == OptimizationStatus.ERROR
        assert "No manual labels" in updates[-1].message

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql._get_auth_token_from_context", return_value="tok")
    @patch("pixie_sdk.graphql.os.environ", {"PIXIE_SERVER_URL": "http://test/graphql"})
    async def test_error_when_no_evaluator(self, _mock_auth, mock_dspy, mock_dotenv):
        """Should yield ERROR when no evaluator is found."""
        tc_id = str(uuid4())
        metric_id = str(uuid4())
        mock_client = AsyncMock()
        mock_client.get_manual_labels_after_cutoff = AsyncMock(
            return_value=[_make_labeled_item(tc_id=tc_id, metric_id=metric_id)]
        )
        mock_client.get_evaluator_with_signature = AsyncMock(return_value=None)

        with patch.object(_rc_module, "RemoteClient", return_value=mock_client):
            sub = Subscription()
            updates: list[OptimizationUpdate] = []
            async for update in sub.optimize_evaluator(_mock_info(), uuid4()):
                updates.append(update)

        assert updates[-1].status == OptimizationStatus.ERROR
        assert "No evaluator" in updates[-1].message

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql._get_auth_token_from_context", return_value="tok")
    @patch("pixie_sdk.graphql.os.environ", {"PIXIE_SERVER_URL": "http://test/graphql"})
    async def test_successful_optimization(self, _mock_auth, mock_dspy, mock_dotenv):
        """Should complete full optimization pipeline and create evaluator."""
        tc_id = str(uuid4())
        metric_id = str(uuid4())
        evaluator_id = str(uuid4())

        mock_client = AsyncMock()
        mock_client.get_manual_labels_after_cutoff = AsyncMock(
            return_value=[
                _make_labeled_item(
                    tc_id=tc_id,
                    metric_id=metric_id,
                    description=json.dumps({"prompt": "test question"}),
                    value="excellent",
                ),
            ]
        )
        mock_client.get_evaluator_with_signature = AsyncMock(
            return_value=_make_evaluator_data(
                output_schema={
                    "properties": {
                        metric_id: {"type": "string", "description": "Score"}
                    }
                }
            )
        )
        mock_client.create_evaluator = AsyncMock(return_value=evaluator_id)

        with patch.object(_rc_module, "RemoteClient", return_value=mock_client):
            sub = Subscription()
            updates: list[OptimizationUpdate] = []
            async for update in sub.optimize_evaluator(_mock_info(), uuid4()):
                updates.append(update)

        # Should end with COMPLETE and evaluator_id
        assert updates[-1].status == OptimizationStatus.COMPLETE
        assert updates[-1].evaluator_id == evaluator_id

        # Verify create_evaluator was called
        mock_client.create_evaluator.assert_awaited_once()
        call_kwargs = mock_client.create_evaluator.call_args
        assert "program_json" in call_kwargs.kwargs or len(call_kwargs.args) >= 2

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql._get_auth_token_from_context", return_value="tok")
    @patch("pixie_sdk.graphql.os.environ", {"PIXIE_SERVER_URL": "http://test/graphql"})
    async def test_yields_progress_updates(self, _mock_auth, mock_dspy, mock_dotenv):
        """Should yield multiple progress updates throughout optimization."""
        tc_id = str(uuid4())
        metric_id = str(uuid4())

        mock_client = AsyncMock()
        mock_client.get_manual_labels_after_cutoff = AsyncMock(
            return_value=[
                _make_labeled_item(tc_id=tc_id, metric_id=metric_id),
            ]
        )
        mock_client.get_evaluator_with_signature = AsyncMock(
            return_value=_make_evaluator_data(
                output_schema={
                    "properties": {
                        metric_id: {"type": "string", "description": "Score"}
                    }
                }
            )
        )
        mock_client.create_evaluator = AsyncMock(return_value=str(uuid4()))

        with patch.object(_rc_module, "RemoteClient", return_value=mock_client):
            sub = Subscription()
            updates: list[OptimizationUpdate] = []
            async for update in sub.optimize_evaluator(_mock_info(), uuid4()):
                updates.append(update)

        # Should have multiple updates with increasing progress
        assert len(updates) >= 4
        statuses = [u.status for u in updates]
        assert OptimizationStatus.LOADING in statuses
        assert OptimizationStatus.PREPARING in statuses
        assert OptimizationStatus.OPTIMIZING in statuses
        assert OptimizationStatus.COMPLETE in statuses

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql._get_auth_token_from_context", return_value="tok")
    @patch("pixie_sdk.graphql.os.environ", {"PIXIE_SERVER_URL": "http://test/graphql"})
    async def test_multiple_labels_per_test_case(
        self, _mock_auth, mock_dspy, mock_dotenv
    ):
        """Should group labels by test case when building examples."""
        tc_id = str(uuid4())
        metric_a = str(uuid4())
        metric_b = str(uuid4())
        desc = json.dumps({"prompt": "hello"})

        mock_client = AsyncMock()
        mock_client.get_manual_labels_after_cutoff = AsyncMock(
            return_value=[
                _make_labeled_item(
                    tc_id=tc_id, metric_id=metric_a, description=desc, value="good"
                ),
                _make_labeled_item(
                    tc_id=tc_id, metric_id=metric_b, description=desc, value="5"
                ),
            ]
        )
        mock_client.get_evaluator_with_signature = AsyncMock(
            return_value=_make_evaluator_data(
                output_schema={
                    "properties": {
                        metric_a: {"type": "string"},
                        metric_b: {"type": "string"},
                    }
                }
            )
        )
        mock_client.create_evaluator = AsyncMock(return_value=str(uuid4()))

        with patch.object(_rc_module, "RemoteClient", return_value=mock_client):
            sub = Subscription()
            updates: list[OptimizationUpdate] = []
            async for update in sub.optimize_evaluator(_mock_info(), uuid4()):
                updates.append(update)

        assert updates[-1].status == OptimizationStatus.COMPLETE
        # BootstrapFewShot.compile should have been called with a trainset
        compile_call = mock_dspy.BootstrapFewShot.return_value.compile
        compile_call.assert_called_once()
        # The trainset should have 1 example (2 labels, same test case)
        trainset = compile_call.call_args.kwargs.get(
            "trainset", compile_call.call_args[1].get("trainset")
        )
        assert len(trainset) == 1

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql._get_auth_token_from_context", return_value="tok")
    @patch("pixie_sdk.graphql.os.environ", {"PIXIE_SERVER_URL": "http://test/graphql"})
    async def test_error_handling(self, _mock_auth, mock_dspy, mock_dotenv):
        """Should yield ERROR on unexpected exceptions."""
        mock_client = AsyncMock()
        mock_client.get_manual_labels_after_cutoff = AsyncMock(
            side_effect=RuntimeError("Network error")
        )

        with patch.object(_rc_module, "RemoteClient", return_value=mock_client):
            sub = Subscription()
            updates: list[OptimizationUpdate] = []
            async for update in sub.optimize_evaluator(_mock_info(), uuid4()):
                updates.append(update)

        assert updates[-1].status == OptimizationStatus.ERROR
        assert "Network error" in updates[-1].message

    @pytest.mark.asyncio
    @patch("pixie_sdk.graphql._get_auth_token_from_context", return_value="tok")
    @patch("pixie_sdk.graphql.os.environ", {"PIXIE_SERVER_URL": "http://test/graphql"})
    async def test_metadata_includes_optimizer_info(
        self, _mock_auth, mock_dspy, mock_dotenv
    ):
        """Should include optimizer metadata when creating evaluator."""
        tc_id = str(uuid4())
        metric_id = str(uuid4())

        mock_client = AsyncMock()
        mock_client.get_manual_labels_after_cutoff = AsyncMock(
            return_value=[
                _make_labeled_item(tc_id=tc_id, metric_id=metric_id),
            ]
        )
        mock_client.get_evaluator_with_signature = AsyncMock(
            return_value=_make_evaluator_data(
                output_schema={
                    "properties": {
                        metric_id: {"type": "string", "description": "Score"}
                    }
                }
            )
        )
        mock_client.create_evaluator = AsyncMock(return_value=str(uuid4()))

        with patch.object(_rc_module, "RemoteClient", return_value=mock_client):
            sub = Subscription()
            updates: list[OptimizationUpdate] = []
            async for update in sub.optimize_evaluator(_mock_info(), uuid4()):
                updates.append(update)

        # Verify metadata was passed to create_evaluator
        call_kwargs = mock_client.create_evaluator.call_args.kwargs
        assert "metadata" in call_kwargs
        metadata = call_kwargs["metadata"]
        assert metadata["optimizer"] == "BootstrapFewShot"
        assert metadata["training_examples"] == 1

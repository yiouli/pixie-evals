# Evaluator Optimization Feature

**Date:** 2026-02-27
**Spec:** [specs/evaluator_optimization.md](../specs/evaluator_optimization.md)
**Repos:** pixie-server, pixie-evals (SDK + frontend)

---

## Summary

Implements end-to-end evaluator optimization using DSPy BootstrapFewShot. Users can accumulate manual labels, then trigger optimization from the frontend. The SDK server fetches training data from pixie-server, runs DSPy optimization, and saves the resulting evaluator back to the remote server — all with real-time progress updates via GraphQL subscription.

---

## pixie-server

### Database Schema

- **`evaluators` table** — added `training_cutoff` column (`Timestamp`, nullable) to track the cutoff datetime for training examples used during optimization.

### GraphQL API

#### New Queries

| Query | Args | Returns | Description |
|---|---|---|---|
| `getManualLabelsAfterCutoff` | `testSuiteId: UUID!` | `[TestCaseWithLabelType]` | Fetches test cases with manual labels (labeler is not null) created after the latest evaluator's `training_cutoff` for the given test suite. |
| `getOptimizationLabelStats` | `testSuiteId: UUID!` | `OptimizationLabelStats` | Returns counts of manually-labeled test cases before and after the latest optimization cutoff, plus the cutoff date. Used by the frontend to enable/disable the optimize button. |

#### New Types

| Type | Fields |
|---|---|
| `OptimizationLabelStats` | `beforeCutoff: Int!`, `afterCutoff: Int!`, `cutoffDate: DateTime` |

#### Modified Types

| Type | Change |
|---|---|
| `EvaluatorType` | Added `trainingCutoff: DateTime` field |

#### Modified Mutations

| Mutation | Before | After |
|---|---|---|
| `createEvaluator` | Accepted `name`, `testSuiteId`, `metricIds`, `storagePath`, `description` | Now accepts `testSuiteId`, `programJson`, `trainingCutoff`, `metadata`. Internally generates the evaluator name (`<suite_name>_<YYYYMMDD_HHMMSS>`), uploads the program JSON to Supabase, and serializes metadata as the description. |

### DB Functions (db.py)

| Function | Description |
|---|---|
| `create_evaluator_from_program()` | Creates an evaluator from a DSPy program JSON: generates name, uploads to Supabase, resolves metric IDs, delegates to `create_evaluator()`. |
| `_get_latest_training_cutoff()` | Returns the most recent `training_cutoff` across all evaluators for a test suite. |
| `get_manual_labels_after_cutoff()` | Returns test cases with manual labels after the latest cutoff, deduplicated by test case (latest label wins). |
| `get_optimization_label_stats()` | Returns `{before_cutoff, after_cutoff, cutoff_date}` counts of unique manually-labeled test cases split by the cutoff. |

### Files Changed

| File | Change |
|---|---|
| `pixie_server/tables.py` | Added `training_cutoff` column to `Evaluator` |
| `pixie_server/graphql.py` | Added `OptimizationLabelStats` type, new query resolvers, modified `createEvaluator` mutation, updated `EvaluatorType` and `evaluator_to_type` converter |
| `pixie_server/db.py` | Added `create_evaluator_from_program`, `_get_latest_training_cutoff`, `get_manual_labels_after_cutoff`, `get_optimization_label_stats`; updated `create_evaluator` to accept `training_cutoff` |
| `tests/test_evaluator_optimization.py` | **New** — 17 tests covering all new GraphQL resolvers and DB functions |
| `tests/test_graphql.py` | Added `training_cutoff: None` to evaluator mock dict |

### Test Results

- **193 tests pass**, 0 failures
- **mypy** clean (0 errors)

---

## pixie-evals SDK

### GraphQL Schema

#### New Subscription

| Subscription | Args | Yields | Description |
|---|---|---|---|
| `optimizeEvaluator` | `testSuiteId: UUID!` | `OptimizationUpdate` | Runs the full optimization pipeline with real-time progress updates. |

#### New Types

| Type | Fields |
|---|---|
| `OptimizationStatus` (enum) | `LOADING`, `PREPARING`, `OPTIMIZING`, `SAVING`, `COMPLETE`, `ERROR` |
| `OptimizationUpdate` | `status: OptimizationStatus!`, `message: String!`, `progress: Float!`, `evaluatorId: String` |

### Optimization Pipeline (`optimize_evaluator`)

1. **LOADING** — Fetches manual labels after cutoff from pixie-server via `RemoteClient.get_manual_labels_after_cutoff()`
2. **LOADING** — Loads the current evaluator module via `_load_evaluator_module()` (shared helper)
3. **PREPARING** — Parses test case descriptions as input data, groups labels by test case, builds `dspy.Example` objects with input keys marked
4. **OPTIMIZING** — Runs `dspy.BootstrapFewShot` with a metric function that compares predicted vs. expected output fields
5. **SAVING** — Serializes the optimized module to JSON, calls `RemoteClient.create_evaluator()` with the program, cutoff timestamp, and metadata
6. **COMPLETE** — Returns the new evaluator UUID

### Refactoring

- Extracted `_load_evaluator_module()` helper from `evaluate_dataset` subscription — loads evaluator signature, builds DSPy module, applies saved state. Now shared between `evaluate_dataset` and `optimize_evaluator`.

### RemoteClient (remote_client/__init__.py)

| New Method | Description |
|---|---|
| `get_manual_labels_after_cutoff(test_suite_id)` | Queries `getManualLabelsAfterCutoff` on pixie-server |
| `get_optimization_label_stats(test_suite_id)` | Queries `getOptimizationLabelStats` on pixie-server |
| `create_evaluator(test_suite_id, program_json, training_cutoff, metadata)` | Calls the modified `createEvaluator` mutation on pixie-server |

### Files Changed

| File | Change |
|---|---|
| `sdk/pixie_sdk/graphql.py` | Added `OptimizationStatus` enum, `OptimizationUpdate` type, `_load_evaluator_module()` helper, `optimize_evaluator` subscription; refactored `evaluate_dataset` to use the shared helper |
| `sdk/pixie_sdk/remote_client/__init__.py` | Added `get_manual_labels_after_cutoff`, `get_optimization_label_stats`, `create_evaluator` methods |
| `sdk/tests/test_optimize_evaluator.py` | **New** — 9 tests covering error paths, success flow, progress updates, multi-label grouping, metadata, and error handling |

### Test Results

- **106 SDK tests pass**, 0 failures

---

## pixie-evals Frontend

### New Components

| Component | Description |
|---|---|
| `OptimizationDialog` | Progress dialog that subscribes to `optimizeEvaluator` via Apollo `useSubscription`. Shows status chips (Complete/Error), progress bar, and status messages. Uses the generated `OptimizationStatus` enum for type-safe status checks. |

### Modified Components

| Component | Change |
|---|---|
| `TestSuiteView` | Added "Optimize Evaluator" button with `AutoFixHighRoundedIcon`. Button is disabled until `afterCutoff > max(5, 0.2 * beforeCutoff)`. Tooltip explains the threshold when disabled. Opens `OptimizationDialog` on click. |

### GraphQL Operations

| File | Operation | Type |
|---|---|---|
| `graphql/remote/query.ts` | `GET_OPTIMIZATION_LABEL_STATS` | Query |
| `graphql/sdk/subscription.ts` | `OPTIMIZE_EVALUATOR` | Subscription |

### Generated Types (via `pnpm codegen`)

- `GetOptimizationLabelStatsQuery` / `GetOptimizationLabelStatsQueryVariables` (remote)
- `OptimizationLabelStats` (remote)
- `OptimizeEvaluatorSubscription` / `OptimizeEvaluatorSubscriptionVariables` (SDK)
- `OptimizationStatus` enum, `OptimizationUpdate` (SDK)

All types are consumed from `generated/` — no manual `DocumentNode` casts or hand-written GraphQL types.

### Files Changed

| File | Change |
|---|---|
| `frontend/src/components/OptimizationDialog.tsx` | **New** — optimization progress dialog |
| `frontend/src/components/OptimizationDialog.test.tsx` | **New** — 11 tests (rendering, button behavior, subscription data, status phases, state reset) |
| `frontend/src/components/TestSuiteView.tsx` | Added optimize button with enable logic and dialog integration |
| `frontend/src/graphql/remote/query.ts` | Added `GET_OPTIMIZATION_LABEL_STATS` query |
| `frontend/src/graphql/sdk/subscription.ts` | Added `OPTIMIZE_EVALUATOR` subscription |
| `frontend/src/generated/remote/*` | Regenerated via `pnpm codegen` |
| `frontend/src/generated/sdk/*` | Regenerated via `pnpm codegen` |

### Test Results

- **232 frontend tests pass**, 0 failures
- **TypeScript** clean (0 errors via `tsc --noEmit`)

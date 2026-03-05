# AI Dataset Generation — End-to-End Wiring

## What Changed

Wired the AI-powered dataset generation feature end-to-end across all three repos:

### pixie-server

- Updated `require_auth` in `graphql.py` to support WebSocket authentication via `connection_params` (Bearer token fallback for subscriptions).

### SDK Server (pixie-evals/sdk)

- Added `create_dataset` mutation to create a local dataset record directly (without file upload), for use by the generation workflow.
- Added `add_data_entry` mutation to add a single data entry to an existing local dataset, enabling incremental entry insertion as entries are generated.
- Both mutations reuse existing `db.create_dataset` and `db.create_data_entries` helpers (no duplication).

### Frontend (pixie-evals/frontend)

- Added `REMOTE_SERVER_WS_URL` environment variable for WebSocket connections to the remote server.
- Added WebSocket split link for `remoteClient` Apollo client (was HTTP-only, now supports subscriptions via graphql-ws).
- Created `graphql/remote/subscription.ts` with `GENERATE_DATASET` subscription.
- Added `SEND_DATASET_GENERATION_FEEDBACK` and `ADD_TEST_CASES` mutations to `graphql/remote/mutation.ts`.
- Added `CREATE_DATASET` and `ADD_DATA_ENTRY` mutations to `graphql/sdk/mutation.ts`.
- Ran GraphQL codegen to generate TypeScript types for all new operations.
- Created `GenerateDatasetDialog` component with full workflow:
  1. Input form (name, size, description)
  2. Remote subscription for AI generation progress
  3. Plan review with approve/feedback interaction
  4. Creates local dataset via SDK after plan approval
  5. Adds entries to local SDK dataset and remote test suite as they generate
  6. Progress tracking with status chips, progress bar, and entry counters
- Wired the dialog into `TestSuiteView` with a "Generate Dataset" action button.

## Files Affected

### pixie-server

- `pixie_server/graphql.py` — `require_auth` WebSocket auth fallback
- `pixie_server/server.py` — Updated docstring
- `tests/test_graphql.py` — 2 new WS auth tests

### pixie-evals/sdk

- `pixie_sdk/graphql.py` — `create_dataset` and `add_data_entry` mutations
- `tests/test_graphql.py` — 4 new mutation tests

### pixie-evals/frontend

- `src/lib/env.ts` — `REMOTE_SERVER_WS_URL`
- `src/lib/apolloClient.ts` — Remote WS link with split routing
- `src/graphql/remote/subscription.ts` — New file: `GENERATE_DATASET`
- `src/graphql/remote/mutation.ts` — `SEND_DATASET_GENERATION_FEEDBACK`, `ADD_TEST_CASES`
- `src/graphql/sdk/mutation.ts` — `CREATE_DATASET`, `ADD_DATA_ENTRY`
- `src/generated/remote/` — Regenerated types
- `src/generated/sdk/` — Regenerated types
- `src/components/GenerateDatasetDialog.tsx` — New dialog component
- `src/components/GenerateDatasetDialog.test.tsx` — 7 tests
- `src/components/TestSuiteView.tsx` — Wired in dialog + button
- `src/components/TestSuiteView.test.tsx` — Added mocks for new dependencies

## Migration Notes

- New environment variable `VITE_REMOTE_SERVER_WS_URL` (defaults to `ws://localhost:8000/graphql`).
- Pixie-server must now support WebSocket connections for subscriptions (uses Strawberry's built-in graphql-ws support).
- The `addTestCases` mutation is called with an empty `embedding` array for generated entries; the server should handle embedding computation or accept empty embeddings.

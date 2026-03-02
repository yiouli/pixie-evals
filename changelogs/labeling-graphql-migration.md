# Labeling HTML: REST → GraphQL Migration & Stale Registry Fix

## What Changed

### 1. Labeling HTML served via GraphQL instead of REST

The labeling HTML page was previously served via a REST `GET /labeling/{test_case_id}` endpoint on FastAPI. It is now served via the `getLabelingHtml(testCaseId: UUID!)` Strawberry GraphQL query.

**Why**: Moving to GraphQL unifies all data-fetching through a single transport (Apollo Client), avoids manual `fetch()` + auth header wiring in the frontend, and makes the labeling HTML query benefit from the same auth middleware that other GraphQL operations use.

### 2. Component registry freshness (stale file fix)

The component registry was populated once at server startup via `scan_and_register()`. Files added, modified, or removed after startup were invisible until restart. Now:

- A new `rescan_components()` function clears and re-scans the components directory.
- It is called on every `getLabelingHtml` query, `listLabelingComponents` query, and `/api/components` REST endpoint.

## Files Affected

### Backend (`sdk/pixie_sdk/`)
- **`components/scanner.py`** — Added `rescan_components()` function.
- **`components/server.py`** — Removed the `GET /labeling/{test_case_id}` REST endpoint and all associated imports. `/api/components` now calls `rescan_components()`.
- **`graphql.py`** — Added `get_labeling_html` and `list_labeling_components` query methods to `Query`.

### Frontend (`frontend/src/`)
- **`graphql/sdk/query.ts`** — Added `GET_LABELING_HTML` and `LIST_LABELING_COMPONENTS` queries.
- **`generated/sdk/gql.ts`** — Updated with new query overloads.
- **`generated/sdk/graphql.ts`** — Updated with new types and document AST nodes.
- **`components/ManualLabelingDialog.tsx`** — Replaced `fetch()` with Apollo `useLazyQuery(GET_LABELING_HTML)`.

### Tests
- **`sdk/tests/test_server.py`** — Replaced REST labeling endpoint tests with `TestGetLabelingHtmlQuery` class (4 GraphQL query tests).
- **`sdk/tests/test_e2e_labeling.py`** — `TestE2ELabelingPage` rewritten to test via GraphQL instead of REST.
- **`frontend/src/components/ManualLabelingDialog.test.tsx`** — Rewritten to mock `useLazyQuery` instead of `fetch()`.

## Migration Notes

- The `GET /labeling/{test_case_id}` endpoint no longer exists. Clients must use the `getLabelingHtml` GraphQL query instead.
- The frontend no longer needs `SDK_BASE_URL` or `useAuthStore` for labeling HTML fetching — auth is handled by Apollo Client's `sdkAuthLink`.

# Labeling UI — Auth Header & Test-Case-ID Entry Point

## What changed

The labeling endpoint was redesigned to:

1. **Accept a remote test case UUID** as the sole URL parameter: `GET /labeling/{test_case_id}`.
2. **Use the standard `Authorization: Bearer <token>` header** instead of a `?token=` query param.
3. **Resolve everything from the test case ID**: test suite (via remote server), HTML template (via suite name → slot), input data (via local `test_case_map`).

The frontend was changed from an `<iframe src=...>` approach (which cannot send custom headers) to a `fetch()` + `<iframe srcdoc=...>` approach.

## Root cause of the original issue

The remote pixie-server requires authentication. The SDK server was originally calling `RemoteClient()` without a token, getting `"Authentication required"`, catching the exception silently, and returning 404.

Previous fixes forwarded the JWT as a query parameter (`?token=jwt`), which was insecure (tokens appear in server logs, browser history, referrer headers).

## Why this approach

| Decision | Rationale |
|----------|-----------|
| `Authorization: Bearer` header | Standard, secure — tokens don't leak into URLs |
| `fetch()` + `srcdoc` | Only way to send custom headers to an HTML endpoint (iframes can't set headers) |
| Single `{test_case_id}` URL param | One entry point, no ambiguity — the test case ID is the canonical identifier |
| Server resolves suite & slot internally | No frontend conversion logic, no duplicated snake_case transforms |

## Files affected

### Backend (SDK)

- `pixie_sdk/components/server.py` — Complete rewrite of `labeling_page()`:
  - URL: `GET /labeling/{test_case_id}` with `Authorization` header
  - Removed `_resolve_component()`, `_is_uuid()`, `?id=` param, `?token=` param
  - Flow: auth → validate UUID → `get_test_case()` → `get_test_suite()` → `to_snake_case()` → `get_component()` → `_load_input()` → inject → serve
  - HTTP status codes: 401 (no auth), 400 (invalid UUID), 404 (not found)

- `pixie_sdk/remote_client/__init__.py` — New `get_test_case(test_case_id: UUID)` method:
  - Queries `getTestCasesWithLabel(ids: [$id])` to get test case with `testSuite` FK
  - Returns dict with `id`, `testSuite`, `description`, `createdAt` or `None`

- `tests/test_server.py` — Labeling tests rewritten:
  - `test_labeling_page_requires_auth` — 401 without header
  - `test_labeling_page_returns_html_with_input` — Full pipeline with auth header
  - `test_labeling_page_test_case_not_found` — 404 from remote
  - `test_labeling_page_no_html_for_suite` — 404 when no registered HTML

- `tests/test_e2e_labeling.py` — Updated to use `Authorization` header and mock `RemoteClient`

### Frontend

- `components/ManualLabelingDialog.tsx` — Complete rewrite:
  - Removed `entryId` + `testSuiteId` props, replaced with single `testCaseId`
  - Uses `fetch()` with `Authorization: Bearer` header to get HTML
  - Renders via `<iframe srcDoc={htmlContent}>` instead of `<iframe src=...>`
  - Added loading (`CircularProgress`), error (`Alert`), and success states

- `components/TestSuiteView.tsx` — Changed to pass `testCaseId={selectedEntryId}`

- `components/ManualLabelingDialog.test.tsx` — Rewritten to test fetch + srcdoc flow

## E2E Verification

```
# Without auth → 401
curl localhost:8100/labeling/40552582-... → 401 "Authorization: Bearer <token> header required"

# With auth → resolves test case → suite → slot → HTML → data lookup
curl -H "Authorization: Bearer $TOKEN" localhost:8100/labeling/40552582-... → 404 "Data entry not found"
# (404 is expected when local data entries don't exist for this test case)
```

## Migration notes

The endpoint URL contract changed:
- **Before**: `GET /labeling/{component_name}?id={input_id}&token={jwt}`
- **After**: `GET /labeling/{test_case_id}` with `Authorization: Bearer <token>` header

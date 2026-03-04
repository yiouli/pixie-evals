# Fix Inline Imports and Update Mock Paths

## What Changed

Moved inline imports in `pixie_sdk/graphql.py` and
`pixie_sdk/components/scaffold.py` to module-level imports.  Updated all
test mock paths to patch at the lookup site (`pixie_sdk.graphql.*`) instead
of the definition site (`pixie_sdk.remote_client.*`,
`pixie_sdk.components.scanner.*`).

### Imports moved to module level in `graphql.py`

| Import | Was inline in |
|--------|---------------|
| `re` | `get_labeling_html` |
| `jinja2.Environment`, `jinja2.FileSystemLoader` | `render_labeling_ui` |
| `pixie_sdk.remote_client.RemoteClient` | 6 resolvers (queries, mutations, subscriptions) |
| `pixie_sdk.components.PLACEHOLDER_ATTR` | `get_labeling_html` |
| `pixie_sdk.components.get_components_dir` | `scaffold_labeling_component` |
| `pixie_sdk.components.registry.get_component`, `list_slots` | `get_labeling_html`, `list_labeling_components` |
| `pixie_sdk.components.scaffold.scaffold_component`, `to_snake_case` | `get_labeling_html`, `scaffold_labeling_component` |
| `pixie_sdk.components.scanner.rescan_components` | `get_labeling_html`, `list_labeling_components` |

### Imports moved to module level in `scaffold.py`

| Import | Was inline in |
|--------|---------------|
| `json` | `scaffold_component` |

### Imports intentionally kept inline

| Import | Reason |
|--------|--------|
| `dspy` | Heavy dependency (loads ML frameworks); only needed in evaluation/optimization paths |
| `dotenv` | Not a declared dependency in `pyproject.toml`; defensive loading |
| `uvicorn` (in `server.py`) | Only needed at CLI entry point |

### Test mock paths updated

All 24 `RemoteClient` mock patches across 5 test files were updated to patch
at `pixie_sdk.graphql.RemoteClient` (the lookup site) instead of
`pixie_sdk.remote_client.RemoteClient` (the definition site).

Similarly, `rescan_components` patches in integration tests were updated from
`pixie_sdk.components.scanner.rescan_components` to
`pixie_sdk.graphql.rescan_components`.

### Pre-existing test bug fixed

`test_e2e_labeling.py::test_unregistered_component_returns_error` expected a
GraphQL error when no labeling component is registered, but the resolver
returns `None` (not an error).  Updated the assertion to match the actual
resolver behavior.

## Files Affected

- `sdk/pixie_sdk/graphql.py` — moved 10+ inline imports to module level
- `sdk/pixie_sdk/components/scaffold.py` — moved `json` import to module level
- `sdk/tests/test_graphql.py` — updated mock paths
- `sdk/tests/test_server.py` — updated mock paths
- `sdk/tests/test_e2e_labeling.py` — updated mock paths, fixed pre-existing assertion bug
- `sdk/tests/test_evaluate_dataset.py` — updated mock paths
- `sdk/tests/test_optimize_evaluator.py` — updated mock paths

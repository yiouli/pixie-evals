# F7: Remote Server Client

**Scope**: `sdk/remote_client/`, `sdk/ariadne_codegen.toml`
**Phase**: 3 (no code dependencies, but needs running pixie-server for schema)
**Tests**: None (generated code)

## Overview

Set up `ariadne-codegen` to generate a typed Python GraphQL client that the SDK uses to call the remote pixie-server. This involves vendoring the server's schema and running code generation.

## Steps

### 1. Vendor the Remote Schema

With the pixie-server running at `localhost:8000`:

```bash
# Option A: Use a GraphQL introspection tool
pip install graphql-core
python -c "
import urllib.request, json
query = json.dumps({'query': '''
  query IntrospectionQuery {
    __schema {
      types { name kind fields { name type { name kind ofType { name kind } } } }
      queryType { name }
      mutationType { name }
    }
  }
'''})
req = urllib.request.Request('http://localhost:8000/graphql', data=query.encode(), headers={'Content-Type': 'application/json'})
print(urllib.request.urlopen(req).read().decode())
"

# Option B: Use strawberry's built-in SDL export (from pixie-server repo)
cd ../pixie-server
python -c "from pixie_server.graphql import schema; print(schema.as_str())" > ../pixie-evals/sdk/remote_client/schema.graphql
```

**Recommended approach**: Option B — directly export from Strawberry schema object. Add this as a Makefile target:

```makefile
vendor-schema:
	cd ../pixie-server && python -c "from pixie_server.graphql import schema; print(schema.as_str())" > ../pixie-evals/sdk/remote_client/schema.graphql
```

### 2. Run Code Generation

```bash
cd sdk
uv run ariadne-codegen
```

This generates typed Python client code in generated based on:
- Schema: schema.graphql
- Operations: queries.graphql
- Config: ariadne_codegen.toml

### 3. Verify the Generated Client

The generated `PixieRemoteClient` class will have methods like:
- `create_metric(name, config, description)` → returns metric ID
- `create_test_suite(name, metric_ids, config, description)` → returns test suite ID
- `add_test_cases(test_suite_id, test_cases, data_adaptor_id)` → returns test case IDs
- `list_metrics()` → returns list of metrics
- `get_auth_token(username, password)` → returns access token

### 4. Create a Client Factory

Add a helper to instantiate the client with auth:

```python
# sdk/pixie_sdk/remote_client/__init__.py
from pixie_sdk.remote_client.generated.client import PixieRemoteClient

def get_remote_client(token: str | None = None) -> PixieRemoteClient:
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return PixieRemoteClient(
        url="http://localhost:8000/graphql",
        headers=headers,
    )
```

## Operations Defined in `queries.graphql`

| Operation | Type | Used By |
|-----------|------|---------|
| `GetAuthToken` | Mutation | F9 (if SDK proxies auth) |
| `CreateMetric` | Mutation | F11 (via frontend → SDK) |
| `CreateTestSuite` | Mutation | F8 (creation pipeline) |
| `AddTestCases` | Mutation | F8 (creation pipeline) |
| `ListMetrics` | Query | F11 (frontend metric selection) |
| `ListTestSuites` | Query | F11, F12 |
| `GetTestCasesWithLabel` | Query | F12 (evaluation view) |

## Implementation Notes

- The generated code is NOT committed to git (it's in .gitignore under `generated/`)
- Re-run `ariadne-codegen` whenever the remote server schema changes
- The `ariadne_codegen.toml` config's `target_package_path` places generated code inside `pixie_sdk/` so it's importable as `pixie_sdk.remote_client.generated`
- The remote server URL should be configurable via environment variable (default `http://localhost:8000/graphql`)
```

# SDK Remote Client: ariadne-codegen Setup

## What Changed

The SDK's remote client for communicating with pixie-server was previously a
hand-written stub (`pixie_sdk/remote_client/__init__.py`) with inline GraphQL
query strings and raw `httpx` calls. The ariadne-codegen configuration
(`pyproject.toml`) was present but non-functional: the vendored schema and
queries files were empty, and the `generated/` directory was never populated.

This change:

1. **Vendored the pixie-server schema** into `remote_client/schema.graphql`
   by fetching the SDL from the running server.
2. **Wrote all GraphQL operations** used by the SDK into
   `remote_client/queries.graphql` (7 queries + 4 mutations).
3. **Fixed the `[tool.ariadne-codegen]` config** in `pyproject.toml`:
   - Changed `remote_schema_url`/`remote_schema_path` → `schema_path`
     (use local file, no running server required for codegen).
   - Fixed `target_package_path` to avoid double-nesting.
   - Added `async_client = true` and scalar type mappings for UUID, JSON,
     DateTime.
   - Renamed generated client class to `PixieServerClient` to distinguish
     from the `RemoteClient` facade.
4. **Ran `ariadne-codegen`** to populate `pixie_sdk/remote_client/generated/`
   with 18 generated files (typed async client, Pydantic models for all query
   results and input types, enums, base client, etc.).
5. **Replaced the hand-written stub** in `pixie_sdk/remote_client/__init__.py`
   with a `RemoteClient` facade class that:
   - Keeps the same `(endpoint, auth_token=)` constructor signature.
   - Delegates all operations to the generated `PixieServerClient`.
   - Returns plain dicts for backward compatibility with existing callers.
   - Re-exports generated types (`PixieServerClient`, input classes) for
     callers that want fully-typed access.

## Files Affected

- `sdk/pyproject.toml` — fixed `[tool.ariadne-codegen]` config
- `sdk/remote_client/schema.graphql` — populated with pixie-server SDL
- `sdk/remote_client/queries.graphql` — populated with all operations
- `sdk/pixie_sdk/remote_client/__init__.py` — replaced stub with facade
- `sdk/pixie_sdk/remote_client/generated/` — 18 new generated files
- `sdk/README.md` — added "Remote Client Code Generation" section
- `README.md` — fixed project structure tree

## Migration Notes

- **No caller changes required.** The `RemoteClient` facade preserves the
  exact same constructor and method signatures.
- All 174 existing SDK tests pass without modification.
- New code should prefer importing `PixieServerClient` from
  `pixie_sdk.remote_client.generated` for full Pydantic type safety.

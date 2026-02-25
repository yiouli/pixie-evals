# Implementation Plan

This document defines the feature-by-feature implementation order for the pixie-evals mono-repo. Each feature is independently testable and builds on the previous ones. Implementation follows strict TDD — write tests first, implement, verify.

## Feature Dependency Graph

```
F1 File Ingestion ──┐
                     ├──► F3 File Upload (SDK) ──► F10 Frontend Upload ──┐
F2 DB Operations ───┘                                                     │
                                                                          ▼
F7 Remote Client ──► F8 Creation Pipeline ──────► F11 Frontend Create ──► F12 Frontend Eval
                                                                          ▲
F5 Labeling UI ──────────────────────────────────────────────────────────┘
                                                                          ▲
F6 Embedding ──► F8 Creation Pipeline                                     │
                                                                          │
F9 Frontend Auth ─────────────────────────────────────────────────────────┘

F4 SDK GraphQL Queries (used by F3, F10, F11, F12)
```

## Implementation Order

| Phase | Feature | Scope | Depends On | Spec |
|-------|---------|-------|------------|------|
| 1 | **F1: File Ingestion** | SDK `ingest.py` | — | [f1-file-ingestion.md](f1-file-ingestion.md) |
| 1 | **F2: SDK Database CRUD** | SDK `db.py` | — | [f2-sdk-database.md](f2-sdk-database.md) |
| 2 | **F4: SDK GraphQL Queries** | SDK `graphql.py` queries | F2 | [f4-sdk-graphql-queries.md](f4-sdk-graphql-queries.md) |
| 2 | **F5: Labeling UI Rendering** | SDK `server.py` + `graphql.py` | F2 | [f5-labeling-ui.md](f5-labeling-ui.md) |
| 2 | **F6: OpenAI Embedding** | SDK `embed.py` | — | [f6-embedding.md](f6-embedding.md) |
| 3 | **F3: File Upload** | SDK `graphql.py` mutation + `server.py` multipart config | F1, F2, F4 | [f3-file-upload.md](f3-file-upload.md) |
| 3 | **F7: Remote Server Client** | SDK `remote_client/` | — | [f7-remote-client.md](f7-remote-client.md) |
| 4 | **F8: Test Suite Creation Pipeline** | SDK `graphql.py` subscription | F2, F6, F7 | [f8-creation-pipeline.md](f8-creation-pipeline.md) |
| 5 | **F9: Frontend Auth** | Frontend login/logout | — | [f9-frontend-auth.md](f9-frontend-auth.md) |
| 6 | **F10: Frontend Dataset Upload** | Frontend file upload | F3 (SDK running) | [f10-frontend-upload.md](f10-frontend-upload.md) |
| 7 | **F11: Frontend Test Suite Creation** | Frontend creation flow | F8, F10 | [f11-frontend-creation.md](f11-frontend-creation.md) |
| 8 | **F12: Frontend Evaluation View** | Frontend eval/labeling | F4, F5, F9 | [f12-frontend-evaluation.md](f12-frontend-evaluation.md) |

## Phase Details

### Phase 1 — Pure utility functions (no I/O dependencies)

**F1** and **F2** are leaf nodes with no dependencies. They can be developed in parallel. Both are pure Python with no network calls — only file I/O and SQLite.

### Phase 2 — SDK GraphQL reads + utilities

**F4** wires `db.py` functions into GraphQL resolvers. **F5** adds Jinja2 rendering. **F6** wraps OpenAI (mocked in tests). All three can be developed in parallel.

### Phase 3 — SDK write path + remote client

**F3** combines ingestion + DB + GraphQL into a single `uploadFile(file: Upload!)` mutation using Strawberry's native `Upload` scalar — no separate REST endpoint. **F7** vendors the remote schema and generates the typed client. Can be developed in parallel.

### Phase 4 — SDK creation orchestration

**F8** is the most complex SDK feature — the subscription that orchestrates remote creation + embedding + upload. Requires F2, F6, F7.

### Phase 5–8 — Frontend features

Each frontend feature builds on the SDK backend. **F9** (auth) is independent. **F10** needs the GraphQL upload mutation (F3) and uses `apollo-upload-client` for multipart encoding. **F11** needs the subscription. **F12** needs queries + labeling UI.

## Testing Strategy

- **SDK unit tests**: Use in-memory SQLite (`tmp_path`), mock OpenAI and remote client
- **SDK integration tests**: Test GraphQL schema via `TestClient` + real SQLite
- **Frontend**: Manual testing against running SDK + remote servers; typed by codegen
```

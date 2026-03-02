# pixie-evals

AI Evals mono-repo — a lightweight Python SDK server and React web frontend for managing AI evaluation test suites and manually labeling test cases.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              User's Local Machine                    │
│                                                      │
│  ┌──────────────┐          ┌───────────────────┐    │
│  │   Frontend    │◄────────►│   SDK Server      │    │
│  │   (React)     │  GraphQL │ (FastAPI +         │    │
│  │   :5173       │  :8100   │  Strawberry)       │    │
│  └──────┬────────┘          └───────┬────────────┘    │
│         │                           │                  │
│         │ GraphQL                   │ ariadne-codegen  │
│         │                           │ client           │
└─────────┼───────────────────────────┼──────────────────┘
          │                           │
          ▼                           ▼
    ┌───────────────────────────────────────┐
    │        pixie-server (Remote)           │
    │   FastAPI + Strawberry GraphQL         │
    │   :8000/graphql                        │
    │   (Supabase Postgres + Storage)        │
    └───────────────────────────────────────┘
```

**Privacy boundary**: Raw test case data stays in the SDK's local SQLite database. Only embeddings and metadata go to the remote server.

## Project Structure

```
pixie-evals/
├── Makefile                    # Cross-package dev commands
├── specs/
│   └── overview.md             # Product specification
├── sdk/                        # Python SDK (local server)
│   ├── pyproject.toml          # uv/hatch dependencies + ariadne-codegen config
│   ├── remote_client/          # GraphQL operations & vendored schema
│   │   ├── schema.graphql      # Vendored pixie-server SDL schema
│   │   └── queries.graphql     # GraphQL operations (queries + mutations)
│   ├── labeling/               # User-authored HTML labeling pages (one per test suite)
│   │   ├── my_test_suite.html  # Custom labeling page (edit this)
│   │   └── my_test_suite.d.ts  # TypeScript types for INPUT variable (editor support)
│   ├── pixie_sdk/
│   │   ├── server.py           # FastAPI server & entry point
│   │   ├── db.py               # SQLite operations
│   │   ├── graphql.py          # Strawberry GraphQL schema
│   │   ├── ingest.py           # File loading & schema inference
│   │   ├── embed.py            # OpenAI embedding utilities
│   │   ├── components/         # Custom labeling UI component system
│   │   │   ├── __init__.py     # Public API: set_components_dir(), PLACEHOLDER_ATTR
│   │   │   ├── registry.py     # In-memory slot → HTML path store
│   │   │   ├── scanner.py      # Discovers .html files at startup
│   │   │   ├── server.py       # FastAPI routes: /labeling/*, /api/inputs/*
│   │   │   └── scaffold.py     # Generates .html + .d.ts scaffold files
│   │   └── remote_client/      # Remote pixie-server client
│   │       ├── __init__.py     # RemoteClient facade (wraps generated client)
│   │       └── generated/      # ariadne-codegen output (never edit manually)
│   └── tests/
│       ├── conftest.py
│       ├── test_db.py
│       ├── test_graphql.py
│       ├── test_ingest.py
│       ├── test_embed.py
│       ├── test_server.py
│       ├── test_components_init.py
│       ├── test_registry.py
│       ├── test_scanner.py
│       ├── test_scaffold.py
│       └── test_e2e_labeling.py
└── frontend/                   # React web frontend
    ├── package.json            # pnpm dependencies
    ├── vite.config.ts
    ├── tsconfig.json
    ├── codegen.ts              # graphql-codegen config
    ├── index.html
    └── src/
        ├── main.tsx            # App entry point
        ├── App.tsx             # Route definitions
        ├── lib/
        │   ├── apolloClient.ts # Dual Apollo clients (remote + SDK)
        │   ├── theme.ts        # MUI theme
        │   └── store.ts        # Zustand state stores (auth, dataset, test suite)
        ├── hooks/
        │   ├── index.ts            # Barrel export for all hooks
        │   ├── useAuth.ts          # Login/logout with JWT persistence
        │   ├── useTestSuites.ts    # Test suite CRUD (Zustand store-backed)
        │   ├── useMetrics.ts       # Metric operations (stub)
        │   ├── useEvaluation.ts    # Evaluation state (stub)
        │   ├── useDatasets.ts      # List datasets from SDK server
        │   └── useDatasetUpload.ts # Multipart file upload to SDK server
        ├── components/
        │   ├── SelectionView.tsx       # Landing page — tabbed grid of test suites & datasets
        │   ├── DatasetView.tsx         # Dataset detail — editable name, schema, paginated data
        │   ├── TestSuiteView.tsx       # Test suite detail — metrics, test cases, actions
        │   ├── SignInModal.tsx          # Auth modal overlay (JWT via remote server)
        │   ├── DatasetUploadDialog.tsx  # Drag-and-drop file upload dialog
        │   ├── TestSuiteConfigDialog.tsx# Create test suite — name, metrics, dataset
        │   ├── ManualLabelingDialog.tsx # SDK iframe + per-metric rating + notes
        │   ├── EvaluationDialog.tsx     # AI evaluation progress shell
        │   ├── EditableText.tsx         # Click-to-edit text component
        │   ├── MetricEditor.tsx         # Metric list editor (scale/category types)
        │   ├── ArrayEditor.tsx          # Generic sortable list editor with DnD
        │   └── TestCaseDataGrid.tsx     # Paginated DataGrid with auto-detected columns
        ├── graphql/
        │   ├── remote/         # Operations for pixie-server
        │   │   └── operations.graphql
        │   └── sdk/            # Operations for local SDK server
        │       └── operations.graphql
        └── generated/          # graphql-codegen output
```

## Getting Started

### Prerequisites

- **Python 3.11+** and [uv](https://docs.astral.sh/uv/)
- **Node.js 20+** and [pnpm](https://pnpm.io/)
- A running instance of [pixie-server](../pixie-server) at `localhost:8000`

### Install Dependencies

```bash
# Install everything
make install

# Or individually:
cd sdk && uv sync
cd frontend && pnpm install
```

### Development

```bash
# Start SDK server (localhost:8100)
make dev-sdk

# Start frontend dev server (localhost:5173)
make dev-frontend

# Run SDK tests
make test-sdk

# Run frontend tests
cd frontend && pnpm test

# Type check frontend
cd frontend && pnpm typecheck

# Type check SDK
make lint

# Generate GraphQL clients
make codegen
```

## Tech Stack

### SDK (Python)

- **FastAPI** + **Strawberry GraphQL** — local API server
- **SQLite** (aiosqlite) — local dataset storage
- **Custom HTML labeling pages** — user-authored `.html` files with server-side input injection
- **Polars** + **PyArrow** + **genson** — file ingestion & schema inference
- **OpenAI** — text embeddings
- **ariadne-codegen** — typed client for remote pixie-server

### Frontend (TypeScript)

- **Vite** + **React** — build & UI framework
- **Apollo Client** — GraphQL queries/mutations/subscriptions
- **graphql-codegen** — TypeScript types from GraphQL schemas
- **React Router** — client-side routing
- **Zustand** — state management
- **MUI** (Material UI) — component library
- **@dnd-kit** — drag-and-drop for sortable lists
- **Vitest** + **@testing-library/react** — unit testing

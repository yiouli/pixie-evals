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
│   ├── pyproject.toml          # uv/hatch dependencies
│   ├── ariadne_codegen.toml    # Remote client code generation config
│   ├── remote_client/          # GraphQL operations & vendored schema
│   │   ├── schema.graphql
│   │   └── queries.graphql
│   ├── pixie_sdk/
│   │   ├── server.py           # FastAPI server & entry point
│   │   ├── db.py               # SQLite operations
│   │   ├── graphql.py          # Strawberry GraphQL schema
│   │   ├── ingest.py           # File loading & schema inference
│   │   ├── embed.py            # OpenAI embedding utilities
│   │   ├── templates/          # Jinja2 labeling UI templates
│   │   └── remote_client/      # Generated client (ariadne-codegen)
│   │       └── generated/
│   └── tests/
│       ├── conftest.py
│       ├── test_db.py
│       ├── test_graphql.py
│       ├── test_ingest.py
│       ├── test_embed.py
│       └── test_server.py
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
        │   └── store.ts        # Zustand state stores
        ├── hooks/
        │   ├── useAuth.ts
        │   ├── useTestSuites.ts
        │   ├── useMetrics.ts
        │   ├── useEvaluation.ts
        │   └── useDatasetUpload.ts
        ├── components/
        │   ├── Login.tsx
        │   ├── FileUpload.tsx
        │   ├── TestSuiteCreation.tsx
        │   ├── MetricCreationModal.tsx
        │   ├── EvaluationView.tsx
        │   ├── LabelingModal.tsx
        │   └── TestCaseDataGrid.tsx
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

# Type check SDK
make lint

# Generate GraphQL clients
make codegen
```

## Tech Stack

### SDK (Python)
- **FastAPI** + **Strawberry GraphQL** — local API server
- **SQLite** (aiosqlite) — local dataset storage
- **Jinja2** — labeling UI rendering
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
- **CodeMirror** — code/JSON editor

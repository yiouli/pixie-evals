# Copilot Instructions for pixie-evals

## Project Overview

pixie-evals is an evaluation platform with a Python SDK backend and a React/TypeScript frontend. The frontend uses Vite, MUI, Apollo Client, Zustand, and GraphQL Codegen.

## Technology Stack

### Backend (SDK)
- **Python 3.11+** with type hints
- **pytest** for testing

### Frontend
- **TypeScript** with strict mode
- **React 19** with functional components
- **Vite** for build/dev server
- **MUI (Material UI)** for all UI components and theming
- **Apollo Client** for GraphQL data fetching (queries, mutations, subscriptions)
- **Zustand** for client-side state management
- **GraphQL Codegen** (`@graphql-codegen/cli`) for generating TypeScript types from GraphQL schemas
- **Vitest** for testing
- **pnpm** as package manager

---

## Frontend File Organization

### Directory Structure

```
frontend/
  codegen.ts              # GraphQL Codegen config
  index.html              # Vite entry point
  package.json
  tsconfig.json
  vite.config.ts
  src/
    App.tsx                # Root component with route definitions
    main.tsx               # Entry point (React render)
    components/            # All React components (flat, no nesting)
    generated/             # Auto-generated code from GraphQL Codegen (never edit manually)
      remote/              # Types from remote pixie-server schema
      sdk/                 # Types from local SDK server schema
    graphql/               # GraphQL operation documents (.ts files using graphql() function)
      remote/              # Operations against remote pixie-server
        mutation.ts        # Remote mutations (e.g., GET_AUTH_TOKEN)
      sdk/                 # Operations against local SDK server
        query.ts           # SDK queries (e.g., LIST_DATASETS, GET_DATASET)
        mutation.ts        # SDK mutations (e.g., UPLOAD_FILE)
        subscription.ts    # SDK subscriptions (e.g., CREATE_TEST_SUITE_PROGRESS)
    hooks/                 # Custom React hooks
      index.ts             # Barrel export for all hooks
    lib/                   # Non-React utilities, store, config, pure functions
      apolloClient.ts      # Apollo Client instances
      store.ts             # Zustand store definitions
      theme.ts             # MUI theme configuration
```

### Key Organization Rules

1. **Components are flat**: All components live directly in `components/` — no nested component folders. Each component is a single file named in PascalCase (e.g., `EvaluationView.tsx`, `LabelingModal.tsx`).

2. **Tests are colocated**: Test files sit next to the code they test, named `<Module>.test.ts` or `<Component>.test.tsx` (e.g., `components/TraceView.test.tsx`, `lib/utils.test.ts`, `hooks/useRunContext.test.ts`).

3. **Generated code is never edited manually**: The `generated/` directory is populated by `pnpm codegen`. Only edit files in `graphql/` (the source documents).

4. **GraphQL operations are organized by server**: Separate directories under `graphql/` for `remote/` (pixie-server) and `sdk/` (local SDK server) operations.

5. **Hooks barrel export**: All custom hooks are re-exported from `hooks/index.ts` for clean imports.

6. **Lib for non-React code**: Pure utility functions, store definitions, theme config, and type definitions live in `lib/`. Keep React-dependent code in `hooks/` or `components/`.

7. **Path aliases**: Use `@/*` to import from `src/*` (configured in `tsconfig.json`). Example: `import { theme } from "@/lib/theme"`.

---

## UI Design Conventions

### MUI as the Component Library

All UI must be built with MUI components. **Never use raw HTML elements** when an MUI equivalent exists.

**❌ WRONG**:
```tsx
<div style={{ display: "flex", gap: 8 }}>
  <button onClick={handleClick}>Submit</button>
  <p>Some text</p>
</div>
```

**✅ CORRECT**:
```tsx
<Box sx={{ display: "flex", gap: 1 }}>
  <Button onClick={handleClick}>Submit</Button>
  <Typography>Some text</Typography>
</Box>
```

### Styling with the `sx` Prop

Use MUI's `sx` prop for all styling. Do not use CSS files, CSS modules, or `styled-components` for component-level styles.

```tsx
<Box
  sx={{
    height: "100%",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  }}
>
```

Use theme spacing units (numbers) in `sx` for consistent spacing:
```tsx
<Stack spacing={2} sx={{ p: 3, mt: 4 }}>
```

### Theming

- Define the MUI theme in `lib/theme.ts` using `createTheme()`.
- Access theme values via `useTheme()` hook, never hardcode colors.
- Use `theme.palette.*` for colors, `theme.spacing()` for spacing, `theme.breakpoints.*` for responsive design.

```tsx
const theme = useTheme();
<Box sx={{ color: theme.palette.primary.main, bgcolor: "background.default" }}>
```

### MUI Icons

Use `@mui/icons-material` for all icons. Import specific icons, not the entire package:

```tsx
import SearchIcon from "@mui/icons-material/Search";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
```

Prefer the `Rounded` variant of icons for visual consistency (e.g., `CloseRoundedIcon`, `ArrowForwardRoundedIcon`).

### Layout Patterns

- Use `Box` for generic containers and `Stack` for linear layouts.
- Use `Grid` (MUI Grid v2) for complex multi-column layouts.
- Use `Container` with `maxWidth` for page-level content centering.
- Use MUI `Dialog` for modals, `Paper`/`Card` for elevated surfaces.

### Component Composition

- Components should be **functional** (no class components).
- Export components as **named exports** (not default exports), except for the theme.
- Use `React.forwardRef` when a component needs to expose a DOM ref.

```tsx
export function MyComponent({ title }: MyComponentProps) { ... }
```

---

## Component / API Design Conventions

### Component Props

- Define explicit **interface** for all component props, named `<Component>Props`.
- Use JSDoc comments on the interface properties to document non-obvious props.

```tsx
interface RatingButtonsGroupProps {
  /** Size of the buttons */
  size?: RatingButtonsSize;
  /** Current rating details (controlled) */
  ratingDetails: RatingDetailsType | null | undefined;
  /** Callback when rating details change */
  setRatingDetails: (details: RatingDetailsType | null) => void;
}

export function RatingButtonsGroup({ size = "medium", ratingDetails, setRatingDetails }: RatingButtonsGroupProps) { ... }
```

### GraphQL Operations

Operations are defined in **TypeScript files** under `graphql/` using the `graphql()` function from the generated code. This is the same pattern used in pixie-ui/app-runner.

1. **Define operations** in `graphql/sdk/query.ts`, `graphql/sdk/mutation.ts`, `graphql/sdk/subscription.ts` (or `graphql/remote/mutation.ts` for remote server).
2. **Each file** imports `graphql` from the corresponding generated directory (e.g., `import { graphql } from "../../generated/sdk/gql"`).
3. **Export named constants** in SCREAMING_SNAKE_CASE (e.g., `LIST_DATASETS`, `UPLOAD_FILE`, `GET_AUTH_TOKEN`).
4. **Generate types** with `pnpm codegen` — this populates `generated/`.
5. **Apollo Client instances** are defined in `lib/apolloClient.ts` — one per server (remote, SDK).
6. **Use Apollo hooks** (`useQuery`, `useMutation`, `useSubscription`) with the exported constants.

#### CRITICAL: No Inline GraphQL Strings

**NEVER define GraphQL operations inline in hooks or components.** All operations MUST be defined in the centralized `.ts` files under `graphql/remote/` or `graphql/sdk/` using the `graphql()` function.

**❌ WRONG** — inline `gql` tagged template:
```tsx
// In a hook or component — NEVER DO THIS
import { gql, useQuery } from "@apollo/client";

const LIST_DATASETS = gql`
  query ListDatasets {
    listDatasets { id fileName createdAt rowSchema }
  }
`;

const { data } = useQuery(LIST_DATASETS, { client: sdkClient });
```

**✅ CORRECT** — define in `graphql/sdk/query.ts`, use in hooks/components:
```tsx
// 1. In graphql/sdk/query.ts:
import { graphql } from "../../generated/sdk/gql";

export const LIST_DATASETS = graphql(`
  query ListDatasets {
    listDatasets {
      id
      fileName
      createdAt
      rowSchema
    }
  }
`);

// 2. In hooks/useDatasets.ts — import and use:
import { useQuery } from "@apollo/client";
import { LIST_DATASETS } from "../graphql/sdk/query";
import { sdkClient } from "../lib/apolloClient";

const { data } = useQuery(LIST_DATASETS, { client: sdkClient });
// data is fully typed automatically via TypedDocumentNode
```

#### CRITICAL: No Hand-Written Types for GraphQL Schema

**NEVER manually define TypeScript types/interfaces that mirror GraphQL schema types.** All GraphQL-derived types come from `generated/`.

**❌ WRONG** — hand-written types duplicating the schema:
```tsx
interface Dataset {
  id: string;
  fileName: string;
  createdAt: string;
  rowSchema: Record<string, unknown> | string;
}
```

**✅ CORRECT** — derive types from generated code:
```tsx
import type {
  ListDatasetsQuery,
  UploadFileMutation,
} from "../generated/sdk/graphql";

// Use query result types for sub-shapes:
type Dataset = ListDatasetsQuery["listDatasets"][number];
type UploadedDataset = UploadFileMutation["uploadFile"];
```

#### GraphQL Codegen Workflow

Codegen introspects **live running servers** to pull the schema. Both servers must be reachable before you run codegen.

##### Step 1 — Read the READMEs to understand how to start each server

Before starting any server, read the relevant README to find the correct startup command and any required environment variables:

- **pixie-evals root**: [`README.md`](../README.md) — covers `make dev-sdk`, `make dev-frontend`, environment prerequisites.
- **SDK server**: [`sdk/README.md`](../sdk/README.md) — Python FastAPI server, port `8100`.
- **Remote pixie-server**: `pixie-server/README.md` (sibling repo at `~/repo/pixie-server`) — port `8000`, requires Supabase env vars.

##### Step 2 — Start the required servers

The codegen config (`frontend/codegen.ts`) introspects:
- `http://localhost:8000/graphql` → remote pixie-server schema (generates `src/generated/remote/`)
- `http://localhost:8100/graphql` → local SDK server schema (generates `src/generated/sdk/`)

```bash
# Terminal 1 — Start local SDK server (port 8100)
make dev-sdk
# Equivalent: cd sdk && uv run python -m pixie_sdk.server

# Terminal 2 — Start remote pixie-server (port 8000)
# Check pixie-server/README.md for the exact command and required .env variables
# Typically: cd ../pixie-server && source .venv/bin/activate && uvicorn pixie_server.server:app --reload
```

##### Step 3 — Verify servers are reachable

Before running codegen, confirm both endpoints respond:

```bash
curl -s http://localhost:8100/graphql -d '{"query":"{__typename}"}' -H 'Content-Type: application/json'
# Expected: {"data":{"__typename":"Query"}}

curl -s http://localhost:8000/graphql -d '{"query":"{__typename}"}' -H 'Content-Type: application/json'
# Expected: {"data":{"__typename":"Query"}}
```

If a server is unreachable, fix the startup issue before proceeding.

##### Step 4 — Add or edit GraphQL operations

Add/edit operations in the appropriate `.ts` file under `graphql/sdk/` or `graphql/remote/`. Use the `graphql()` function from the corresponding `generated/*/gql` module.

##### Step 5 — Run codegen

```bash
# From the repo root:
make codegen

# Or just the frontend:
cd frontend && pnpm codegen

# Or just the SDK remote client (ariadne-codegen):
make codegen-sdk
# Equivalent: cd sdk && uv run ariadne-codegen
```

This regenerates all files under `frontend/src/generated/` and `sdk/pixie_sdk/remote_client/generated/`. **Never edit these files manually.**

##### Step 6 — Use the generated types

- **Import the named constant** (e.g., `LIST_DATASETS`) in your hook/component.
- **Never import `gql` from `@apollo/client`** for defining operations — only use the generated `graphql()` function.
- Derive TypeScript types from the generated output (see *No Hand-Written Types* section above).

##### Step 7 — Verify and commit

```bash
cd frontend && pnpm typecheck   # must pass with zero errors
cd frontend && pnpm test        # must pass
git add frontend/src/generated  # commit generated files together with operation changes
```

#### When Client-Only Types Are Acceptable

Only define local TypeScript types when they represent **client-side state not in the GraphQL schema** (e.g., UI state, Zustand store shapes, form state). Always document why the type cannot come from the generated code:

```tsx
/**
 * Client-only test suite state (stored in Zustand, not yet in GraphQL schema).
 * Will be replaced with generated types once remote persistence is wired.
 */
export interface TestSuiteInfo {
  id: string;
  name: string;
  // ...
}
```

### Zustand Store

- Define each store as a **separate `create()` call** with an explicit interface.
- Keep stores in `lib/store.ts`.
- Use **narrow selectors** — subscribe only to the exact data needed.

**❌ WRONG**:
```tsx
const store = useAuthStore();      // subscribes to entire store
```

**✅ CORRECT**:
```tsx
const token = useAuthStore((state) => state.token);
const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
```

- Use `useShallow` for object/array selectors to prevent unnecessary re-renders:
```tsx
import { useShallow } from "zustand/shallow";
const config = useStore(useShallow((state) => state.config));
```

- **Actions live inside the store** definition (via `set`), not as standalone functions, unless the store is large enough to warrant external action namespaces.
- **Never pass store values as props** — child components should access the store directly.

### Custom Hooks

- Name hooks with the `use` prefix: `useAuth`, `useTestSuites`, `useEvaluation`.
- Hooks encapsulate data-fetching, subscriptions, and complex state logic.
- Re-export all hooks from `hooks/index.ts`.
- Document hook purpose and return type with JSDoc.

```tsx
/**
 * useRunContext - Central hook for accessing the current run state.
 * Components use this instead of directly accessing the store.
 */
export function useRunContext(): RunContext { ... }
```

### Type Safety

- **TypeScript strict mode is enabled** (`strict: true` in `tsconfig.json`).
- Never use `any` — use `unknown` and type guards instead.
- Never use `// @ts-ignore` or `as any` to silence errors.
- Define explicit return types for functions with complex return values.
- Use union types and discriminated unions over `any` for variant data.

### Pure Functions and Selectors

- Extract **pure functions** (no side effects, no store access) into `lib/` files.
- Pure functions take all data as arguments and return computed results — this makes them easy to test.
- Name pure selector files descriptively (e.g., `pure-selectors.ts`).

```tsx
// lib/pure-selectors.ts — pure, testable, no store dependency
export function getTraceTrees(traces: TraceEvent[], otlpSpans: OtlpSpan[]): TraceTree[] { ... }

// hooks or components call these with data from the store
const trees = getTraceTrees(traces, otlpSpans);
```

### Domain Modules

For complex domain logic, organize as a module directory with an `index.ts` barrel:

```
lib/
  chatml/
    index.ts      # Public API (re-exports)
    types.ts      # Type definitions
    helpers.ts    # Internal utilities
    core.ts       # Core logic
    adapters/     # Provider-specific adapters
```

Export the public API from `index.ts`; consumers import from the module, not internal files.

---

## Documentation Requirements

**Every code change must include corresponding documentation updates. Documentation is not optional and must be completed before considering a task done.**

### What to Keep Up to Date

- **README.md**: Update when CLI commands, features, dependencies, or project structure change. Keep the feature table, command examples, and directory tree in sync with the actual code.
- **Docstrings / JSDoc**: Every public function, class, hook, and component must be documented. Update docstrings whenever you change a function's behaviour, parameters, or return values.
  - **Frontend (TypeScript)**: Use JSDoc (`/** ... */`) on all exported functions, hooks, components, and their props interfaces.
  - **Backend (Python)**: Use Google-style or reStructuredText docstrings on all public functions, classes, and methods.
- **Inline comments**: Add for non-obvious logic, especially in feature extraction, GraphQL resolvers, and state derivations.
- **`specs/`**: Update architecture or data-flow specs when the overall design changes.

### Changelog per Feature

**Every non-trivial feature or bug fix must have a changelog entry.**

1. Create or update a file under `changelogs/` named after the feature, e.g. `changelogs/evaluator-optimization.md`.
2. The file must include:
   - **What changed** and why.
   - **Files affected** (modules, components, hooks).
   - **Migration notes** if any API or schema changed.
3. Commit the changelog file together with the implementation.

```
changelogs/
  evaluator-optimization.md
  dataset-upload-improvements.md
  active-learning-scoring.md
```

### Documentation Generation Commands

After changing docstrings or the public API surface, regenerate any auto-generated docs:

```bash
# Frontend — type-check (also surfaces missing JSDoc errors in strict mode)
cd frontend && pnpm typecheck

# If the project has a doc-generation script, run it and commit the output
# e.g. python scripts/generate_docs.py
```

### Documentation Checklist (Before Every Commit)

1. ✅ All new/changed functions, hooks, and components have accurate docstrings / JSDoc.
2. ✅ `README.md` reflects current features, commands, and project structure.
3. ✅ `specs/` is up to date with any architectural changes.
4. ✅ A `changelogs/<feature>.md` file exists for each non-trivial change.
5. ✅ Auto-generated docs have been regenerated and committed.

---

## Type Checking Requirements

**Every code change must pass type checking — verified after EVERY incremental step, not just at the end.**

- **Backend**: `cd sdk && uv run mypy pixie_sdk/ --ignore-missing-imports` (or `make lint`)
- **Frontend**: `cd frontend && pnpm typecheck` (runs `tsc --noEmit`)
- Fix all type errors **immediately** before moving to the next increment. Never use `any` or `@ts-ignore` as workarounds.
- **Do not batch type-check runs.** Run after every file edit.

---

## Incremental Development with TDD

Follow a strict **test-driven, incremental development** workflow. **TDD and type checking are per-increment disciplines — they must happen after every small change, not just when the full feature is complete.**

### Before Each Change

1. **Understand scope**: Break the task into the smallest meaningful increments. Each increment should be independently testable — think one function, one component, one hook at a time.
2. **Write or update tests first**: Define expected behavior in test files before implementation.
3. **Run existing tests**: Verify all tests pass before making changes.
   - Backend: `cd sdk && uv run pytest -v` (or `make test-sdk`)
   - Frontend: `cd frontend && pnpm test`

### During Each Change (REPEAT FOR EVERY INCREMENT)

> ⚠️ **CRITICAL**: Steps 4–6 must be repeated for each small increment. Do NOT accumulate multiple changes and verify at the end.

4. **Implement the minimum code** to make the new test(s) pass. Avoid scope creep — one concern per increment.
5. **Run the full test suite immediately** after each file edit:
   - Backend: `cd sdk && uv run pytest -v`
   - Frontend: `cd frontend && pnpm test`
6. **Run type checking immediately** after each file edit:
   - Backend: `make lint`
   - Frontend: `cd frontend && pnpm typecheck`
7. **Fix any test failures or type errors before proceeding** to the next increment. Never carry forward broken tests or type errors.
8. **Refactor only with green tests**: If you want to restructure code, do it as a separate step with all tests and type checks passing before and after.

### After Each Increment Is Complete

9. **Verify all tests still pass**: Run the full suite once more.
10. **Verify type checking still passes**: Run `pnpm typecheck` / `make lint` once more.
11. **Update documentation**: Apply the documentation requirements above — docstrings, README, changelog.
12. **Review the diff**: Before considering the increment done, review what changed and ensure no unintended side effects.

### Test Quality Guidelines

- Tests should be **isolated**: use mocks for API calls, no real network or database access.
- Tests should be **deterministic**: no dependence on external services, network, or random state.
- Each test should verify **one behavior**. Use descriptive test names.
- Use **fixtures** and helpers to reduce boilerplate.

### Frontend Test Conventions

- Use **Vitest** as the test runner with `@testing-library/react` for component tests.
- Test files are **colocated** next to the source file: `MyComponent.test.tsx`.
- Mock the store by mocking `@/lib/store` and providing a mock state object.
- Mock child components to isolate the component under test.
- Use `vi.mock()` for module mocking and `vi.fn()` for function mocks.
- Wrap components that use MUI theming in a `ThemeProvider` test wrapper.
- Use `@vitest-environment happy-dom` pragma for component tests that need a DOM.

```tsx
/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { MyComponent } from "./MyComponent";

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe("MyComponent", () => {
  it("should render the title", () => {
    render(
      <TestWrapper>
        <MyComponent title="Hello" />
      </TestWrapper>,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

---

## Code Reuse and DRY Principles

- **Search before creating**: Always check `lib/`, `hooks/`, and `components/` for existing similar code.
- **Extract shared helpers** when the same logic appears in 2+ places.
- **Pure utilities** go in `lib/`, **React-specific logic** goes in `hooks/`, **reusable UI** goes in `components/`.

### Shared Components and Hooks

**The same UI element rendered in different contexts must use the same base component.** When two places render the same visual element (e.g., a file upload widget inside a dialog vs. embedded in a page), extract a shared component and use it in both places.

**❌ WRONG** — duplicating upload UI:
```tsx
// InsideDialog.tsx
function UploadForm() {
  return <Box><input type="file" ... /><Button>Upload</Button></Box>;
}

// InlineUpload.tsx — same UI, duplicate code
function UploadArea() {
  return <Box><input type="file" ... /><Button>Upload</Button></Box>;
}
```

**✅ CORRECT** — single shared component:
```tsx
// components/DatasetUploadForm.tsx — one source of truth
export function DatasetUploadForm({ onSuccess }: DatasetUploadFormProps) { ... }

// Used inside dialog:
<Dialog><DatasetUploadForm onSuccess={onClose} /></Dialog>

// Used inline:
<DatasetUploadForm onSuccess={handleNext} />
```

**Hooks that share logic must extract the shared part.** If `useHookA` does steps X + Y, and `useHookB` does steps X + Z, extract step X into its own hook or pure function and call it from both. Never copy-paste the implementation of X.

**❌ WRONG** — duplicated logic in two hooks:
```typescript
// useDatasetUpload.ts
export function useDatasetUpload() {
  const token = useAuthStore((state) => state.token);
  const headers = { Authorization: `Bearer ${token}` }; // duplicated
  // ... upload logic
}

// useFetchDatasets.ts
export function useFetchDatasets() {
  const token = useAuthStore((state) => state.token);
  const headers = { Authorization: `Bearer ${token}` }; // duplicated
  // ... fetch logic
}
```

**✅ CORRECT** — shared hook for common logic:
```typescript
// hooks/useAuthHeaders.ts
export function useAuthHeaders() {
  const token = useAuthStore((state) => state.token);
  return { Authorization: `Bearer ${token}` };
}

// Both hooks use it
export function useDatasetUpload() {
  const headers = useAuthHeaders();
  // ... upload logic
}

export function useFetchDatasets() {
  const headers = useAuthHeaders();
  // ... fetch logic
}
```

The same applies to pure utility functions — if two functions share a computation, extract it to `lib/` and import it.

### Reusing Generated GraphQL Types

**Always prefer types from `generated/` over hand-written duplicates.** GraphQL Codegen generates complete, accurate TypeScript types from the schema. Duplicating their fields manually creates maintenance burden and drift.

**Reuse generated types directly** when the shape matches:

```typescript
// ✅ CORRECT — import the generated type as-is
import type { DatasetType } from "../generated/sdk/graphql";

function showDataset(dataset: DatasetType) { ... }
```

**Use `type` aliases** to give generated types a meaningful local name without redefining them:

```typescript
// ✅ CORRECT — alias, not a new type definition
import type { ListDatasetsQuery } from "../generated/sdk/graphql";
type Dataset = ListDatasetsQuery["listDatasets"][number];
```

**Re-export from `lib/types.ts`** to give callers a stable import path, so internals can change without updating every import site:

```typescript
// lib/types.ts
export type { DatasetType, DataEntryType } from "../generated/sdk/graphql";
export type { AuthTokenType } from "../generated/remote/graphql";
```

**Only define a new local type** when you genuinely need to add fields that don't exist in the schema (e.g., client-only state), and document why it can't use the generated type:

```typescript
// ✅ ACCEPTABLE — adds client-only fields not in GraphQL schema
/**
 * Client-only test suite state (stored in Zustand, not yet in GraphQL schema).
 * Will be replaced with generated types once remote persistence is wired.
 */
export interface TestSuiteInfo {
  id: string;
  name: string;
  metrics: MetricConfig[];
  // ...
};
```

**Use query/subscription result field types for sub-shapes** rather than redefining them:

```typescript
// ✅ CORRECT — derive the nested type from the generated mutation type
import type { UploadFileMutation } from "../generated/sdk/graphql";
type UploadedDataset = UploadFileMutation["uploadFile"];
```

---

## Action Button Styling

Consistent button styling helps users immediately understand the weight and intent of an action. Follow these rules:

### When to Use Each Style

| Style | When to use | Example |
|---|---|---|
| `IconButton` + `Tooltip` | Compact toolbars; well-known universal actions where the icon alone is unambiguous | Pause, Stop, Resume, Close in a control bar |
| `Button` with `startIcon` + label text | Primary/secondary page-level actions; actions whose purpose needs a label for clarity | "Manual Review", "Upload Dataset", "Run Evaluation" |
| `Button` text-only (no icon) | Simple confirmations, navigation, or secondary dialog actions where an icon adds no clarity | "Cancel", "View Details" |
| Icon-only `Button` (not `IconButton`) | Rare; small fixed-size buttons in dense UI where `IconButton` sizing is wrong | Custom rating buttons in tight inline rows |

### Icon-Only Buttons: Always Add a Tooltip

Every `IconButton` that performs an action **must** have a `Tooltip` with a descriptive `title`. Screen readers and new users rely on it.

```tsx
// ✅ CORRECT
<Tooltip title="Pause run">
  <span>
    <IconButton aria-label="pause" onClick={handlePause} disabled={!canPause} color="primary">
      <PauseRoundedIcon />
    </IconButton>
  </span>
</Tooltip>
```

Wrap the `IconButton` in `<span>` when it may be `disabled`, so the `Tooltip` still fires on hover.

### When to Use Icon + Label

Use `startIcon` + label text for any action that:
- Appears on a page (not in a dense toolbar)
- Has a non-obvious icon
- Is a primary call-to-action

```tsx
// ✅ CORRECT — label clarifies purpose
<Button variant="contained" startIcon={<UploadFileRoundedIcon />}>
  Upload Dataset
</Button>
```

### Button Variant Hierarchy

Use variants to communicate the relative importance of actions:

| Variant | Weight | Use for |
|---|---|---|
| `variant="contained"` | Primary / most important | The single most important action on the current view; irreversible submissions |
| `variant="outlined"` | Secondary | Alternative or supporting actions alongside a primary action |
| `variant="text"` | Tertiary / low-key | Inline actions, "Cancel", links, supplementary options |

Avoid placing two `contained` buttons side by side — only one action should be primary.

### Color Semantics

| `color` | Meaning | Use for |
|---|---|---|
| `"primary"` | Default / neutral action | Standard operations: pause, restart, navigate, confirm |
| `"error"` | Destructive or exit | Delete, remove, close/exit a session, discard |
| `"secondary"` | CTA / marketing emphasis | Sign-up prompts, "Star on GitHub", demo links |
| `"success"` / `"warning"` / `"info"` | State-indicating inline | Rating buttons, status chips — sparingly and only when color carries direct meaning |

**❌ WRONG** — using `error` color for a non-destructive action:
```tsx
<Button color="error" onClick={handleCancel}>Cancel</Button>
```

**✅ CORRECT**:
```tsx
<Button variant="text" onClick={handleCancel}>Cancel</Button>
<Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
```

### Progressive Reveal for Destructive Actions

For irreversible destructive actions, use a two-step confirmation: the first click arms the button, the second click confirms. Show label text only in the armed state:

```tsx
<Button
  variant={confirming ? "contained" : "text"}
  color="error"
  onClick={handleClick}
  size="small"
>
  <DeleteOutlineRoundedIcon fontSize="small" />
  {confirming && <Typography variant="body2">Really delete?</Typography>}
</Button>
```

---

## CRITICAL: Test-Driven Development Enforcement

**Every code change, including UI revamps, refactors, and new components, MUST include corresponding tests.** Skipping tests is never acceptable, regardless of the scope of the change.

### Mandatory Test Requirements

1. **Every new component must have a colocated test file.** When creating `MyComponent.tsx`, also create `MyComponent.test.tsx` in the same directory. No exceptions.
2. **Every new hook must have a colocated test file.** When creating `useMyHook.ts`, also create `useMyHook.test.ts`.
3. **Every new store slice must have tests.** When adding state/actions to `store.ts`, add corresponding tests in `store.test.ts`.
4. **UI revamps and refactors are NOT exempt from testing.** Replacing existing components with new ones requires tests for the new components, even if the old ones lacked tests.
5. **Bulk file creation is NOT an excuse to skip tests.** If creating 10 new files, create 10 corresponding test files.

### Test-First Workflow (Required)

1. **Before creating a new component**: Write a test that describes its expected rendering and behavior.
2. **Before creating a new hook**: Write a test that describes its expected state management and side effects.
3. **Run tests after every file change**: `pnpm test` must pass at each step.
4. **Run type checking after every file change**: `pnpm typecheck` must pass at each step.

### What to Test in Components

- **Rendering**: The component renders expected content when given props.
- **User interactions**: Clicks, input changes, form submissions produce correct behavior.
- **Conditional rendering**: Different states (loading, error, empty) show correct UI.
- **Callbacks**: Props like `onClose`, `onSave`, `onChange` are called with correct arguments.
- **Disabled states**: Buttons/inputs are disabled under the correct conditions.

### Frontend Test Conventions

- Use **Vitest** as the test runner with `@testing-library/react`.
- Test files are colocated: `MyComponent.test.tsx` next to `MyComponent.tsx`.
- Use `vi.mock()` for module mocking, `vi.fn()` for function mocks.
- Wrap MUI components in a `ThemeProvider` test wrapper.
- Use the `@vitest-environment happy-dom` pragma for component tests.

```tsx
/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const theme = createTheme();
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
```

---

## Summary Checklist

### Per-Increment (repeat for every small change)

1. ✅ Write the test first — define expected behaviour before implementing
2. ✅ Implement the minimum code to make the test pass
3. ✅ Run `pnpm test` / `pytest -v` immediately — fix failures before proceeding
4. ✅ Run `pnpm typecheck` / `make lint` immediately — fix type errors before proceeding

### Before Every Commit

5. ✅ All tests pass (full suite)
6. ✅ Zero type errors (`pnpm typecheck` / `make lint`)
7. ✅ Functionality verified end-to-end
8. ✅ Docstrings / JSDoc added or updated for all changed public APIs
9. ✅ `README.md` updated if commands, features, or structure changed
10. ✅ `changelogs/<feature>.md` created or updated
11. ✅ Auto-generated docs regenerated and committed (if applicable)
12. ✅ Generated GraphQL types (`frontend/src/generated/`, `sdk/.../generated/`) committed alongside operation changes

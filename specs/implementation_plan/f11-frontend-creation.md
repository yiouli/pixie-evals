# F11: Frontend Test Suite Creation

**Scope**: Frontend `TestSuiteCreation.tsx`, `MetricCreationModal.tsx`, `useMetrics.ts`, `useTestSuites.ts`
**Phase**: 7 (depends on F8, F10)
**Tests**: Manual

## Overview

Implement the test suite creation form and the subscription-based creation flow with real-time progress updates.

## Components

### `TestSuiteCreation` Page (`src/components/TestSuiteCreation.tsx`)

**Layout** (top to bottom):

1. **Title**: "Create Test Suite"
2. **FileUpload** (if no active dataset) or **dataset info card** (file name, row count, schema preview)
3. **Form fields**:
   - `name`: MUI `TextField`, default value = `dataset.file_name` (strip extension)
   - `description`: MUI `TextField` (multiline, optional)
   - `metrics`: Multi-select with chips showing selected metrics
     - Dropdown fetches from remote server via `useMetrics().metrics`
     - "Create New" button opens `MetricCreationModal`
   - `input_schema`: Read-only JSON display (CodeMirror or `<pre>` block) showing the inferred schema
   - Data adaptor button: Disabled with tooltip "Coming soon"
4. **Create button**: Triggers the subscription
5. **Progress dialog**: Modal showing real-time creation status

### `MetricCreationModal` (`src/components/MetricCreationModal.tsx`)

MUI `Dialog` with form:

1. `name`: `TextField` (required)
2. `description`: `TextField` (optional)
3. `type`: `Select` — "Scale" or "Category"
4. If Scale: `scaling` number input (1–10)
5. If Category: Dynamic list of category inputs (name + optional description), with add/remove buttons
6. Create button → calls `createMetric` mutation on remote server
7. On success: calls `onCreated(metricId)` and closes

### `useMetrics` Hook (`src/hooks/useMetrics.ts`)

```typescript
export function useMetrics() {
  const { data, loading, error } = useQuery(ListMetricsDocument, { client: remoteClient });
  const [createMetricMutation] = useMutation(CreateMetricDocument, { client: remoteClient });

  return {
    metrics: data?.listMetrics ?? [],
    loading,
    error,
    createMetric: async (input: { name: string; config: MetricConfigInput; description?: string }) => {
      const { data } = await createMetricMutation({ variables: input });
      return data.createMetric; // UUID
    },
  };
}
```

### Creation Progress Flow

When user clicks "Create":

1. Open a `Dialog` showing progress
2. Subscribe to SDK server's `createTestSuiteProgress` subscription via `sdkClient`:
   ```typescript
   sdkClient.subscribe({
     query: CreateTestSuiteProgressDocument,
     variables: { datasetId, input: { name, description, metricIds, inputSchema } },
   })
   ```
3. Display each progress update:
   - `CREATING`: "Creating test suite..." + spinner
   - `EMBEDDING`: "Embedding test cases..." + progress bar (0%–100%)
   - `UPLOADING`: "Uploading to server..." + progress bar
   - `COMPLETE`: Success message + action buttons
   - `ERROR`: Error message + retry button
4. On `COMPLETE`: Show dialog with:
   - "Go to Evaluation" button → `navigate(/evaluation/{testSuiteId})`
   - "Create Another" button → reset form

## GraphQL Operations Used

| Operation | Server | Source File |
|-----------|--------|-------------|
| `ListMetrics` | Remote (:8000) | `graphql/remote/operations.graphql` |
| `CreateMetric` | Remote (:8000) | `graphql/remote/operations.graphql` |
| `CreateTestSuiteProgress` | SDK (:8100) | `graphql/sdk/operations.graphql` |

## Implementation Notes

- The subscription uses WebSocket transport. The SDK's Strawberry GraphQL already supports subscriptions via `graphql-ws` protocol.
- Apollo Client needs a WebSocket link for subscriptions to the SDK server. Update `apolloClient.ts`:
  ```typescript
  import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
  import { createClient } from "graphql-ws";

  const sdkWsLink = new GraphQLWsLink(createClient({ url: "ws://localhost:8100/graphql" }));
  ```
  Use `split` to route subscriptions through WS and queries/mutations through HTTP.
- **New dependency**: `graphql-ws` (add to `package.json`)
- The `input_schema` field in `TestSuiteCreateInput` is a JSON scalar — pass the `rowSchema` dict directly
```

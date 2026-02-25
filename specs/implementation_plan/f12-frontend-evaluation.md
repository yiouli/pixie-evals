# F12: Frontend Evaluation View

**Scope**: Frontend `EvaluationView.tsx`, `LabelingModal.tsx`, `TestCaseDataGrid.tsx`, `useEvaluation.ts`
**Phase**: 8 (depends on F4, F5, F9)
**Tests**: Manual

## Overview

Implement the evaluation view for a test suite: action buttons, key metrics summary, paginated test case data grid, and manual labeling modal.

## Components

### `EvaluationView` Page (`src/components/EvaluationView.tsx`)

**Layout** (top to bottom):

1. **Header**: Test suite name (fetched from remote via `listTestSuites` or a `getTestSuite` query)
2. **Action buttons row** (MUI `ButtonGroup` or `Stack`):
   - "Manual Review" — opens `LabelingModal`
   - "Train Evaluator" — disabled, tooltip "Coming soon"
   - "Run Evaluation" — disabled, tooltip "Coming soon"
3. **Metrics summary** (MUI `Card` grid):
   - For each metric: card showing metric name + latest aggregate stats
   - For now: show "No evaluation results yet" placeholder
4. **Test case data grid**: `TestCaseDataGrid` component

### `useEvaluation` Hook (`src/hooks/useEvaluation.ts`)

```typescript
export function useEvaluation(testSuiteId: string) {
  // 1. Fetch test case IDs (paginated via filters)
  const { data: idsData } = useQuery(ListTestCaseIdsDocument, {
    client: remoteClient,
    variables: { filters: { testSuiteIds: [testSuiteId] } },
  });

  // 2. Fetch test cases with labels for current page
  const ids = idsData?.listTestCaseIds ?? [];
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const pageIds = ids.slice(page * pageSize, (page + 1) * pageSize);

  const { data: casesData, loading } = useQuery(GetTestCasesWithLabelDocument, {
    client: remoteClient,
    variables: { ids: pageIds },
    skip: pageIds.length === 0,
  });

  return {
    testCases: casesData?.getTestCasesWithLabel ?? [],
    loading,
    totalCount: ids.length,
    page, setPage,
    pageSize, setPageSize,
    // ... label submission (future)
  };
}
```

### `TestCaseDataGrid` (`src/components/TestCaseDataGrid.tsx`)

MUI X DataGrid with:

**Columns**:
| Column | Source | Width |
|--------|--------|-------|
| ID | `testCase.id` (truncated UUID) | 100 |
| Description | `testCase.description` | 200 |
| Created | `testCase.createdAt` (formatted) | 150 |
| Label Value | `label?.value` (JSON rendered) | 150 |
| Labeled At | `label?.labeledAt` (formatted) | 150 |
| Labeled By | `label?.labeler` (UUID or "—") | 100 |
| Actions | Button group | 150 |

**Actions per row**:
- "Label" — opens `LabelingModal` for this test case
- "Delete" — confirmation dialog → (not implemented yet, no-op)
- "Evaluate" — (not implemented yet, no-op)

**Pagination**: Controlled by `useEvaluation` hook.

### `LabelingModal` (`src/components/LabelingModal.tsx`)

MUI `Dialog` (fullWidth, maxWidth="lg"):

**Layout** (two-column):

Left column (60%):
- `iframe` showing the labeling UI rendered by SDK server at `/labeling-ui/{entryId}`

Right column (40%):
- For each metric associated with the test suite:
  - Metric name label
  - If metric type is "scale": MUI `Slider` (1 to scaling value)
  - If metric type is "category": MUI `Select` with category options
- Notes: MUI `TextField` (multiline)
- Submit button
- Skip / Next button (navigate to next unlabeled test case)

**On submit**:
- Call `addTestCases` mutation on remote server with the label data
- Or a future `createLabel` mutation (not yet in the remote server schema — may need to add)
- Close modal and refresh the data grid

**Test case selection for "Manual Review"**:
- Pick the first test case that does NOT have a label with `labeler` set (i.e., no human label)
- If all are labeled: show "All test cases have been reviewed" message

## GraphQL Operations Used

| Operation | Server | Purpose |
|-----------|--------|---------|
| `ListTestSuites` | Remote | Get test suite name + config |
| `ListTestCaseIds` | Remote | Get all test case IDs for the suite |
| `GetTestCasesWithLabel` | Remote | Get test case + label data for current page |
| `ListMetrics` | Remote | Get metric definitions for labeling form |
| `RenderLabelingUi` | SDK | Alternative to iframe for rendering |

## Implementation Notes

- The `entryId` for the labeling UI iframe is the **local data entry ID** from the SDK database. This means we need a mapping between remote test case IDs and local data entry IDs. Options:
  1. Store the remote test case ID in the local `data_entries` table (add a column)
  2. Store the local entry ID as the test case `description` field on the remote server
  3. Use a separate mapping table
  **Recommendation**: For MVP, use option 2 — store the local entry ID in the test case description. Revisit with a proper mapping later.
- The iframe URL is hardcoded to `localhost:8100` — the Vite proxy could be used instead (`/sdk/labeling-ui/{id}`)
- The "Train Evaluator" and "Run Evaluation" buttons are **no-op** for this phase — show "Coming soon" tooltip
- Metrics summary section shows placeholder for now — no aggregate computation implemented yet
```

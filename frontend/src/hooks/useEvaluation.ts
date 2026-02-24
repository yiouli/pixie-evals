/**
 * Hook for evaluation operations.
 *
 * Manages test case display, labeling, and evaluation results
 * for a specific test suite.
 */
export function useEvaluation(_testSuiteId: string) {
  // TODO: Implement with Apollo queries for test cases + labels
  return {
    testCases: [] as unknown[],
    loading: false,
    error: null as Error | null,
    /** Submit a manual label for a test case. */
    submitLabel: async (_testCaseId: string, _labels: unknown) => {
      throw new Error("Not implemented");
    },
    /** Pagination state. */
    page: 0,
    pageSize: 25,
    setPage: (_page: number) => {},
    setPageSize: (_size: number) => {},
    totalCount: 0,
  };
}

/**
 * Hook for test suite operations.
 *
 * Wraps remote server queries/mutations for listing and
 * creating test suites.
 */
export function useTestSuites() {
  // TODO: Implement with Apollo useQuery/useMutation
  return {
    testSuites: [] as unknown[],
    loading: false,
    error: null as Error | null,
    createTestSuite: async (_input: unknown) => {
      throw new Error("Not implemented");
    },
  };
}

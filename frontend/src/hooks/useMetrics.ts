/**
 * Hook for metric operations.
 *
 * Wraps remote server queries/mutations for listing and
 * creating metrics.
 */
export function useMetrics() {
  // TODO: Implement with Apollo useQuery/useMutation
  return {
    metrics: [] as unknown[],
    loading: false,
    error: null as Error | null,
    createMetric: async (_input: unknown) => {
      throw new Error("Not implemented");
    },
  };
}

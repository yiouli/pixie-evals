import { useTestSuiteStore, type TestSuiteInfo } from "../lib/store";
import type { MetricConfig } from "../components/MetricEditor";

/** Input for creating a test suite. */
export interface CreateTestSuiteInput {
  name: string;
  description: string;
  metrics: MetricConfig[];
  datasetId: string;
}

/**
 * Hook for test suite operations.
 *
 * Currently manages test suites in a client-side Zustand store.
 * Will be migrated to remote server queries/mutations once the
 * backend GraphQL operations are available.
 */
export function useTestSuites() {
  const testSuites = useTestSuiteStore((state) => state.testSuites);
  const addTestSuite = useTestSuiteStore((state) => state.addTestSuite);

  const createTestSuite = async (
    input: CreateTestSuiteInput,
  ): Promise<string> => {
    // TODO: Replace with remote server mutation
    const id = `test-suite-${crypto.randomUUID()}`;
    const suite: TestSuiteInfo = {
      id,
      name: input.name,
      description: input.description,
      metrics: input.metrics,
      datasetId: input.datasetId,
      createdAt: new Date().toISOString(),
    };
    addTestSuite(suite);
    return id;
  };

  return {
    testSuites,
    loading: false,
    error: null as Error | null,
    createTestSuite,
  };
}

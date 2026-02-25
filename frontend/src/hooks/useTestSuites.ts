import { useQuery } from "@apollo/client";
import { remoteClient } from "../lib/apolloClient";
import { useAuthStore } from "../lib/store";
import { LIST_TEST_SUITES } from "../graphql/remote/query";
import { CREATE_TEST_SUITE } from "../graphql/remote/mutation";
import type { MetricConfig } from "../components/MetricEditor";
import type { ListTestSuitesQuery } from "../generated/remote/graphql";

/** A test suite as returned by the ListTestSuites query. */
export type TestSuite = ListTestSuitesQuery["listTestSuites"][number];

/** Input for creating a test suite. */
export interface CreateTestSuiteInput {
  name: string;
  description: string;
  metrics: MetricConfig[];
  metricIds: string[];
  datasetId: string;
  inputSchema: unknown;
}

/**
 * Hook for test suite operations.
 *
 * Queries test suites from the remote server and provides a
 * mutation to create new ones.
 */
export function useTestSuites() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data, loading, error, refetch } = useQuery(LIST_TEST_SUITES, {
    client: remoteClient,
    skip: !isAuthenticated,
  });

  const createTestSuite = async (
    input: CreateTestSuiteInput,
  ): Promise<string> => {
    const { data: result } = await remoteClient.mutate({
      mutation: CREATE_TEST_SUITE,
      variables: {
        name: input.name,
        description: input.description || undefined,
        metricIds: input.metricIds,
        config: { inputSchema: input.inputSchema },
      },
    });
    // Refetch test suites list
    await refetch();
    return result?.createTestSuite as string;
  };

  return {
    testSuites: data?.listTestSuites ?? [],
    loading,
    error: error ?? null,
    createTestSuite,
    refetch,
  };
}

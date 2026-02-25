import { useQuery } from "@apollo/client";
import { sdkClient } from "../lib/apolloClient";
import { LIST_DATASETS } from "../graphql/sdk/query";

/**
 * Hook for fetching the list of datasets from the local SDK server.
 *
 * Uses the `LIST_DATASETS` typed document node defined in
 * `graphql/sdk/query.ts` for full type safety via GraphQL Codegen.
 */
export function useDatasets() {
  const { data, loading, error, refetch } = useQuery(
    LIST_DATASETS,
    { client: sdkClient },
  );

  return {
    datasets: data?.listDatasets ?? [],
    loading,
    error: error ?? null,
    refetch,
  };
}

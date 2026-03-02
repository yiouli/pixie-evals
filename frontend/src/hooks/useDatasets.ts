import { useQuery } from "@apollo/client";
import { sdkClient } from "../lib/apolloClient";
import { LIST_DATASETS } from "../graphql/sdk/query";
import type { ListDatasetsQuery } from "../generated/sdk/graphql";

/** A single dataset item derived from the LIST_DATASETS query result. */
export type DatasetItem = ListDatasetsQuery["listDatasets"][number];

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

  const datasets: DatasetItem[] = data?.listDatasets ?? [];

  return {
    datasets,
    loading,
    error: error ?? null,
    refetch,
  };
}

import { gql, useQuery } from "@apollo/client";
import { sdkClient } from "../lib/apolloClient";

const LIST_DATASETS = gql`
  query ListDatasets {
    listDatasets {
      id
      fileName
      createdAt
      rowSchema
    }
  }
`;

/** Shape of a dataset returned by the SDK server. */
export interface Dataset {
  id: string;
  fileName: string;
  createdAt: string;
  rowSchema: Record<string, unknown> | string;
}

interface ListDatasetsData {
  listDatasets: Dataset[];
}

/**
 * Hook for fetching the list of datasets from the local SDK server.
 */
export function useDatasets() {
  const { data, loading, error, refetch } = useQuery<ListDatasetsData>(
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

import { useQuery, useMutation } from "@apollo/client";
import { remoteClient } from "../lib/apolloClient";
import { LIST_METRICS } from "../graphql/remote/query";
import { CREATE_METRIC } from "../graphql/remote/mutation";
import type { ListMetricsQuery } from "../generated/remote/graphql";

/** A metric as returned by the ListMetrics query. */
export type Metric = ListMetricsQuery["listMetrics"][number];

/** Input for creating a new metric via the remote server. */
export interface CreateMetricInput {
  name: string;
  description?: string;
  config: {
    type: string;
    categories?: unknown;
    scaling?: number;
  };
}

/**
 * Hook for metric operations.
 *
 * Wraps remote server queries/mutations for listing and
 * creating metrics.
 */
export function useMetrics() {
  const { data, loading, error, refetch } = useQuery(LIST_METRICS, {
    client: remoteClient,
  });

  const [createMetricMutation] = useMutation(CREATE_METRIC, {
    client: remoteClient,
  });

  const createMetric = async (input: CreateMetricInput): Promise<string> => {
    const { data: result } = await createMetricMutation({
      variables: {
        name: input.name,
        description: input.description,
        config: input.config,
      },
    });
    // Refetch the metrics list after creation
    await refetch();
    return result?.createMetric as string;
  };

  return {
    metrics: data?.listMetrics ?? [],
    loading,
    error: error ?? null,
    createMetric,
    refetch,
  };
}

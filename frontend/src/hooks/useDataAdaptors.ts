import { useQuery } from "@apollo/client";
import { remoteClient } from "../lib/apolloClient";
import { useAuthStore } from "../lib/store";
import { LIST_DATA_ADAPTORS } from "../graphql/remote/query";
import { CREATE_DATA_ADAPTOR } from "../graphql/remote/mutation";
import type {
  ListDataAdaptorsQuery,
  DataAdaptorConfigInput,
} from "../generated/remote/graphql";
import type { AdaptorField } from "../lib/schemaUtils";

/** A data adaptor as returned by the ListDataAdaptors query. */
export type DataAdaptor = ListDataAdaptorsQuery["listDataAdaptors"][number];

/** Parsed config from a DataAdaptor. */
export interface DataAdaptorConfig {
  inputSchema: Record<string, unknown>;
  fields: AdaptorField[];
  metadata?: Record<string, unknown>;
}

/**
 * Parse the raw JSON config from a DataAdaptor into a typed config object.
 *
 * @param config - Raw JSON config from the GraphQL response.
 * @returns Parsed DataAdaptorConfig, or null if parsing fails.
 */
export function parseAdaptorConfig(
  config: unknown,
): DataAdaptorConfig | null {
  if (!config || typeof config !== "object") return null;
  const raw = config as Record<string, unknown>;
  return {
    inputSchema: (raw.input_schema as Record<string, unknown>) ?? {},
    fields: ((raw.fields as Array<Record<string, unknown>>) ?? []).map(
      (f) => ({
        schemaPath: (f.schema_path as string) ?? "",
        name: (f.name as string) ?? "",
        description: f.description as string | undefined,
      }),
    ),
    metadata: raw.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * Find an adaptor that matches a specific dataset ID from a list of adaptors.
 *
 * @param adaptors - List of data adaptors.
 * @param datasetId - The dataset ID to match.
 * @returns The matching adaptor, or undefined if not found.
 */
export function findAdaptorForDataset(
  adaptors: DataAdaptor[],
  datasetId: string,
): DataAdaptor | undefined {
  return adaptors.find((adaptor) => {
    const config = parseAdaptorConfig(adaptor.config);
    return config?.metadata?.dataset_id === datasetId;
  });
}

/**
 * Hook for data adaptor operations.
 *
 * Queries data adaptors for a test suite from the remote server
 * and provides a function to create new ones.
 */
export function useDataAdaptors(testSuiteId: string | null) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data, loading, error, refetch } = useQuery(LIST_DATA_ADAPTORS, {
    client: remoteClient,
    variables: { testSuiteId: testSuiteId! },
    skip: !testSuiteId || !isAuthenticated,
  });

  /**
   * Create a new data adaptor on the remote server.
   *
   * @param name - Name for the adaptor.
   * @param inputSchema - The input JSON schema (dataset row schema).
   * @param fields - Adaptor field mappings.
   * @param datasetId - Optional dataset ID to associate via metadata.
   * @param description - Optional description.
   * @returns The created adaptor's UUID.
   */
  const createDataAdaptor = async (params: {
    name: string;
    inputSchema: Record<string, unknown>;
    fields: AdaptorField[];
    datasetId?: string;
    description?: string;
  }): Promise<string> => {
    if (!testSuiteId) throw new Error("No test suite ID provided");

    const config: DataAdaptorConfigInput = {
      inputSchema: params.inputSchema,
      fields: params.fields.map((f) => ({
        name: f.name,
        schema_path: f.schemaPath,
        ...(f.description ? { description: f.description } : {}),
      })),
      ...(params.datasetId
        ? { metadata: { dataset_id: params.datasetId } }
        : {}),
    };

    const { data: result } = await remoteClient.mutate({
      mutation: CREATE_DATA_ADAPTOR,
      variables: {
        name: params.name,
        testSuiteId,
        config,
        description: params.description,
      },
    });

    await refetch();
    return result?.createDataAdaptor as string;
  };

  return {
    adaptors: data?.listDataAdaptors ?? [],
    loading,
    error: error ?? null,
    createDataAdaptor,
    refetch,
  };
}

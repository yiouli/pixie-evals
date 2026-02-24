/**
 * Hook for dataset upload operations.
 *
 * Wraps the SDK server's file upload REST endpoint and
 * dataset GraphQL queries.
 */
export function useDatasetUpload() {
  // TODO: Implement file upload + SDK GraphQL subscription
  return {
    /** Upload a file to the SDK server. */
    uploadFile: async (_file: File) => {
      throw new Error("Not implemented");
    },
    /** Active dataset after upload. */
    dataset: null as unknown,
    /** Whether an upload is in progress. */
    uploading: false,
    /** Upload error, if any. */
    error: null as Error | null,
  };
}

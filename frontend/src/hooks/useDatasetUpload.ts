import { useState, useCallback } from "react";
import { useDatasetStore } from "../lib/store";

/** Dataset returned by the uploadFile mutation. */
export interface UploadedDataset {
  id: string;
  fileName: string;
  createdAt: string;
  rowSchema: unknown;
}

/**
 * Hook for uploading a dataset file to the local SDK server.
 *
 * Sends a single GraphQL multipart request per the
 * https://github.com/jaydenseric/graphql-multipart-request-spec spec.
 * No separate REST endpoint or extra dependencies needed.
 *
 * Returns the uploaded dataset from `uploadFile` so callers can act
 * on success without watching state changes.
 */
export function useDatasetUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [dataset, setDataset] = useState<UploadedDataset | null>(null);
  const setCurrentDataset = useDatasetStore((state) => state.setCurrentDataset);

  const uploadFile = async (file: File): Promise<UploadedDataset | null> => {
    setUploading(true);
    setError(null);

    try {
      // Build the multipart body per the GraphQL multipart request spec:
      // 1. "operations" — the GraphQL request (file variable set to null)
      // 2. "map"        — maps the file field to the variable path
      // 3. "0"          — the actual file binary
      const formData = new FormData();
      formData.append(
        "operations",
        JSON.stringify({
          query: `
            mutation UploadFile($file: Upload!) {
              uploadFile(file: $file) {
                id
                fileName
                createdAt
                rowSchema
              }
            }
          `,
          variables: { file: null },
        }),
      );
      formData.append("map", JSON.stringify({ "0": ["variables.file"] }));
      formData.append("0", file);

      const response = await fetch("http://localhost:8100/graphql", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const json = (await response.json()) as {
        data?: { uploadFile: UploadedDataset };
        errors?: { message: string }[];
      };

      if (json.errors?.length) {
        throw new Error(json.errors[0]?.message ?? "GraphQL error");
      }

      if (!json.data) {
        throw new Error("No data returned from server");
      }

      const ds = json.data.uploadFile;
      setDataset(ds);
      setCurrentDataset(ds.id);
      return ds;
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Upload failed"));
      return null;
    } finally {
      setUploading(false);
    }
  };

  /** Reset hook state (useful when reopening the upload dialog). */
  const reset = useCallback(() => {
    setDataset(null);
    setError(null);
  }, []);

  return { uploadFile, dataset, uploading, error, reset };
}

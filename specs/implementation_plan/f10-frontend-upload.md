# F10: Frontend Dataset Upload

**Scope**: Frontend `FileUpload.tsx`, `useDatasetUpload.ts`, `apolloClient.ts`
**Phase**: 6 (depends on F3 — SDK upload mutation)
**Tests**: Manual

## Overview

Implement the file upload UI that sends a file directly to the SDK GraphQL server via a single multipart mutation (using Strawberry's `Upload` scalar), then navigates to the test suite creation view.

## Dependencies

Install `apollo-upload-client` to handle the [GraphQL multipart request spec](https://github.com/jaydenseric/graphql-multipart-request-spec) automatically with Apollo Client:

```bash
pnpm add apollo-upload-client
pnpm add -D @types/apollo-upload-client
```

## Apollo Client Configuration

Replace `HttpLink` with `createUploadLink` from `apollo-upload-client` in `apolloClient.ts`:

```typescript
import { ApolloClient, InMemoryCache } from "@apollo/client";
import createUploadLink from "apollo-upload-client/createUploadLink.mjs";

export const sdkClient = new ApolloClient({
  link: createUploadLink({ uri: "http://localhost:8100/graphql" }),
  cache: new InMemoryCache(),
});
```

`createUploadLink` is a drop-in replacement for `HttpLink` — it automatically detects `File`/`Blob` variables and encodes the request as `multipart/form-data` per the spec; regular (non-file) mutations continue to work as JSON.

## GraphQL Mutation

```graphql
mutation UploadDataset($file: Upload!) {
  uploadFile(file: $file) {
    id
    fileName
    rowSchema
    createdAt
  }
}
```

## Components

### `useDatasetUpload` Hook (`src/hooks/useDatasetUpload.ts`)

```typescript
export function useDatasetUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [dataset, setDataset] = useState<DatasetType | null>(null);
  const { setActiveDataset } = useDatasetStore();

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      // Single multipart GraphQL mutation — apollo-upload-client handles encoding
      const { data } = await sdkClient.mutate({
        mutation: UploadDatasetDocument,
        variables: { file },
      });

      const ds = data.uploadFile;
      setDataset(ds);
      setActiveDataset(ds.id, ds.rowSchema);
    } catch (e) {
      setError(e as Error);
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, dataset, uploading, error };
}
```

### `FileUpload` Component (`src/components/FileUpload.tsx`)

MUI-based file upload:

1. Drag-and-drop zone (MUI `Box` with dashed border + `onDrop`)
2. Or click to open file picker (`<input type="file" hidden />`)
3. Accept: `.json`, `.jsonl`, `.csv`, `.parquet`
4. Show file name + size after selection
5. Upload button
6. Loading state with `LinearProgress`
7. Error display with `Alert`
8. On success: navigate to `/create`

**Where in the app**: The `TestSuiteCreation` page includes `FileUpload` as a step if no dataset is active, or shows the creation form if a dataset is already loaded.

## Integration with Test Suite Creation

After upload, the `DatasetStore` in Zustand has:
- `activeDatasetId` — UUID of the created dataset
- `rowSchema` — inferred JSON schema

The `TestSuiteCreation` component reads these to:
- Default the test suite name to `dataset.fileName`
- Default `input_schema` to `rowSchema`

## Implementation Notes

- `apollo-upload-client`'s `createUploadLink` detects `File` objects in mutation variables and automatically encodes the request as `multipart/form-data`, following the [GraphQL multipart request spec](https://github.com/jaydenseric/graphql-multipart-request-spec)
- The SDK server must have `multipart_uploads_enabled=True` on its `GraphQLRouter` (configured in F3)
- The previous two-step approach (separate REST `POST /upload` + GraphQL mutation) is replaced by this single call
- The SDK server's CORS config must allow `localhost:5173` (already planned in server setup)

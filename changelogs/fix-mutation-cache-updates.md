# Fix: Apollo Cache Update After Dataset Upload

## What Changed

After uploading a dataset via `useDatasetUpload`, the hook now calls
`sdkClient.refetchQueries({ include: [LIST_DATASETS] })` to invalidate
the Apollo client cache for the `LIST_DATASETS` query.

## Why

`useDatasetUpload` uses a raw `fetch()` request (required for multipart
file uploads). Because it bypasses the Apollo client, uploading a new
dataset never updated the `LIST_DATASETS` query result held in the cache.
This caused two user-facing bugs:

- **SelectionView**: a newly uploaded dataset did not appear in the
  "Datasets" tab until the user navigated away and back.
- **TestSuiteConfigDialog**: the dataset dropdown did not show the
  newly uploaded dataset, so users could not immediately select it for a
  new evaluation.

All other mutations in the codebase already call `refetch()` on the
relevant query after completion; this change brings dataset upload in line
with that pattern.

## Files Affected

- `frontend/src/hooks/useDatasetUpload.ts` — added `sdkClient.refetchQueries`
  call and the corresponding imports after a successful upload.

## Migration Notes

No API or schema changes. No migration required.

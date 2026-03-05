# Dataset Generation: Schema Validation & Error Handling

## What Changed

### UI Error Display

- Schema validation errors from the backend are now displayed in a red Alert with multi-line formatting (whiteSpace: pre-wrap)
- Individual entry generation errors are tracked and shown in a warning Alert
- Error state badge appears in the dialog title

### Deferred Dataset Creation

- Dataset is only created when the first successful entry is generated
- If schema validation fails or all entries fail, no dataset is created
- Uses `ensureLocalDataset` pattern with `datasetCreatedRef` for idempotent creation

## Files Affected

- `frontend/src/components/GenerateDatasetDialog.tsx` — Main changes
- `frontend/src/components/GenerateDatasetDialog.test.tsx` — 3 new tests

## Migration Notes

No API or schema changes. Works with existing GraphQL subscription types.

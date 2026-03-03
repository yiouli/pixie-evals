# Manual Labeling View Improvements

## What Changed

Three improvements to the manual labeling dialog:

### 1. Default JSON rendering when no custom labeling HTML exists

When no custom labeling HTML page is registered for a test suite, the dialog
now fetches the raw input data from the SDK REST API (`/api/inputs/{id}`) and
renders it using `react18-json-view` instead of showing nothing.

The backend `getLabelingHtml` GraphQL query now returns `null` (instead of
throwing an error) when no labeling component is registered, allowing the
frontend to gracefully fall back.

### 2. Input data cleaning in labeling HTML generation

When generating the labeling HTML, the raw data entry is now filtered according
to the test suite's `input_schema`. Extra properties not defined in the schema's
`properties` are removed before injection into the HTML. This ensures the
labeling page only receives the relevant input fields.

### 3. Metric-specific rating UX

The per-metric rating inputs now render according to each metric's configuration:

- **Binary** (scale with `scaling=1`): Cross/check icon buttons for 0/1 values
- **Scale** (`scaling >= 2`): Slider with correct range (1 to scaling value)
- **Category**: Toggle button group with one button per category

Previously, all metrics used a generic 0-10 slider regardless of type.

## Files Affected

### Backend (SDK)

- `sdk/pixie_sdk/graphql.py` — `get_labeling_html` now returns `Optional[str]`,
  cleans input data per input schema, returns `None` when no component found
- `sdk/tests/test_server.py` — Updated test for null return, added test for
  input data cleaning

### Frontend

- `frontend/src/components/ManualLabelingDialog.tsx` — Added `LabelingMetric`
  interface, `MetricRatingInput` component, JSON view fallback, REST API fetch
- `frontend/src/components/ManualLabelingDialog.test.tsx` — Updated tests for
  new metric config interface, added JSON view fallback test
- `frontend/src/components/TestSuiteView.tsx` — Passes full metric config to
  dialog, updated rating type to `number | string`
- `frontend/package.json` — Added `react18-json-view` dependency

## Migration Notes

- The `getLabelingHtml` GraphQL query return type changed from `String!` to
  `String` (nullable). Frontend code that relied on the query always returning
  a string or throwing should handle `null` as "no custom HTML available".
- The `ManualLabelingDialog` `metrics` prop now expects `LabelingMetric[]`
  (with `config` field) instead of `Array<{id, name}>`.
- The `onSave` callback now receives `Record<string, number | string>` instead
  of `Record<string, number>` to support category metric string values.

# Pixie SDK

Local SDK server for Pixie AI Evals — manages datasets, renders custom labeling UIs, and proxies to the remote Pixie server.

## Installation

```bash
pip install -e .
```

## Running

```bash
python -m pixie_sdk.server
```

The server starts on port 8100 (override with `PIXIE_SDK_PORT`).

## GraphQL API

Access the interactive playground at http://localhost:8100/graphql

## REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/graphql` | Strawberry GraphQL endpoint (queries, mutations, subscriptions) |
| `GET` | `/api/inputs/{id}` | Load a raw input object from SQLite by entry/test-case UUID |
| `GET` | `/api/components` | List all registered labeling page slot names (re-scans on every call) |
| `GET` | `/health` | Health check |

### Key GraphQL Queries for Labeling

| Query | Description |
|-------|-------------|
| `getLabelingHtml(testCaseId: UUID!)` | Returns injected HTML for a labeling page (replaces the old REST `/labeling/` endpoint) |
| `listLabelingComponents` | Lists all registered labeling component slot names |

---

## Custom Labeling UI

The SDK lets you build a fully custom labeling page per test suite using plain HTML.

### How it works

1. You place `.html` files in a `labeling/` folder next to where you run the server.
2. The server discovers and registers every `.html` file in that folder. The
   directory is **re-scanned on every request** so files added or modified after
   startup are picked up immediately.
3. When a labeling page is requested via the `getLabelingHtml` GraphQL query,
   the server reads your HTML, fetches the input object from SQLite, and
   **replaces** the placeholder script block with the actual data.
4. The injected HTML string is returned to the frontend and rendered via iframe `srcdoc`.

### Data injection

Your HTML must contain exactly one placeholder block:

```html
<script pixie-evals-labeling-input>
  window.INPUT=undefined;
</script>
```

At serve time the framework replaces the entire block with:

```html
<script pixie-evals-labeling-input>
window.INPUT={"field": "value", ...};
</script>
```

You then access `window.INPUT` freely anywhere in your page scripts.

### Generating a scaffold

Run the `scaffoldLabelingComponent` GraphQL mutation (or use the frontend
"Scaffold UI" button) to generate a starter HTML and TypeScript type definition
file for a given test suite:

```graphql
mutation {
  scaffoldLabelingComponent(testSuiteId: "<uuid>")
}
```

This creates two files in your `labeling/` folder:

```
labeling/
  my_test_suite.html    ← your labeling page (edit this)
  my_test_suite.d.ts    ← TypeScript types for INPUT (optional, for editor support)
```

Both files are named after the **normalized** (snake_case) test suite name.
Test suite names are unique on the remote server, which guarantees no collisions.

### Editing the scaffold

Open `labeling/<suite_name>.html` and customize freely. A minimal starting point
(what the scaffold generates) looks like this:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Manual Labeling | My Test Suite</title>
</head>
<body>
  <div id="app-container"></div>
  <script pixie-evals-labeling-input>
    window.INPUT=undefined;
  </script>
  <script>
    // The INPUT variable is injected by the pixie-evals framework.
    // See my_test_suite.d.ts for the TypeScript type definition.
    // Customize this page to display your test case data for labeling.
    const container = document.getElementById('app-container');
    const preElement = document.createElement('pre')
    preElement.textContent = JSON.stringify(window.INPUT, undefined, 2);
  </script>
</body>
</html>
```

You can use any HTML/CSS/JavaScript you like — Vanilla JS, CDN-loaded React,
Alpine.js, etc. The only requirement is the `<script pixie-evals-labeling-input>` block.

### Customising the components folder

The default folder is `labeling/` relative to the working directory where you
start the server. Override it before calling `serve()`:

```python
from pixie_sdk.components import set_components_dir
set_components_dir("./my_labeling_pages")
```

### GraphQL query

The labeling page is fetched via the `getLabelingHtml` GraphQL query with the
**remote test case UUID**:

```graphql
query GetLabelingHtml($testCaseId: UUID!) {
  getLabelingHtml(testCaseId: $testCaseId)
}
```

The query requires a `Bearer` token in the `Authorization` header. Internally it:
1. Authenticates with the JWT token
2. Fetches the test case from the remote pixie-server to get the test suite
3. Re-scans the components directory (picks up new/changed `.html` files)
4. Converts the test suite name to snake_case to find the HTML file
5. Fetches the input data from local SQLite via `test_case_map`
6. Injects the data and returns the HTML string

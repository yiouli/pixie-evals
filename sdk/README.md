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
| `GET` | `/labeling/{suite_name}?id={entry_id}` | Serve custom labeling HTML page with input data injected |
| `GET` | `/api/inputs/{id}` | Load a raw input object from SQLite by entry/test-case UUID |
| `GET` | `/api/components` | List all registered labeling page slot names |
| `GET` | `/health` | Health check |

---

## Custom Labeling UI

The SDK lets you build a fully custom labeling page per test suite using plain HTML.

### How it works

1. You place `.html` files in a `labeling/` folder next to where you run the server.
2. At startup the server discovers and registers every `.html` file in that folder.
3. When a labeling page is requested the server reads your HTML, fetches the input
   object from SQLite, and **replaces** the placeholder script block with the actual data.
4. The injected page is served inside the frontend's iframe.

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

### URL routing

The page for suite `"My Test Suite"` is served at:

```
GET /labeling/my_test_suite?id=<entry_uuid>
```

The slot name (URL segment) is the HTML filename stem — the same snake_case
name used by the scaffold.

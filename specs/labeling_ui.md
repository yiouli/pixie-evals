# Spec: Custom Labeling UI System

## Overview & Design Philosophy

Users define a custom labeling page per test suite as a **plain HTML file**. The framework:

1. **Discovers** all `.html` files in a designated folder automatically at startup.
2. **Scaffolds** new HTML + TypeScript definition files via the `scaffoldLabelingComponent` GraphQL mutation.
3. **Injects** the input object into the HTML at serve time by replacing a known placeholder script block with the actual data.
4. **Serves** each page at `/labeling/<test_case_id>` (remote test case UUID) with `Authorization: Bearer` header authentication.

No bundling, no build step, no framework lock-in. Users can use Vanilla JS, a CDN-loaded library, or anything that runs in a browser.

---

## Folder Convention

```
my_project/
  labeling/                     ← the components folder (configurable, default: "labeling")
    trace_comparison.html       ← labeling page for the "Trace Comparison" test suite
    trace_comparison.d.ts       ← TypeScript types for INPUT (optional, for editor support)
    llm_output_review.html
    llm_output_review.d.ts
  main.py
```

Every `.html` file directly inside the folder (non-recursive) is treated as one labeling component. The filename stem becomes the URL slot.

---

## HTML File Contract

Each `.html` file must contain exactly one placeholder block:

```html
<script pixie-evals-labeling-input>
  window.INPUT = undefined;
</script>
```

The `window.INPUT=undefined` initialiser is only there so the file is valid HTML with a sensible default when opened directly in a browser without the server. At serve time the framework replaces the **entire block** with:

```html
<script pixie-evals-labeling-input>
  window.INPUT={"field": "value", ...};
</script>
```

`window.INPUT` is then available to all other scripts on the page.

### Rules

| Rule                      | Detail                                                                   |
| ------------------------- | ------------------------------------------------------------------------ |
| Placeholder required      | The `<script pixie-evals-labeling-input>` block must appear exactly once |
| File name = route segment | `trace_comparison.html` → `/labeling/trace_comparison`                   |
| No sub-folders            | Only files directly in the `labeling/` dir are registered                |
| `.html` only              | `.tsx`, `.jsx`, `.js` and other types are ignored                        |

---

## System Architecture

```
User's project/
  labeling/
    trace_comparison.html  ──read──▶  replace placeholder  ──serve──▶  browser
    llm_output_review.html

FastAPI routes:
  GET /labeling/{test_case_id}                      → HTML page with data injected
      (Authorization: Bearer <token> header)           (requires auth)
  GET /api/inputs/{id}                              → raw input object (JSON)
  GET /api/components                               → list of registered slot names
```

---

## File Structure

```
pixie_sdk/
  components/
    __init__.py    # Public API: set_components_dir(), PLACEHOLDER_ATTR constant
    registry.py   # In-memory slot → HTML path store
    scanner.py    # Walks labeling/ folder and registers .html files at startup
    server.py     # FastAPI routes: /labeling/*, /api/inputs/*, /api/components
    scaffold.py   # Generates .html + .d.ts scaffold files
```

---

## `components/__init__.py`

```python
PLACEHOLDER_ATTR = "pixie-evals-labeling-input"

def set_components_dir(path: str | Path) -> None: ...
def get_components_dir() -> Path: ...
```

---

## `components/registry.py`

```python
@dataclass
class RegisteredComponent:
    slot: str       # e.g. "trace_comparison"
    src_path: Path  # absolute path to the user's .html file

def get_component(slot: str) -> RegisteredComponent | None: ...
def set_component(slot: str, component: RegisteredComponent) -> None: ...
def list_slots() -> list[str]: ...
def clear() -> None: ...
```

---

## `components/scanner.py`

### `scan_and_register(components_dir: Path) -> list[str]`

Called once in the FastAPI lifespan. Registers every `.html` file using its stem as the slot name.

---

## `components/server.py`

#### `GET /labeling/{test_case_id}` (requires `Authorization: Bearer <token>` header)

The `test_case_id` is a **remote test case UUID**. The frontend fetches
this endpoint using `fetch()` with the Authorization header and renders
the response via `<iframe srcdoc=...>`.

Resolution flow:

1. **Authenticate** — extract the JWT from the `Authorization: Bearer`
   header. Return 401 if missing.
2. **Validate UUID** — parse `test_case_id` as a UUID. Return 400 if
   invalid.
3. **Resolve test case** — call `RemoteClient(auth_token=token).get_test_case(uuid)`
   to fetch the test case and its `testSuite` foreign key.
4. **Resolve test suite** — call `RemoteClient.get_test_suite(suite_id)`
   to get the suite name.
5. **Find labeling page** — convert suite name to snake_case, look up
   the slot in the registry. Return 404 if not found.
6. Read the HTML file from disk.
7. Fetch the input data from SQLite via `test_case_map` → `data_entries`.
8. Replace the placeholder block:
   ```python
   pattern = rf"<script\s+{re.escape(PLACEHOLDER_ATTR)}>[^<]*</script>"
   injection = f'<script {PLACEHOLDER_ATTR}>\nwindow.INPUT={json.dumps(data)};\n</script>'
   html = re.sub(pattern, injection, html, flags=re.DOTALL)
   ```
9. Return as `HTMLResponse`.

#### `GET /api/inputs/{id}`

Returns the raw input object as JSON.

#### `GET /api/components`

Returns `{"slots": [...]}`.

---

## `components/scaffold.py`

### `scaffold_component(test_suite_id, components_dir, *, remote_client) -> tuple[Path, Path]`

Generates two files named after the normalized (snake_case) test suite name:

| File               | Name                | Content                                                    |
| ------------------ | ------------------- | ---------------------------------------------------------- |
| HTML labeling page | `{snake_name}.html` | Minimal HTML with placeholder + starter display script     |
| TypeScript types   | `{snake_name}.d.ts` | `InputProps` interface + `declare const INPUT: InputProps` |

Because test suite names are unique on the remote server, normalized names are also unique — no UUID needed.

### Scaffolded HTML

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Manual Labeling | {suite_name}</title>
  </head>
  <body>
    <div id="app-container"></div>
    <script pixie-evals-labeling-input>
      window.INPUT = undefined;
    </script>
    <script>
      // The INPUT variable is injected by the pixie-evals framework.
      // See {suite_name}.d.ts for the TypeScript type definition.
      // Customize this page to display your test case data for labeling.
      const container = document.getElementById("app-container");
      const preElement = document.createElement("pre");
      preElement.textContent = JSON.stringify(window.INPUT, undefined, 2);
    </script>
  </body>
</html>
```

---

## Triggering Scaffold

```graphql
mutation {
  scaffoldLabelingComponent(testSuiteId: "adf79684-0327-4261-9f6f-70719c0c947b")
}
```

Returns the relative path of the created `.html` file (e.g. `"labeling/trace_comparison.html"`).

---

## URL Routing Summary

The labeling endpoint uses the **remote test case UUID** as the sole URL parameter. The server resolves the test suite name internally.

| Test suite name     | Normalized name     | HTML file                         | Route                            |
| ------------------- | ------------------- | --------------------------------- | -------------------------------- |
| `Trace Comparison`  | `trace_comparison`  | `labeling/trace_comparison.html`  | `GET /labeling/{test_case_uuid}` |
| `LLM Output Review` | `llm_output_review` | `labeling/llm_output_review.html` | `GET /labeling/{test_case_uuid}` |

All routes require the `Authorization: Bearer <token>` header.

---

## End-to-End Flow

### Setup (once)

```bash
uv run python -m pixie_sdk.server
```

### Scaffold a labeling page

```graphql
mutation {
  scaffoldLabelingComponent(testSuiteId: "<uuid>")
}
```

Two files are created in `labeling/`:

- `<suite_name>.html` — customize this
- `<suite_name>.d.ts` — TypeScript types for `window.INPUT`

### Access the labeling page

The frontend opens the Manual Label dialog, which calls:

```javascript
fetch(`${SDK_BASE_URL}/labeling/${testCaseId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

What happens on the server:

1. FastAPI extracts the JWT from the `Authorization` header
2. Queries the remote pixie-server for the test case → gets its `testSuite` FK
3. Queries the remote pixie-server for the test suite → gets its name and config
4. Converts the suite name to snake_case → looks up the slot in the registry
5. If no labeling page found → returns `null` (frontend falls back to JSON viewer)
6. Reads the HTML file from disk
7. Fetches the input data from local SQLite via `test_case_map` → `data_entries`
8. **Cleans the input data** — removes properties not in the test suite's `input_schema`
9. Replaces the `<script pixie-evals-labeling-input>` block with `window.INPUT={...}`
10. Returns the modified HTML

The frontend renders it via `<iframe srcDoc={htmlContent}>`.

When `getLabelingHtml` returns `null` (no custom HTML), the frontend fetches
the raw input data from `GET /api/inputs/{testCaseId}` and renders it
using `react18-json-view` as a default display.

---

## Testing Requirements

- `test_registry.py`: Basic set/get/list/clear operations.
- `test_scanner.py`: Temp dir with two `.html` files. Assert two entries registered. Assert non-`.html` files are ignored. Assert missing dir returns empty list.
- `test_scaffold.py`: Assert `.html` and `.d.ts` files created with correct names (snake_case) and content (placeholder present, suite name in title).
- `test_components_init.py`: Assert `set_components_dir` updates the dir; assert `PLACEHOLDER_ATTR` equals `"pixie-evals-labeling-input"`.
- `test_server.py`: Labeling page requires `Authorization` header (401 without). Full pipeline with auth header (mock RemoteClient for test case + suite resolution). 404 when test case not found. 404 when no HTML registered for suite.
- `test_e2e_labeling.py`: Full integration — create a test suite + entry, scaffold, serve via `Authorization: Bearer` header, assert `window.INPUT` is injected with the correct JSON.

# F5: Labeling UI Rendering

**Scope**: server.py (REST), graphql.py (query)
**Phase**: 2 (depends on F2)
**Tests**: test_server.py, test_graphql.py

## Overview

Render a Jinja2 template with a data entry's content, producing HTML that the frontend embeds in an iframe for labeling.

## Endpoints to Implement

### REST: `GET /labeling-ui/{entry_id}?template={name}`

1. Parse `entry_id` as UUID
2. Get DB connection, call `db.get_data_entry(conn, entry_id)`
3. Return 404 if not found
4. Load Jinja2 template from `TEMPLATES_DIR`:
   - If `template` query param is provided: use `{template}.html.j2`
   - Otherwise: use `default.html.j2`
5. Render template with context: `{"entry_id": entry_id, "data": entry_data}`
6. Return as `HTMLResponse`

### GraphQL Query: `render_labeling_ui(entry_id, template_name) -> str`

Same logic as the REST endpoint but returns the HTML as a string. This provides an alternative for frontends that want to use GraphQL for everything.

## Template System

The default template already exists at default.html.j2:

```html
<h3>Test Case</h3>
<pre>{{ data | tojson(indent=2) }}</pre>
```

**Jinja2 setup**:
```python
from jinja2 import Environment, FileSystemLoader

_jinja_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=True,
)
```

Create this as a module-level singleton in server.py or a new `rendering.py` module.

## Test Plan

### `test_server.py`

| Test | Setup | Assertion |
|------|-------|-----------|
| `test_labeling_ui_returns_html` | Create dataset + entry, GET `/labeling-ui/{id}` | 200, content-type `text/html`, contains entry data |
| `test_labeling_ui_not_found` | GET with random UUID | 404 |
| `test_labeling_ui_custom_template` | Create custom template file, GET with `?template=custom` | Uses custom template |

### `test_graphql.py`

| Test | Setup | Assertion |
|------|-------|-----------|
| `test_render_labeling_ui_returns_html` | Mock `db.get_data_entry` | Returns HTML string containing the data |
| `test_render_labeling_ui_not_found` | Mock → `None` | Raises error or returns empty |

## Implementation Notes

- The iframe in the frontend's `LabelingModal` points to `http://localhost:8100/labeling-ui/{entryId}` — the REST endpoint
- The GraphQL `renderLabelingUi` query is an alternative path for the same functionality
- Templates could be user-customizable in the future (stored in DB or fetched from remote server)
- `autoescape=True` for security since we're rendering HTML
```

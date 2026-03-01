"""Generate the self-contained HTML shell page served for each labeling component.

The shell page:
1. Sets up React via an import-map pointing to vendored ESM files.
2. Dynamically imports the component bundle from ``/api/components/{name}.js``.
3. Fetches the input object from ``/api/inputs/{id}``.
4. Renders the component with the fetched data spread as props.
5. Shows a loading state and in-page error for each failure mode.

See Also:
    ``_server.labeling_page`` — the route handler that calls ``render_shell()``.
"""

from __future__ import annotations

# ============================================================================
# Template
# ============================================================================

SHELL_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <script type="importmap">
  {{
    "imports": {{
      "react":             "/vendor/react.mjs",
      "react-dom/client":  "/vendor/react-dom-client.mjs",
      "react/jsx-runtime": "/vendor/react-jsx-runtime.mjs"
    }}
  }}
  </script>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: system-ui, sans-serif; padding: 24px; background: #f9f9f9; }}
    #root {{ max-width: 960px; margin: 0 auto; }}
    #state-loading {{ color: #666; padding: 40px; text-align: center; }}
    #state-error {{
      color: #c00; background: #fff0f0; border: 1px solid #f99;
      border-radius: 6px; padding: 16px; margin: 16px 0;
    }}
    #state-error pre {{ font-size: 12px; margin-top: 8px; white-space: pre-wrap; }}
  </style>
</head>
<body>
  <div id="root">
    <div id="state-loading">Loading...</div>
  </div>

  <script type="module">
    import * as ReactDOM from "react-dom/client";
    import * as React from "react";

    const COMPONENT_NAME = "{component_name}";
    const INPUT_ID = "{input_id}";

    function showError(title, detail) {{
      const root = document.getElementById("root");
      root.innerHTML = `
        <div id="state-error">
          <strong>${{title}}</strong>
          <pre>${{detail}}</pre>
        </div>`;
    }}

    async function main() {{
      // 1. Load the component bundle
      let ComponentModule;
      try {{
        ComponentModule = await import(`/api/components/${{COMPONENT_NAME}}.js`);
      }} catch (err) {{
        showError("Failed to load component", err.message);
        return;
      }}

      const Component = ComponentModule.default;
      if (!Component) {{
        showError("Invalid component", `${{COMPONENT_NAME}}.js has no default export.`);
        return;
      }}

      // 2. Fetch the input object
      let inputData;
      try {{
        const res = await fetch(`/api/inputs/${{INPUT_ID}}`);
        if (!res.ok) throw new Error(`HTTP ${{res.status}}: ${{await res.text()}}`);
        inputData = await res.json();
      }} catch (err) {{
        showError(`Failed to load input object (id: ${{INPUT_ID}})`, err.message);
        return;
      }}

      // 3. Render — inputData keys are spread directly as component props
      const rootEl = document.getElementById("root");
      const reactRoot = ReactDOM.createRoot(rootEl);

      class ErrorBoundary extends React.Component {{
        constructor(props) {{ super(props); this.state = {{ error: null }}; }}
        static getDerivedStateFromError(err) {{ return {{ error: err }}; }}
        render() {{
          if (this.state.error) {{
            return React.createElement("div", {{ id: "state-error" }},
              React.createElement("strong", null, "Component render error"),
              React.createElement("pre", null, this.state.error.message)
            );
          }}
          return this.props.children;
        }}
      }}

      reactRoot.render(
        React.createElement(ErrorBoundary, null,
          React.createElement(Component, inputData)
        )
      );
    }}

    main();
  </script>
</body>
</html>"""


# ============================================================================
# Public Interface
# ============================================================================


def render_shell(component_name: str, input_id: str) -> str:
    """Render the HTML shell page for a labeling component.

    The shell dynamically loads the component's ESM bundle and fetches
    the input object at runtime in the browser.

    Args:
        component_name: The component slot name (e.g. ``"trace_comparison"``).
        input_id: The ID of the input object to pass as props.

    Returns:
        A complete HTML string ready to serve.
    """
    return SHELL_TEMPLATE.format(
        component_name=component_name,
        input_id=input_id,
        title=component_name.replace("_", " ").title(),
    )

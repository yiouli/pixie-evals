/**
 * JsonSchemaEditor — JSON schema editor component using CodeMirror.
 *
 * Adapted from pixie-ui (MIT License) app-runner/components/JsonSchemaEditor.tsx.
 * Simplified for pixie-evals: JSON mode only, no prompt/bidi support.
 */
import { useState } from "react";
import { Box, Button, Stack, Typography, Alert } from "@mui/material";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import CodeMirror from "@uiw/react-codemirror";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";

/** Value emitted by the editor on each change. */
export interface JsonEditorValue {
  /** Parsed JSON value, or null if the text is not valid JSON. */
  parsed: unknown;
  /** Raw text string in the editor. */
  raw: string;
}

export interface JsonSchemaEditorProps {
  /** Initial JSON value (will be pretty-printed on mount). */
  initialValue?: unknown;
  /** Called whenever the editor text changes. */
  onChange: (value: JsonEditorValue) => void;
}

const DEFAULT_SCHEMA = {
  type: "object",
  properties: {},
  required: [] as string[],
};

const extensions = [
  json(),
  linter(jsonParseLinter()),
  EditorView.lineWrapping,
];

/**
 * JsonSchemaEditor — A CodeMirror-based editor for JSON Schema objects.
 *
 * Renders a JSON editor with syntax highlighting, real-time parse validation,
 * and a "Prettify" button. Emits `{ parsed, raw }` on every change.
 */
export function JsonSchemaEditor({ initialValue, onChange }: JsonSchemaEditorProps) {
  const [text, setText] = useState(() =>
    JSON.stringify(initialValue === undefined ? DEFAULT_SCHEMA : initialValue, null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  const handleChange = (value: string) => {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(value);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
    setText(value);
    onChange({ parsed, raw: value });
  };

  const handlePrettify = () => {
    try {
      const parsed = JSON.parse(text);
      const pretty = JSON.stringify(parsed, null, 2);
      setText(pretty);
      setError(null);
      onChange({ parsed, raw: pretty });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="body2">
          Define the input schema using JSON Schema format.
        </Typography>
        <Button
          href="https://json-schema.org/learn/miscellaneous-examples"
          target="_blank"
          rel="noopener noreferrer"
          variant="text"
          size="small"
          endIcon={<ArrowOutwardIcon fontSize="small" />}
          sx={{ justifyContent: "flex-start", width: "fit-content", px: 0 }}
        >
          See JSON Schema examples
        </Button>
      </Stack>
      <Box
        sx={{
          position: "relative",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <CodeMirror
          value={text}
          onChange={handleChange}
          extensions={extensions}
          minHeight="150px"
          basicSetup={{ lineNumbers: false, foldGutter: false }}
        />
        <Button
          onClick={handlePrettify}
          variant="outlined"
          size="small"
          sx={{ position: "absolute", top: 8, right: 8 }}
        >
          Prettify
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary">
        Must be a valid JSON Schema object.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}

/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { JsonSchemaEditor } from "./JsonSchemaEditor";

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

// Minimal CodeMirror stub — avoids DOM/canvas issues in happy-dom
vi.mock("@uiw/react-codemirror", () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <textarea
      data-testid="codemirror-stub"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe("JsonSchemaEditor", () => {
  it("renders with default schema when no initialValue supplied", () => {
    render(
      <TestWrapper>
        <JsonSchemaEditor onChange={vi.fn()} />
      </TestWrapper>,
    );
    const textarea = screen.getByTestId(
      "codemirror-stub",
    ) as HTMLTextAreaElement;
    const parsed = JSON.parse(textarea.value);
    expect(parsed).toMatchObject({ type: "object" });
  });

  it("renders with provided initialValue", () => {
    const schema = { type: "object", properties: { name: { type: "string" } } };
    render(
      <TestWrapper>
        <JsonSchemaEditor initialValue={schema} onChange={vi.fn()} />
      </TestWrapper>,
    );
    const textarea = screen.getByTestId(
      "codemirror-stub",
    ) as HTMLTextAreaElement;
    expect(JSON.parse(textarea.value)).toMatchObject(schema);
  });

  it("calls onChange with parsed value when valid JSON is entered", () => {
    const handleChange = vi.fn();
    render(
      <TestWrapper>
        <JsonSchemaEditor onChange={handleChange} />
      </TestWrapper>,
    );
    const textarea = screen.getByTestId("codemirror-stub");
    fireEvent.change(textarea, {
      target: { value: '{"type":"object","properties":{}}' },
    });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        parsed: { type: "object", properties: {} },
        raw: '{"type":"object","properties":{}}',
      }),
    );
  });

  it("calls onChange with null parsed when invalid JSON is entered", () => {
    const handleChange = vi.fn();
    render(
      <TestWrapper>
        <JsonSchemaEditor onChange={handleChange} />
      </TestWrapper>,
    );
    const textarea = screen.getByTestId("codemirror-stub");
    fireEvent.change(textarea, { target: { value: "not valid json" } });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ parsed: null }),
    );
    // Shows error message
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows the JSON Schema examples link", () => {
    render(
      <TestWrapper>
        <JsonSchemaEditor onChange={vi.fn()} />
      </TestWrapper>,
    );
    expect(
      screen.getByRole("link", { name: /json schema examples/i }),
    ).toBeInTheDocument();
  });

  it("prettifies JSON when Prettify button is clicked", () => {
    const handleChange = vi.fn();
    render(
      <TestWrapper>
        <JsonSchemaEditor onChange={handleChange} />
      </TestWrapper>,
    );
    // Enter compact JSON
    const textarea = screen.getByTestId("codemirror-stub");
    fireEvent.change(textarea, {
      target: { value: '{"type":"object"}' },
    });
    handleChange.mockClear();

    fireEvent.click(screen.getByRole("button", { name: /prettify/i }));
    const calls = handleChange.mock.calls;
    const lastCall = calls[calls.length - 1]?.[0] as {
      raw: string;
      parsed: unknown;
    };
    expect(lastCall.raw).toContain("\n");
    expect(lastCall.parsed).toEqual({ type: "object" });
  });
});

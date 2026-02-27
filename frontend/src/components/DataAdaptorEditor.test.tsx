/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { DataAdaptorEditor } from "./DataAdaptorEditor";
import type { AdaptorField } from "../lib/schemaUtils";

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

const sampleSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    question: { type: "string", description: "The question text" },
    answer: { type: "string", description: "The expected answer" },
    context: {
      type: "object",
      description: "Additional context",
      properties: {
        source: { type: "string", description: "Source document" },
        page: { type: "integer", description: "Page number" },
      },
    },
  },
};

describe("DataAdaptorEditor", () => {
  let onChange: ReturnType<typeof vi.fn<(fields: AdaptorField[]) => void>>;
  let onNameChange: ReturnType<typeof vi.fn<(name: string) => void>>;

  beforeEach(() => {
    onChange = vi.fn<(fields: AdaptorField[]) => void>();
    onNameChange = vi.fn<(name: string) => void>();
  });

  it("should render the adaptor name field", () => {
    render(
      <TestWrapper>
        <DataAdaptorEditor
          inputSchema={sampleSchema}
          fields={[]}
          onChange={onChange}
          name="test adaptor"
          onNameChange={onNameChange}
        />
      </TestWrapper>,
    );

    const nameInput = screen.getByDisplayValue("test adaptor");
    expect(nameInput).toBeInTheDocument();
  });

  it("should show empty state when no fields", () => {
    render(
      <TestWrapper>
        <DataAdaptorEditor
          inputSchema={sampleSchema}
          fields={[]}
          onChange={onChange}
          name=""
          onNameChange={onNameChange}
        />
      </TestWrapper>,
    );

    expect(screen.getByText(/No field mappings defined/)).toBeInTheDocument();
  });

  it("should render Add Field button", () => {
    render(
      <TestWrapper>
        <DataAdaptorEditor
          inputSchema={sampleSchema}
          fields={[]}
          onChange={onChange}
          name=""
          onNameChange={onNameChange}
        />
      </TestWrapper>,
    );

    const addButton = screen.getByRole("button", { name: /Add Field/ });
    expect(addButton).toBeInTheDocument();
  });

  it("should call onChange with new empty field when Add Field is clicked", () => {
    render(
      <TestWrapper>
        <DataAdaptorEditor
          inputSchema={sampleSchema}
          fields={[]}
          onChange={onChange}
          name=""
          onNameChange={onNameChange}
        />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Add Field/ }));
    expect(onChange).toHaveBeenCalledWith([
      { schemaPath: "", name: "", description: "" },
    ]);
  });

  it("should render existing fields", () => {
    const fields: AdaptorField[] = [
      { schemaPath: "$.question", name: "question", description: "Q text" },
      { schemaPath: "$.answer", name: "answer", description: "A text" },
    ];

    render(
      <TestWrapper>
        <DataAdaptorEditor
          inputSchema={sampleSchema}
          fields={fields}
          onChange={onChange}
          name=""
          onNameChange={onNameChange}
        />
      </TestWrapper>,
    );

    // Should show Field 1 and Field 2 labels
    expect(screen.getByText("Field 1")).toBeInTheDocument();
    expect(screen.getByText("Field 2")).toBeInTheDocument();
  });

  it("should call onChange without the field when remove is clicked", () => {
    const fields: AdaptorField[] = [
      { schemaPath: "$.question", name: "question" },
      { schemaPath: "$.answer", name: "answer" },
    ];

    render(
      <TestWrapper>
        <DataAdaptorEditor
          inputSchema={sampleSchema}
          fields={fields}
          onChange={onChange}
          name=""
          onNameChange={onNameChange}
        />
      </TestWrapper>,
    );

    // Remove first field
    const removeButtons = screen.getAllByLabelText(/remove field/);
    expect(removeButtons[0]).toBeDefined();
    fireEvent.click(removeButtons[0]!);
    expect(onChange).toHaveBeenCalledWith([
      { schemaPath: "$.answer", name: "answer" },
    ]);
  });

  it("should show name and description fields when path is selected", () => {
    const fields: AdaptorField[] = [
      { schemaPath: "$.question", name: "question", description: "Q text" },
    ];

    render(
      <TestWrapper>
        <DataAdaptorEditor
          inputSchema={sampleSchema}
          fields={fields}
          onChange={onChange}
          name=""
          onNameChange={onNameChange}
        />
      </TestWrapper>,
    );

    // Should show name with the value and description
    expect(screen.getByDisplayValue("question")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Q text")).toBeInTheDocument();
  });

  it("should show type chip when path is selected", () => {
    const fields: AdaptorField[] = [
      { schemaPath: "$.question", name: "question" },
    ];

    render(
      <TestWrapper>
        <DataAdaptorEditor
          inputSchema={sampleSchema}
          fields={fields}
          onChange={onChange}
          name=""
          onNameChange={onNameChange}
        />
      </TestWrapper>,
    );

    expect(screen.getByText("Type: string")).toBeInTheDocument();
  });

  it("should call onNameChange when name is edited", () => {
    render(
      <TestWrapper>
        <DataAdaptorEditor
          inputSchema={sampleSchema}
          fields={[]}
          onChange={onChange}
          name="old name"
          onNameChange={onNameChange}
        />
      </TestWrapper>,
    );

    fireEvent.change(screen.getByDisplayValue("old name"), {
      target: { value: "new name" },
    });
    expect(onNameChange).toHaveBeenCalledWith("new name");
  });

  it("should show error when output field name is empty", () => {
    const fields: AdaptorField[] = [
      { schemaPath: "$.question", name: "", description: "" },
    ];

    render(
      <TestWrapper>
        <DataAdaptorEditor
          inputSchema={sampleSchema}
          fields={fields}
          onChange={onChange}
          name=""
          onNameChange={onNameChange}
        />
      </TestWrapper>,
    );

    expect(screen.getByText("Name is required")).toBeInTheDocument();
  });
});

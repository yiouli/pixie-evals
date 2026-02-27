/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { DataAdaptorSelectionDialog } from "./DataAdaptorSelectionDialog";

// Mock useDataAdaptors hook
const mockCreateDataAdaptor = vi.fn<() => Promise<string>>();
const mockAdaptors: Array<{
  id: string;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
}> = [];

vi.mock("../hooks/useDataAdaptors", () => ({
  useDataAdaptors: () => ({
    adaptors: mockAdaptors,
    loading: false,
    error: null,
    createDataAdaptor: mockCreateDataAdaptor,
    refetch: vi.fn(),
  }),
  parseAdaptorConfig: vi.fn((config: unknown) => {
    const raw = config as Record<string, unknown>;
    return {
      inputSchema: raw.input_schema ?? {},
      fields: [],
      metadata: raw.metadata,
    };
  }),
  findAdaptorForDataset: vi.fn(
    (
      adaptors: Array<{ id: string; config: Record<string, unknown> }>,
      datasetId: string,
    ) =>
      adaptors.find(
        (a) =>
          (a.config.metadata as Record<string, unknown>)?.dataset_id ===
          datasetId,
      ),
  ),
}));

// Mock schemaUtils
vi.mock("../lib/schemaUtils", () => ({
  areSchemasCompatible: vi.fn(() => true),
  extractJsonPaths: vi.fn(() => []),
  getSubSchemaAtPath: vi.fn(() => null),
}));

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

const baseProps = {
  testSuiteId: "ts-1",
  datasetId: "ds-1",
  datasetSchema: {
    type: "object",
    properties: { q: { type: "string" }, a: { type: "string" } },
  },
  datasetFileName: "test-data.csv",
};

describe("DataAdaptorSelectionDialog", () => {
  beforeEach(() => {
    mockCreateDataAdaptor.mockReset();
    mockAdaptors.length = 0;
  });

  it("should render the dialog when open", () => {
    render(
      <TestWrapper>
        <DataAdaptorSelectionDialog
          open={true}
          onClose={vi.fn()}
          onComplete={vi.fn()}
          {...baseProps}
        />
      </TestWrapper>,
    );
    expect(screen.getByText("Data Adaptor Required")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(
      <TestWrapper>
        <DataAdaptorSelectionDialog
          open={false}
          onClose={vi.fn()}
          onComplete={vi.fn()}
          {...baseProps}
        />
      </TestWrapper>,
    );
    expect(screen.queryByText("Data Adaptor Required")).not.toBeInTheDocument();
  });

  it("should show incompatibility warning", () => {
    render(
      <TestWrapper>
        <DataAdaptorSelectionDialog
          open={true}
          onClose={vi.fn()}
          onComplete={vi.fn()}
          {...baseProps}
        />
      </TestWrapper>,
    );
    expect(
      screen.getByText(/dataset schema is not compatible/i),
    ).toBeInTheDocument();
  });

  it("should show create mode when no compatible adaptors exist", () => {
    render(
      <TestWrapper>
        <DataAdaptorSelectionDialog
          open={true}
          onClose={vi.fn()}
          onComplete={vi.fn()}
          {...baseProps}
        />
      </TestWrapper>,
    );
    // Should show the create adaptor section with field mappings
    expect(screen.getByText("Create New Adaptor")).toBeInTheDocument();
    expect(screen.getByText("Field Mappings")).toBeInTheDocument();
  });

  it("should pre-fill adaptor name from dataset filename", () => {
    render(
      <TestWrapper>
        <DataAdaptorSelectionDialog
          open={true}
          onClose={vi.fn()}
          onComplete={vi.fn()}
          {...baseProps}
        />
      </TestWrapper>,
    );
    expect(
      screen.getByDisplayValue("from test-data.csv"),
    ).toBeInTheDocument();
  });

  it("should call onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <DataAdaptorSelectionDialog
          open={true}
          onClose={onClose}
          onComplete={vi.fn()}
          {...baseProps}
        />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("should have Cancel and Continue buttons", () => {
    render(
      <TestWrapper>
        <DataAdaptorSelectionDialog
          open={true}
          onClose={vi.fn()}
          onComplete={vi.fn()}
          {...baseProps}
        />
      </TestWrapper>,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue" }),
    ).toBeInTheDocument();
  });

  it("should disable Continue when no adaptor fields are configured", () => {
    render(
      <TestWrapper>
        <DataAdaptorSelectionDialog
          open={true}
          onClose={vi.fn()}
          onComplete={vi.fn()}
          {...baseProps}
        />
      </TestWrapper>,
    );
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });
});

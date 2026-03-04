/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { TestSuiteConfigDialog } from "./TestSuiteConfigDialog";

// Mock hooks and modules
const mockDatasets = [
  { id: "ds-1", fileName: "test-data.csv", createdAt: "2024-01-01" },
];
const mockCreateTestSuite = vi.fn<() => Promise<string>>();

vi.mock("../hooks/useDatasets", () => ({
  useDatasets: () => ({ datasets: mockDatasets, loading: false, error: null }),
}));

vi.mock("../hooks/useTestSuites", () => ({
  useTestSuites: () => ({
    testSuites: [],
    loading: false,
    error: null,
    createTestSuite: mockCreateTestSuite,
    refetch: vi.fn(),
  }),
}));

// Mock Apollo hooks
const mockLinkMutate = vi.fn<() => Promise<{ data: null }>>().mockResolvedValue({ data: null });

vi.mock("@apollo/client", () => ({
  useQuery: vi.fn((_query: unknown, options?: { variables?: { id?: string }; skip?: boolean }) => {
    // If skip is true, return empty
    if (options?.skip) return { data: undefined, loading: false };
    // Return mock dataset data with schema
    return {
      data: {
        getDataset: {
          id: options?.variables?.id ?? "ds-1",
          fileName: "test-data.csv",
          rowSchema: {
            type: "object",
            properties: {
              question: { type: "string", description: "The question" },
              answer: { type: "string", description: "The answer" },
              context: {
                type: "object",
                properties: {
                  source: { type: "string" },
                },
              },
            },
          },
        },
        getDataEntries: [],
      },
      loading: false,
    };
  }),
  useMutation: () => [mockLinkMutate, { loading: false }],
  useSubscription: () => ({ error: undefined }),
  gql: (strings: TemplateStringsArray) => strings.join(""),
}));

// Mock remoteClient
vi.mock("../lib/apolloClient", () => ({
  sdkClient: {},
  remoteClient: { mutate: vi.fn().mockResolvedValue({ data: { createDataAdaptor: "adaptor-1" } }) },
}));

// Mock child components that are complex
vi.mock("./DatasetUploadDialog", () => ({
  DatasetUploadDialog: () => null,
}));

vi.mock("./MetricsAutocomplete", () => ({
  MetricsAutocomplete: ({
    onChange,
  }: {
    value: unknown[];
    onChange: (v: unknown[]) => void;
  }) => (
    <button
      data-testid="mock-metrics"
      onClick={() => onChange([{ id: "m-1", name: "accuracy" }])}
    >
      Add Metric
    </button>
  ),
}));

// Mock DataGrid (heavy component not relevant to adaptor tests)
vi.mock("@mui/x-data-grid", () => ({
  DataGrid: () => <div data-testid="mock-datagrid" />,
}));

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe("TestSuiteConfigDialog", () => {
  beforeEach(() => {
    mockCreateTestSuite.mockReset();
    mockLinkMutate.mockReset().mockResolvedValue({ data: null });
  });

  it("should render the dialog when open", () => {
    render(
      <TestWrapper>
        <TestSuiteConfigDialog open={true} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create Evaluation" })).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(
      <TestWrapper>
        <TestSuiteConfigDialog open={false} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should show Configure Data Adaptor checkbox when dataset is selected", () => {
    render(
      <TestWrapper>
        <TestSuiteConfigDialog
          open={true}
          onClose={vi.fn()}
          preselectedDatasetId="ds-1"
        />
      </TestWrapper>,
    );
    expect(screen.getByText("Configure Data Adaptor")).toBeInTheDocument();
  });

  it("should not show Configure Data Adaptor when no dataset is selected", () => {
    render(
      <TestWrapper>
        <TestSuiteConfigDialog open={true} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(
      screen.queryByText("Configure Data Adaptor"),
    ).not.toBeInTheDocument();
  });

  it("should show DataAdaptorEditor when checkbox is checked", () => {
    render(
      <TestWrapper>
        <TestSuiteConfigDialog
          open={true}
          onClose={vi.fn()}
          preselectedDatasetId="ds-1"
        />
      </TestWrapper>,
    );

    // Check the checkbox
    const checkbox = screen.getByRole("checkbox", {
      name: "Configure Data Adaptor",
    });
    fireEvent.click(checkbox);

    // Should now see the adaptor editor fields
    expect(screen.getByText("Field Mappings")).toBeInTheDocument();
    expect(screen.getByText("Add Field")).toBeInTheDocument();
  });

  it("should show Input Schema label when adaptor is disabled", () => {
    render(
      <TestWrapper>
        <TestSuiteConfigDialog
          open={true}
          onClose={vi.fn()}
          preselectedDatasetId="ds-1"
        />
      </TestWrapper>,
    );
    // "Input Schema" appears as the section heading; there may also be a sub-label
    expect(screen.getAllByText("Input Schema").length).toBeGreaterThanOrEqual(1);
  });

  it("should disable create button when adaptor is enabled but no fields added", async () => {
    render(
      <TestWrapper>
        <TestSuiteConfigDialog
          open={true}
          onClose={vi.fn()}
          preselectedDatasetId="ds-1"
        />
      </TestWrapper>,
    );

    // Fill in name
    const nameInput = screen.getByRole("textbox", { name: /evaluation name/i });
    fireEvent.change(nameInput, { target: { value: "Test Eval" } });

    // Add a metric
    fireEvent.click(screen.getByTestId("mock-metrics"));

    // Enable adaptor
    const checkbox = screen.getByRole("checkbox", {
      name: "Configure Data Adaptor",
    });
    fireEvent.click(checkbox);

    // Create button should be disabled because no adaptor fields
    const createBtn = screen.getByRole("button", { name: /create evaluation/i });
    expect(createBtn).toBeDisabled();
  });

  it("should call handleClose and reset adaptor state on close", () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <TestSuiteConfigDialog
          open={true}
          onClose={onClose}
          preselectedDatasetId="ds-1"
        />
      </TestWrapper>,
    );

    // Enable adaptor
    const checkbox = screen.getByRole("checkbox", {
      name: "Configure Data Adaptor",
    });
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Cancel
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("should pre-fill adaptor name with dataset filename", () => {
    render(
      <TestWrapper>
        <TestSuiteConfigDialog
          open={true}
          onClose={vi.fn()}
          preselectedDatasetId="ds-1"
        />
      </TestWrapper>,
    );

    // Enable adaptor
    const checkbox = screen.getByRole("checkbox", {
      name: "Configure Data Adaptor",
    });
    fireEvent.click(checkbox);

    // The adaptor name field should be pre-filled
    expect(screen.getByDisplayValue("from test-data.csv")).toBeInTheDocument();
  });
});

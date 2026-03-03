/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ManualLabelingDialog } from "./ManualLabelingDialog";

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

// Mock useLazyQuery from Apollo Client
const mockFetchLabelingHtml = vi.fn();
let mockQueryResult: {
  loading: boolean;
  data: { getLabelingHtml: string | null } | undefined;
  error: { message: string } | undefined;
} = { loading: false, data: undefined, error: undefined };

vi.mock("@apollo/client", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useLazyQuery: () => [mockFetchLabelingHtml, mockQueryResult],
  };
});

// Mock the SDK client
vi.mock("../lib/apolloClient", () => ({
  sdkClient: {},
}));

// Mock the query import
vi.mock("../graphql/sdk/query", () => ({
  GET_LABELING_HTML: {},
}));

// Mock env for SDK_BASE_URL
vi.mock("../lib/env", () => ({
  SDK_BASE_URL: "http://localhost:8100",
}));

// Mock react18-json-view
vi.mock("react18-json-view", () => ({
  default: ({ src }: { src: unknown }) => (
    <pre data-testid="json-view">{JSON.stringify(src)}</pre>
  ),
}));
vi.mock("react18-json-view/src/style.css", () => ({}));

const SAMPLE_METRICS = [
  { id: "m1", name: "Accuracy", config: { type: "scale", scaling: 1 } },
  { id: "m2", name: "Relevance", config: { type: "scale", scaling: 5 } },
  {
    id: "m3",
    name: "Tone",
    config: { type: "category", categories: ["Good", "Bad", "Neutral"] },
  },
];

describe("ManualLabelingDialog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockFetchLabelingHtml.mockReset();
    mockQueryResult = { loading: false, data: undefined, error: undefined };
  });

  it("should render the dialog when open", () => {
    render(
      <TestWrapper>
        <ManualLabelingDialog open={true} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(screen.getByText("Manual Labeling")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(
      <TestWrapper>
        <ManualLabelingDialog open={false} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(screen.queryByText("Manual Labeling")).not.toBeInTheDocument();
  });

  it("should show 'no candidate' message when no testCaseId", () => {
    render(
      <TestWrapper>
        <ManualLabelingDialog open={true} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(
      screen.getByText("No candidate available for labeling"),
    ).toBeInTheDocument();
  });

  it("should call GraphQL query with testCaseId", async () => {
    render(
      <TestWrapper>
        <ManualLabelingDialog
          open={true}
          onClose={vi.fn()}
          testCaseId="test-case-123"
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockFetchLabelingHtml).toHaveBeenCalledWith({
        variables: { testCaseId: "test-case-123" },
      });
    });
  });

  it("should render iframe with srcdoc after successful query", async () => {
    mockQueryResult = {
      loading: false,
      data: { getLabelingHtml: "<html><body>Labeling Content</body></html>" },
      error: undefined,
    };

    render(
      <TestWrapper>
        <ManualLabelingDialog
          open={true}
          onClose={vi.fn()}
          testCaseId="test-case-456"
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      const iframe = screen.getByTitle("Labeling UI");
      expect(iframe).toBeInTheDocument();
      expect(iframe.getAttribute("srcdoc")).toContain("Labeling Content");
    });
  });

  it("should show error when query fails", async () => {
    mockQueryResult = {
      loading: false,
      data: undefined,
      error: { message: "Test case not found" },
    };

    render(
      <TestWrapper>
        <ManualLabelingDialog
          open={true}
          onClose={vi.fn()}
          testCaseId="bad-id"
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("Test case not found")).toBeInTheDocument();
    });
  });

  it("should render metric-specific inputs", () => {
    render(
      <TestWrapper>
        <ManualLabelingDialog
          open={true}
          onClose={vi.fn()}
          metrics={SAMPLE_METRICS}
        />
      </TestWrapper>,
    );
    expect(screen.getByText("Accuracy")).toBeInTheDocument();
    expect(screen.getByText("Relevance")).toBeInTheDocument();
    expect(screen.getByText("Tone")).toBeInTheDocument();
    // Binary metric shows approve/reject icons
    expect(screen.getByLabelText("approve")).toBeInTheDocument();
    expect(screen.getByLabelText("reject")).toBeInTheDocument();
    // Category metric shows toggle buttons
    expect(screen.getByText("Good")).toBeInTheDocument();
    expect(screen.getByText("Bad")).toBeInTheDocument();
    expect(screen.getByText("Neutral")).toBeInTheDocument();
  });

  it("should show 'no metrics' message when metrics is empty", () => {
    render(
      <TestWrapper>
        <ManualLabelingDialog open={true} onClose={vi.fn()} metrics={[]} />
      </TestWrapper>,
    );
    expect(
      screen.getByText("No metrics configured for this evaluation"),
    ).toBeInTheDocument();
  });

  it("should have Save, Skip, and Cancel buttons", () => {
    render(
      <TestWrapper>
        <ManualLabelingDialog open={true} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("should disable Save when no testCaseId", () => {
    render(
      <TestWrapper>
        <ManualLabelingDialog open={true} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("should call onSkip when Skip is clicked", () => {
    const onSkip = vi.fn();
    render(
      <TestWrapper>
        <ManualLabelingDialog open={true} onClose={vi.fn()} onSkip={onSkip} />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("should call onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <ManualLabelingDialog open={true} onClose={onClose} />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should show JSON view when getLabelingHtml returns null", async () => {
    // Simulate query returning null (no custom HTML)
    mockQueryResult = {
      loading: false,
      data: { getLabelingHtml: null },
      error: undefined,
    };

    // Mock fetch for raw input data
    const mockInputData = { prompt: "test prompt", response: "test response" };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockInputData,
    } as Response);

    render(
      <TestWrapper>
        <ManualLabelingDialog
          open={true}
          onClose={vi.fn()}
          testCaseId="test-case-789"
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      const jsonView = screen.getByTestId("json-view");
      expect(jsonView).toBeInTheDocument();
      expect(jsonView.textContent).toContain("test prompt");
    });
  });
});

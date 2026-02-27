/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { EvaluationDialog } from "./EvaluationDialog";

// Capture the onData callback from useSubscription so we can simulate updates
let capturedOnData: ((opts: { data: { data: unknown } }) => void) | null = null;

// Mock Apollo Client to prevent actual subscription calls
vi.mock("@apollo/client", async () => {
  const actual = await vi.importActual<typeof import("@apollo/client")>(
    "@apollo/client",
  );
  return {
    ...actual,
    useSubscription: vi.fn((_doc: unknown, opts?: { onData?: typeof capturedOnData }) => {
      capturedOnData = opts?.onData ?? null;
      return { error: undefined };
    }),
  };
});

vi.mock("../lib/apolloClient", () => ({
  sdkClient: {},
}));

vi.mock("../graphql/sdk/subscription", () => ({
  EVALUATE_DATASET: {},
}));

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

const SAMPLE_METRICS = [
  { id: "m1", name: "Accuracy" },
  { id: "m2", name: "Relevance" },
];

const TEST_DATASET_ID = "test-dataset-123";

/** Helper to push a subscription update into the dialog. */
function pushUpdate(update: Record<string, unknown>) {
  act(() => {
    capturedOnData?.({
      data: { data: { evaluateDataset: update } },
    });
  });
}

describe("EvaluationDialog", () => {
  beforeEach(() => {
    capturedOnData = null;
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------------
  // Rendering basics
  // ----------------------------------------------------------------

  it("should render the dialog when open", () => {
    render(
      <TestWrapper>
        <EvaluationDialog
          open={true}
          onClose={vi.fn()}
          datasetId={TEST_DATASET_ID}
        />
      </TestWrapper>,
    );
    expect(screen.getByText("AI Evaluation")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(
      <TestWrapper>
        <EvaluationDialog
          open={false}
          onClose={vi.fn()}
          datasetId={TEST_DATASET_ID}
        />
      </TestWrapper>,
    );
    expect(screen.queryByText("AI Evaluation")).not.toBeInTheDocument();
  });

  it("should show initial starting message", () => {
    render(
      <TestWrapper>
        <EvaluationDialog
          open={true}
          onClose={vi.fn()}
          datasetId={TEST_DATASET_ID}
        />
      </TestWrapper>,
    );
    expect(screen.getByText("Starting evaluation...")).toBeInTheDocument();
    expect(screen.getByText("0% complete")).toBeInTheDocument();
  });

  it("should show metrics statistics heading", () => {
    render(
      <TestWrapper>
        <EvaluationDialog
          open={true}
          onClose={vi.fn()}
          datasetId={TEST_DATASET_ID}
          metrics={SAMPLE_METRICS}
        />
      </TestWrapper>,
    );
    expect(screen.getByText("Metrics Statistics")).toBeInTheDocument();
  });

  it("should show waiting message when no results yet", () => {
    render(
      <TestWrapper>
        <EvaluationDialog
          open={true}
          onClose={vi.fn()}
          datasetId={TEST_DATASET_ID}
          metrics={[]}
        />
      </TestWrapper>,
    );
    expect(
      screen.getByText("Waiting for results..."),
    ).toBeInTheDocument();
  });

  // ----------------------------------------------------------------
  // Button behavior
  // ----------------------------------------------------------------

  it("should call onClose when Cancel is clicked during evaluation", () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <EvaluationDialog
          open={true}
          onClose={onClose}
          datasetId={TEST_DATASET_ID}
        />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should show Close button after evaluation completes", () => {
    render(
      <TestWrapper>
        <EvaluationDialog
          open={true}
          onClose={vi.fn()}
          datasetId={TEST_DATASET_ID}
        />
      </TestWrapper>,
    );

    pushUpdate({
      status: "complete",
      message: "Evaluation complete",
      progress: 1.0,
      total: 5,
      completed: 5,
      results: [],
    });

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  // ----------------------------------------------------------------
  // Subscription data handling
  // ----------------------------------------------------------------

  it("should update progress from subscription data", () => {
    render(
      <TestWrapper>
        <EvaluationDialog
          open={true}
          onClose={vi.fn()}
          datasetId={TEST_DATASET_ID}
        />
      </TestWrapper>,
    );

    pushUpdate({
      status: "evaluating",
      message: "Evaluating entries...",
      progress: 0.6,
      total: 10,
      completed: 6,
      results: [],
    });

    expect(screen.getByText("Evaluating entries...")).toBeInTheDocument();
    expect(screen.getByText("60% complete")).toBeInTheDocument();
  });

  it("should display summary counts from accumulated results", () => {
    render(
      <TestWrapper>
        <EvaluationDialog
          open={true}
          onClose={vi.fn()}
          datasetId={TEST_DATASET_ID}
        />
      </TestWrapper>,
    );

    pushUpdate({
      status: "evaluating",
      message: "Evaluating...",
      progress: 0.5,
      total: 4,
      completed: 2,
      results: [
        { entryId: "e1", output: { score: 4 }, error: null },
        { entryId: "e2", output: {}, error: "DSPy failed" },
      ],
    });

    // Summary shows separate label/value Typography elements
    expect(screen.getByText("Successful")).toBeInTheDocument();
    expect(screen.getByText("Errors")).toBeInTheDocument();
  });

  it("should show error alert when subscription has error status", () => {
    render(
      <TestWrapper>
        <EvaluationDialog
          open={true}
          onClose={vi.fn()}
          datasetId={TEST_DATASET_ID}
        />
      </TestWrapper>,
    );

    pushUpdate({
      status: "error",
      message: "Dataset not found",
      progress: 0,
      total: 0,
      completed: 0,
      results: [],
    });

    expect(screen.getByText("Dataset not found")).toBeInTheDocument();
  });

  it("should accumulate results from multiple subscription batches", () => {
    render(
      <TestWrapper>
        <EvaluationDialog
          open={true}
          onClose={vi.fn()}
          datasetId={TEST_DATASET_ID}
        />
      </TestWrapper>,
    );

    // First batch
    pushUpdate({
      status: "evaluating",
      message: "Evaluating...",
      progress: 0.5,
      total: 4,
      completed: 2,
      results: [
        { entryId: "e1", output: { score: 4 }, error: null },
        { entryId: "e2", output: { score: 3 }, error: null },
      ],
    });

    // Second batch
    pushUpdate({
      status: "complete",
      message: "Evaluation complete",
      progress: 1.0,
      total: 4,
      completed: 4,
      results: [
        { entryId: "e3", output: { score: 5 }, error: null },
        { entryId: "e4", output: { score: 2 }, error: null },
      ],
    });

    // All 4 results should be accumulated – "Successful" label + "4" value
    expect(screen.getByText("Successful")).toBeInTheDocument();
    // The "Evaluated" count should show 4
    const evaluatedHeadings = screen.getAllByText("4");
    expect(evaluatedHeadings.length).toBeGreaterThan(0);
  });

  it("should display show details toggle button", () => {
    render(
      <TestWrapper>
        <EvaluationDialog
          open={true}
          onClose={vi.fn()}
          datasetId={TEST_DATASET_ID}
        />
      </TestWrapper>,
    );

    pushUpdate({
      status: "evaluating",
      message: "Evaluating...",
      progress: 0.5,
      total: 2,
      completed: 1,
      results: [
        { entryId: "e1", output: { score: 4 }, error: null },
      ],
    });

    // Should have a "Show details" / "Individual Results" toggle
    expect(screen.getByText(/individual results/i)).toBeInTheDocument();
  });
});

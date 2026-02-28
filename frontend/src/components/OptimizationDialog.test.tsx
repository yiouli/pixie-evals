/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { OptimizationDialog } from "./OptimizationDialog";

// Capture the onData callback from useSubscription so we can simulate updates
let capturedOnData: ((opts: { data: { data: unknown } }) => void) | null = null;

// Mock Apollo Client to prevent actual subscription calls
vi.mock("@apollo/client", async () => {
  const actual = await vi.importActual<typeof import("@apollo/client")>(
    "@apollo/client",
  );
  return {
    ...actual,
    useSubscription: vi.fn(
      (_doc: unknown, opts?: { onData?: typeof capturedOnData }) => {
        capturedOnData = opts?.onData ?? null;
        return { error: undefined };
      },
    ),
  };
});

vi.mock("../lib/apolloClient", () => ({
  sdkClient: {},
}));

vi.mock("../graphql/sdk/subscription", () => ({
  OPTIMIZE_EVALUATOR: {},
}));

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

const TEST_SUITE_ID = "test-suite-123";

/** Helper to push a subscription update into the dialog. */
function pushUpdate(update: Record<string, unknown>) {
  act(() => {
    capturedOnData?.({
      data: { data: { optimizeEvaluator: update } },
    });
  });
}

describe("OptimizationDialog", () => {
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
        <OptimizationDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );
    expect(screen.getByText("Optimize Evaluator")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(
      <TestWrapper>
        <OptimizationDialog
          open={false}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );
    expect(
      screen.queryByText("Optimize Evaluator"),
    ).not.toBeInTheDocument();
  });

  it("should show initial starting message", () => {
    render(
      <TestWrapper>
        <OptimizationDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );
    expect(
      screen.getByText("Starting optimization..."),
    ).toBeInTheDocument();
    expect(screen.getByText("0% complete")).toBeInTheDocument();
  });

  it("should show info message while running", () => {
    render(
      <TestWrapper>
        <OptimizationDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );
    expect(
      screen.getByText(/Optimization may take several minutes/),
    ).toBeInTheDocument();
  });

  // ----------------------------------------------------------------
  // Button behavior
  // ----------------------------------------------------------------

  it("should call onClose when Cancel is clicked during optimization", () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <OptimizationDialog
          open={true}
          onClose={onClose}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should show Close button after optimization completes", () => {
    render(
      <TestWrapper>
        <OptimizationDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );

    pushUpdate({
      status: "COMPLETE",
      message: "Evaluator optimized successfully",
      progress: 1.0,
      evaluatorId: "eval-123",
    });

    expect(
      screen.getByRole("button", { name: "Close" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
  });

  // ----------------------------------------------------------------
  // Subscription data handling
  // ----------------------------------------------------------------

  it("should update progress from subscription data", () => {
    render(
      <TestWrapper>
        <OptimizationDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );

    pushUpdate({
      status: "OPTIMIZING",
      message: "Running optimization...",
      progress: 0.5,
    });

    expect(
      screen.getByText("Running optimization..."),
    ).toBeInTheDocument();
    expect(screen.getByText("50% complete")).toBeInTheDocument();
  });

  it("should show Complete chip when done", () => {
    render(
      <TestWrapper>
        <OptimizationDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );

    pushUpdate({
      status: "COMPLETE",
      message: "Evaluator optimized successfully with 10 examples",
      progress: 1.0,
      evaluatorId: "eval-456",
    });

    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(
      screen.getByText("New evaluator created successfully."),
    ).toBeInTheDocument();
  });

  it("should show Error chip when optimization fails", () => {
    render(
      <TestWrapper>
        <OptimizationDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );

    pushUpdate({
      status: "ERROR",
      message: "Optimization failed: No evaluator found",
      progress: 0.0,
    });

    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(
      screen.getByText("Optimization failed: No evaluator found"),
    ).toBeInTheDocument();
  });

  it("should update through multiple status phases", () => {
    render(
      <TestWrapper>
        <OptimizationDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );

    pushUpdate({
      status: "LOADING",
      message: "Fetching training examples...",
      progress: 0.0,
    });
    expect(
      screen.getByText("Fetching training examples..."),
    ).toBeInTheDocument();

    pushUpdate({
      status: "PREPARING",
      message: "Built 15 training examples",
      progress: 0.3,
    });
    expect(
      screen.getByText("Built 15 training examples"),
    ).toBeInTheDocument();
    expect(screen.getByText("30% complete")).toBeInTheDocument();

    pushUpdate({
      status: "OPTIMIZING",
      message: "Running optimization (this may take a few minutes)...",
      progress: 0.4,
    });
    expect(screen.getByText("40% complete")).toBeInTheDocument();

    pushUpdate({
      status: "COMPLETE",
      message: "Evaluator optimized successfully with 15 training examples",
      progress: 1.0,
      evaluatorId: "new-eval-id",
    });
    expect(screen.getByText("100% complete")).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  // ----------------------------------------------------------------
  // State reset on reopen
  // ----------------------------------------------------------------

  it("should reset state when reopened", () => {
    const { rerender } = render(
      <TestWrapper>
        <OptimizationDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );

    pushUpdate({
      status: "COMPLETE",
      message: "Done",
      progress: 1.0,
      evaluatorId: "eval-789",
    });
    expect(screen.getByText("Complete")).toBeInTheDocument();

    // Close and reopen
    rerender(
      <TestWrapper>
        <OptimizationDialog
          open={false}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );
    rerender(
      <TestWrapper>
        <OptimizationDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );

    // Should be back to starting state
    expect(
      screen.getByText("Starting optimization..."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Complete"),
    ).not.toBeInTheDocument();
  });
});

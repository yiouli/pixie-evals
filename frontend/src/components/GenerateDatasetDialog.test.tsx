/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { GenerateDatasetDialog } from "./GenerateDatasetDialog";

// Capture the onData callback from useSubscription so we can simulate updates
let capturedOnData: ((opts: { data: { data: unknown } }) => void) | null = null;

// Mock mutation functions
const mockSendFeedback = vi.fn().mockResolvedValue({ data: {} });
const mockAddTestCases = vi.fn().mockResolvedValue({ data: {} });
const mockCreateDataset = vi.fn().mockResolvedValue({
  data: { createDataset: { id: "local-ds-123" } },
});
const mockAddDataEntry = vi.fn().mockResolvedValue({
  data: { addDataEntry: { id: "entry-1" } },
});

// Mock Apollo Client to prevent actual subscription/mutation calls
vi.mock("@apollo/client", async () => {
  const actual =
    await vi.importActual<typeof import("@apollo/client")>("@apollo/client");
  return {
    ...actual,
    useSubscription: vi.fn(
      (
        _doc: unknown,
        opts?: { onData?: typeof capturedOnData; skip?: boolean },
      ) => {
        if (!opts?.skip) {
          capturedOnData = opts?.onData ?? null;
        }
        return { error: undefined };
      },
    ),
    useMutation: vi.fn((doc: unknown) => {
      // Return the appropriate mock based on the mutation document
      const docStr = JSON.stringify(doc);
      if (docStr.includes("SendDatasetGenerationFeedback")) {
        return [mockSendFeedback];
      }
      if (docStr.includes("AddTestCases")) {
        return [mockAddTestCases];
      }
      if (docStr.includes("CreateDataset")) {
        return [mockCreateDataset];
      }
      if (docStr.includes("AddDataEntry")) {
        return [mockAddDataEntry];
      }
      return [vi.fn()];
    }),
  };
});

vi.mock("../lib/apolloClient", () => ({
  remoteClient: {},
  sdkClient: {},
}));

vi.mock("../graphql/remote/subscription", () => ({
  GENERATE_DATASET: { __meta: "GenerateDataset" },
}));

vi.mock("../graphql/remote/mutation", () => ({
  SEND_DATASET_GENERATION_FEEDBACK: {
    __meta: "SendDatasetGenerationFeedback",
  },
  ADD_TEST_CASES: { __meta: "AddTestCases" },
}));

vi.mock("../graphql/sdk/mutation", () => ({
  CREATE_DATASET: { __meta: "CreateDataset" },
  ADD_DATA_ENTRY: { __meta: "AddDataEntry" },
  UPLOAD_FILE: {},
  LINK_DATASET_TO_TEST_SUITE: {},
}));

vi.mock("../generated/remote/graphql", () => ({
  DatasetGenerationStatusEnum: {
    Planning: "PLANNING",
    AwaitingFeedback: "AWAITING_FEEDBACK",
    GeneratingDescriptions: "GENERATING_DESCRIPTIONS",
    GeneratingData: "GENERATING_DATA",
    Saving: "SAVING",
    Complete: "COMPLETE",
    Error: "ERROR",
  },
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
      data: { data: { generateDataset: update } },
    });
  });
}

/**
 * Helper to find form fields by label, handling MUI's `required` asterisk.
 * MUI TextField with `required` renders the label as "Label *", so we use
 * exact: false to match regardless of the asterisk.
 */
function getField(label: string) {
  return screen.getByLabelText(label, { exact: false });
}

describe("GenerateDatasetDialog", () => {
  beforeEach(() => {
    capturedOnData = null;
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------------
  // Rendering basics
  // ----------------------------------------------------------------

  it("should render the form when open", () => {
    render(
      <TestWrapper>
        <GenerateDatasetDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );
    expect(screen.getByText("Generate Dataset with AI")).toBeInTheDocument();
    expect(getField("Dataset Name")).toBeInTheDocument();
    expect(getField("Number of Entries")).toBeInTheDocument();
    expect(getField("Description")).toBeInTheDocument();
  });

  it("should not render content when closed", () => {
    render(
      <TestWrapper>
        <GenerateDatasetDialog
          open={false}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );
    expect(
      screen.queryByText("Generate Dataset with AI"),
    ).not.toBeInTheDocument();
  });

  // ----------------------------------------------------------------
  // Form interaction
  // ----------------------------------------------------------------

  it("should disable Generate button when fields are empty", () => {
    render(
      <TestWrapper>
        <GenerateDatasetDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );
    const generateButton = screen.getByRole("button", { name: /generate/i });
    expect(generateButton).toBeDisabled();
  });

  it("should enable Generate button when name and description are filled", () => {
    render(
      <TestWrapper>
        <GenerateDatasetDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );
    fireEvent.change(getField("Dataset Name"), {
      target: { value: "My Dataset" },
    });
    fireEvent.change(getField("Description"), {
      target: { value: "Some description" },
    });
    const generateButton = screen.getByRole("button", { name: /generate/i });
    expect(generateButton).toBeEnabled();
  });

  it("should show Cancel button in form phase", () => {
    render(
      <TestWrapper>
        <GenerateDatasetDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("should call onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <GenerateDatasetDialog
          open={true}
          onClose={onClose}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------------
  // Subscription updates
  // ----------------------------------------------------------------

  it("should show progress after starting", () => {
    render(
      <TestWrapper>
        <GenerateDatasetDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );

    // Fill form and start
    fireEvent.change(getField("Dataset Name"), {
      target: { value: "Test" },
    });
    fireEvent.change(getField("Description"), {
      target: { value: "Test desc" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    // Should show connecting message
    expect(
      screen.getByText("Connecting to AI generation service..."),
    ).toBeInTheDocument();
  });

  it("should show plan when awaiting feedback", () => {
    render(
      <TestWrapper>
        <GenerateDatasetDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );

    // Fill form and start
    fireEvent.change(getField("Dataset Name"), {
      target: { value: "Test" },
    });
    fireEvent.change(getField("Description"), {
      target: { value: "Test desc" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    // Simulate plan ready
    pushUpdate({
      status: "AWAITING_FEEDBACK",
      message: "Plan ready for review",
      progress: 0.1,
      plan: "I will generate 10 customer support conversations.",
      sessionId: "session-abc",
      total: 10,
      completed: 0,
    });

    expect(screen.getByText("Generation Plan")).toBeInTheDocument();
    expect(
      screen.getByText("I will generate 10 customer support conversations."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /approve & generate/i }),
    ).toBeInTheDocument();
  });

  it("should show Complete chip when generation finishes", () => {
    render(
      <TestWrapper>
        <GenerateDatasetDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );

    // Fill form and start
    fireEvent.change(getField("Dataset Name"), {
      target: { value: "Test" },
    });
    fireEvent.change(getField("Description"), {
      target: { value: "Test desc" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    // Simulate completion
    pushUpdate({
      status: "COMPLETE",
      message: "Dataset generation complete!",
      progress: 1.0,
      total: 10,
      completed: 10,
    });

    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("should show Error chip on error", () => {
    render(
      <TestWrapper>
        <GenerateDatasetDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );

    // Fill form and start
    fireEvent.change(getField("Dataset Name"), {
      target: { value: "Test" },
    });
    fireEvent.change(getField("Description"), {
      target: { value: "Test desc" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    // Simulate error
    pushUpdate({
      status: "ERROR",
      message: "Something went wrong",
      progress: 0,
    });

    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getAllByText("Something went wrong").length).toBeGreaterThan(
      0,
    );
  });

  it("should call onComplete when generation finishes", () => {
    const onComplete = vi.fn();
    render(
      <TestWrapper>
        <GenerateDatasetDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
          onComplete={onComplete}
        />
      </TestWrapper>,
    );

    // Fill form and start
    fireEvent.change(getField("Dataset Name"), {
      target: { value: "Test" },
    });
    fireEvent.change(getField("Description"), {
      target: { value: "Test desc" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    pushUpdate({
      status: "COMPLETE",
      message: "Done",
      progress: 1.0,
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------------
  // Error display
  // ----------------------------------------------------------------

  it("should show error message with whitespace for multi-line errors", () => {
    render(
      <TestWrapper>
        <GenerateDatasetDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );

    // Fill form and start
    fireEvent.change(getField("Dataset Name"), {
      target: { value: "Test" },
    });
    fireEvent.change(getField("Description"), {
      target: { value: "Test desc" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    // Simulate error with multi-line message (like schema validation errors)
    pushUpdate({
      status: "ERROR",
      message:
        "The test suite's input schema is incompatible:\n  • Missing additionalProperties",
      progress: 0,
    });

    expect(screen.getByText("Error")).toBeInTheDocument();
    // The error alert should preserve whitespace
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toContain("incompatible");
  });

  it("should accumulate and display individual entry generation errors", () => {
    render(
      <TestWrapper>
        <GenerateDatasetDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );

    // Fill form and start
    fireEvent.change(getField("Dataset Name"), {
      target: { value: "Test" },
    });
    fireEvent.change(getField("Description"), {
      target: { value: "Test desc" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    // Simulate individual entry errors during GENERATING_DATA
    pushUpdate({
      status: "GENERATING_DATA",
      message: "Error generating entry 1: API error",
      progress: 0.3,
      total: 5,
      completed: 1,
    });

    pushUpdate({
      status: "GENERATING_DATA",
      message: "Error generating entry 3: timeout",
      progress: 0.5,
      total: 5,
      completed: 3,
    });

    // Should show a warning with the accumulated errors
    expect(
      screen.getByText("2 entries failed to generate:"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Error generating entry 1: API error").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Error generating entry 3: timeout").length,
    ).toBeGreaterThan(0);
  });

  it("should not create dataset when plan is approved (deferred)", async () => {
    render(
      <TestWrapper>
        <GenerateDatasetDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId={TEST_SUITE_ID}
        />
      </TestWrapper>,
    );

    // Fill form and start
    fireEvent.change(getField("Dataset Name"), {
      target: { value: "Test" },
    });
    fireEvent.change(getField("Description"), {
      target: { value: "Test desc" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    // Simulate plan ready
    pushUpdate({
      status: "AWAITING_FEEDBACK",
      message: "Plan ready",
      progress: 0.1,
      plan: "Test plan",
      sessionId: "session-456",
      total: 10,
      completed: 0,
    });

    // Click approve — should NOT create dataset yet
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /approve & generate/i }),
      );
    });

    // createDataset should NOT have been called at this point
    expect(mockCreateDataset).not.toHaveBeenCalled();
  });
});

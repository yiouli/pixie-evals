/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { EvaluatorSelectionDialog } from "./EvaluatorSelectionDialog";

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

// Mock the auth store
vi.mock("../lib/store", () => ({
  useAuthStore: (selector: (state: { isAuthenticated: boolean }) => unknown) =>
    selector({ isAuthenticated: true }),
}));

// Mock Apollo useQuery
const mockQueryResult = {
  data: undefined as unknown,
  loading: false,
  error: undefined as unknown,
};

vi.mock("@apollo/client", () => ({
  useQuery: () => mockQueryResult,
}));

vi.mock("../lib/apolloClient", () => ({
  remoteClient: {},
}));

describe("EvaluatorSelectionDialog", () => {
  beforeEach(() => {
    mockQueryResult.data = undefined;
    mockQueryResult.loading = false;
    mockQueryResult.error = undefined;
  });

  it("should render the dialog when open", () => {
    render(
      <TestWrapper>
        <EvaluatorSelectionDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId="ts-1"
        />
      </TestWrapper>,
    );
    expect(screen.getByText("Select Evaluator")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(
      <TestWrapper>
        <EvaluatorSelectionDialog
          open={false}
          onClose={vi.fn()}
          testSuiteId="ts-1"
        />
      </TestWrapper>,
    );
    expect(screen.queryByText("Select Evaluator")).not.toBeInTheDocument();
  });

  it("should show empty message when no evaluators", () => {
    mockQueryResult.data = { listEvaluators: [] };

    render(
      <TestWrapper>
        <EvaluatorSelectionDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId="ts-1"
        />
      </TestWrapper>,
    );
    expect(
      screen.getByText("No evaluators available for this test suite."),
    ).toBeInTheDocument();
  });

  it("should list evaluators when data is available", () => {
    mockQueryResult.data = {
      listEvaluators: [
        {
          id: "ev-1",
          name: "Accuracy Evaluator",
          description: "Checks accuracy",
          testSuite: "ts-1",
          storagePath: "/path",
          updatedAt: "2026-02-25T00:00:00Z",
        },
        {
          id: "ev-2",
          name: "Relevance Evaluator",
          description: null,
          testSuite: "ts-1",
          storagePath: "/path2",
          updatedAt: "2026-02-25T00:00:00Z",
        },
      ],
    };

    render(
      <TestWrapper>
        <EvaluatorSelectionDialog
          open={true}
          onClose={vi.fn()}
          testSuiteId="ts-1"
        />
      </TestWrapper>,
    );
    expect(screen.getByText("Accuracy Evaluator")).toBeInTheDocument();
    expect(screen.getByText("Relevance Evaluator")).toBeInTheDocument();
  });

  it("should call onSelect and onClose when evaluator is clicked", () => {
    mockQueryResult.data = {
      listEvaluators: [
        {
          id: "ev-1",
          name: "My Evaluator",
          description: null,
          testSuite: "ts-1",
          storagePath: "/path",
          updatedAt: null,
        },
      ],
    };

    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <TestWrapper>
        <EvaluatorSelectionDialog
          open={true}
          onClose={onClose}
          testSuiteId="ts-1"
          onSelect={onSelect}
        />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByText("My Evaluator"));
    expect(onSelect).toHaveBeenCalledWith("ev-1");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should call onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <EvaluatorSelectionDialog
          open={true}
          onClose={onClose}
          testSuiteId="ts-1"
        />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { LinkTestSuiteDialog } from "./LinkTestSuiteDialog";

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

// Mock useTestSuites hook
const mockTestSuites = {
  testSuites: [] as Array<{ id: string; name: string }>,
  loading: false,
};

vi.mock("../hooks/useTestSuites", () => ({
  useTestSuites: () => mockTestSuites,
}));

describe("LinkTestSuiteDialog", () => {
  beforeEach(() => {
    mockTestSuites.testSuites = [];
    mockTestSuites.loading = false;
  });

  it("should render the dialog when open", () => {
    render(
      <TestWrapper>
        <LinkTestSuiteDialog
          open={true}
          onClose={vi.fn()}
          onLink={vi.fn()}
        />
      </TestWrapper>,
    );
    expect(screen.getByText("Link to Test Suite")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(
      <TestWrapper>
        <LinkTestSuiteDialog
          open={false}
          onClose={vi.fn()}
          onLink={vi.fn()}
        />
      </TestWrapper>,
    );
    expect(screen.queryByText("Link to Test Suite")).not.toBeInTheDocument();
  });

  it("should show empty message when no test suites exist", () => {
    mockTestSuites.testSuites = [];

    render(
      <TestWrapper>
        <LinkTestSuiteDialog
          open={true}
          onClose={vi.fn()}
          onLink={vi.fn()}
        />
      </TestWrapper>,
    );
    expect(
      screen.getByText("No test suites available. Create one first."),
    ).toBeInTheDocument();
  });

  it("should call onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <LinkTestSuiteDialog
          open={true}
          onClose={onClose}
          onLink={vi.fn()}
        />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should disable Link button when no test suite selected", () => {
    mockTestSuites.testSuites = [
      { id: "ts-1", name: "Suite 1" },
    ];

    render(
      <TestWrapper>
        <LinkTestSuiteDialog
          open={true}
          onClose={vi.fn()}
          onLink={vi.fn()}
        />
      </TestWrapper>,
    );
    expect(screen.getByRole("button", { name: "Link" })).toBeDisabled();
  });
});

/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { EvaluationDialog } from "./EvaluationDialog";

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

const SAMPLE_METRICS = [
  { id: "m1", name: "Accuracy" },
  { id: "m2", name: "Relevance" },
];

describe("EvaluationDialog", () => {
  it("should render the dialog when open", () => {
    render(
      <TestWrapper>
        <EvaluationDialog open={true} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(screen.getByText("AI Evaluation")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(
      <TestWrapper>
        <EvaluationDialog open={false} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(screen.queryByText("AI Evaluation")).not.toBeInTheDocument();
  });

  it("should show progress bar at 0%", () => {
    render(
      <TestWrapper>
        <EvaluationDialog open={true} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(screen.getByText("Evaluation progress")).toBeInTheDocument();
    expect(screen.getByText("0% complete")).toBeInTheDocument();
  });

  it("should render metric statistics cards", () => {
    render(
      <TestWrapper>
        <EvaluationDialog
          open={true}
          onClose={vi.fn()}
          metrics={SAMPLE_METRICS}
        />
      </TestWrapper>,
    );
    expect(screen.getByText("Accuracy")).toBeInTheDocument();
    expect(screen.getByText("Relevance")).toBeInTheDocument();
    expect(screen.getByText("Metrics Statistics")).toBeInTheDocument();
  });

  it("should show 'no metrics' message when empty", () => {
    render(
      <TestWrapper>
        <EvaluationDialog open={true} onClose={vi.fn()} metrics={[]} />
      </TestWrapper>,
    );
    expect(screen.getByText("No metrics configured")).toBeInTheDocument();
  });

  it("should call onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <EvaluationDialog open={true} onClose={onClose} />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

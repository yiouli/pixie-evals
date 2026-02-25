/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ManualLabelingDialog } from "./ManualLabelingDialog";

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

const SAMPLE_METRICS = [
  { id: "m1", name: "Accuracy" },
  { id: "m2", name: "Relevance" },
];

describe("ManualLabelingDialog", () => {
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

  it("should show 'no candidate' message when no entryId", () => {
    render(
      <TestWrapper>
        <ManualLabelingDialog open={true} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(
      screen.getByText("No candidate available for labeling"),
    ).toBeInTheDocument();
  });

  it("should render an iframe when entryId is provided", () => {
    render(
      <TestWrapper>
        <ManualLabelingDialog
          open={true}
          onClose={vi.fn()}
          entryId="entry-123"
        />
      </TestWrapper>,
    );
    const iframe = screen.getByTitle("Labeling UI");
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute("src")).toContain("entry-123");
  });

  it("should render metric sliders", () => {
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
  });

  it("should show 'no metrics' message when metrics is empty", () => {
    render(
      <TestWrapper>
        <ManualLabelingDialog open={true} onClose={vi.fn()} metrics={[]} />
      </TestWrapper>,
    );
    expect(
      screen.getByText("No metrics configured for this test suite"),
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

  it("should disable Save when no entryId", () => {
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
        <ManualLabelingDialog
          open={true}
          onClose={vi.fn()}
          onSkip={onSkip}
        />
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
});

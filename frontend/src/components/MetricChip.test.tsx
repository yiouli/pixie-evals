/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { MetricChip } from "./MetricChip";
import type { Metric } from "../lib/metricUtils";

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

const BINARY_METRIC: Metric = {
  __typename: "MetricType",
  id: "m-binary",
  name: "Pass/Fail",
  description: "Simple pass or fail",
  config: { type: "scale", scaling: 1 },
  account: "acc-1",
};

const SCALE_METRIC: Metric = {
  __typename: "MetricType",
  id: "m-scale",
  name: "Accuracy",
  description: null,
  config: { type: "scale", scaling: 5 },
  account: "acc-1",
};

const CATEGORY_METRIC: Metric = {
  __typename: "MetricType",
  id: "m-cat",
  name: "Sentiment",
  description: "Tone of the response",
  config: { type: "category", categories: ["Positive", "Negative", "Neutral"] },
  account: "acc-1",
};

describe("MetricChip", () => {
  it("renders the metric name", () => {
    render(
      <TestWrapper>
        <MetricChip metric={SCALE_METRIC} />
      </TestWrapper>,
    );
    expect(screen.getByText("Accuracy")).toBeInTheDocument();
  });

  it("renders ToggleOffRounded icon for binary metrics", () => {
    render(
      <TestWrapper>
        <MetricChip metric={BINARY_METRIC} />
      </TestWrapper>,
    );
    expect(screen.getByTestId("ToggleOffRoundedIcon")).toBeInTheDocument();
  });

  it("renders LinearScale icon for scale metrics", () => {
    render(
      <TestWrapper>
        <MetricChip metric={SCALE_METRIC} />
      </TestWrapper>,
    );
    expect(screen.getByTestId("LinearScaleIcon")).toBeInTheDocument();
  });

  it("renders CategoryRounded icon for category metrics", () => {
    render(
      <TestWrapper>
        <MetricChip metric={CATEGORY_METRIC} />
      </TestWrapper>,
    );
    expect(screen.getByTestId("CategoryRoundedIcon")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      <TestWrapper>
        <MetricChip metric={SCALE_METRIC} onClick={onClick} />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByText("Accuracy"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("calls onDelete when delete icon is clicked", () => {
    const onDelete = vi.fn();
    render(
      <TestWrapper>
        <MetricChip metric={SCALE_METRIC} onDelete={onDelete} />
      </TestWrapper>,
    );
    const deleteIcon = screen.getByTestId("CancelIcon");
    fireEvent.click(deleteIcon);
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("shows popover with metric details on hover", async () => {
    render(
      <TestWrapper>
        <MetricChip metric={CATEGORY_METRIC} />
      </TestWrapper>,
    );
    const chip = screen.getByText("Sentiment");
    fireEvent.mouseEnter(chip.closest(".MuiChip-root")!);
    expect(
      await screen.findByText("Tone of the response"),
    ).toBeInTheDocument();
    expect(screen.getByText("Type: Category")).toBeInTheDocument();
    expect(
      screen.getByText("Categories: Positive, Negative, Neutral"),
    ).toBeInTheDocument();
  });
});

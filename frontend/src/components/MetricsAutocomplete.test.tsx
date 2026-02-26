/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { MetricsAutocomplete } from "./MetricsAutocomplete";
import type { Metric } from "../lib/metricUtils";

const MOCK_METRICS: Metric[] = [
  {
    __typename: "MetricType",
    id: "m1",
    name: "Accuracy",
    description: "Accuracy metric",
    config: { type: "scale", scaling: 5 },
    account: "acc-1",
  },
  {
    __typename: "MetricType",
    id: "m2",
    name: "Relevance",
    description: null,
    config: { type: "scale", scaling: 1 },
    account: "acc-1",
  },
  {
    __typename: "MetricType",
    id: "m3",
    name: "Tone",
    description: null,
    config: { type: "category", categories: ["Formal", "Casual"] },
    account: "acc-1",
  },
];

// Mock useMetrics
vi.mock("../hooks/useMetrics", () => ({
  useMetrics: () => ({
    metrics: MOCK_METRICS,
    loading: false,
    error: null,
    createMetric: vi.fn(),
    refetch: vi.fn(),
  }),
}));

// Mock MetricDialog to avoid its dependencies
vi.mock("./MetricDialog", () => ({
  MetricDialog: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="metric-dialog">
        <button onClick={onClose}>Close dialog</button>
      </div>
    ) : null,
}));

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe("MetricsAutocomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with placeholder when no metrics selected", () => {
    render(
      <TestWrapper>
        <MetricsAutocomplete value={[]} onChange={vi.fn()} />
      </TestWrapper>,
    );
    expect(
      screen.getByPlaceholderText("Select metrics..."),
    ).toBeInTheDocument();
  });

  it("renders selected metrics as chips", () => {
    render(
      <TestWrapper>
        <MetricsAutocomplete
          value={[MOCK_METRICS[0]!]}
          onChange={vi.fn()}
        />
      </TestWrapper>,
    );
    expect(screen.getByText("Accuracy")).toBeInTheDocument();
  });

  it("shows options dropdown with 'Create new metric...' option", async () => {
    render(
      <TestWrapper>
        <MetricsAutocomplete value={[]} onChange={vi.fn()} />
      </TestWrapper>,
    );
    // Open the autocomplete dropdown via the Open button
    const openButton = screen.getByTitle("Open");
    fireEvent.click(openButton);

    expect(
      await screen.findByText("Create new metric..."),
    ).toBeInTheDocument();
  });

  it("shows metric options in dropdown", async () => {
    render(
      <TestWrapper>
        <MetricsAutocomplete value={[]} onChange={vi.fn()} />
      </TestWrapper>,
    );
    const openButton = screen.getByTitle("Open");
    fireEvent.click(openButton);

    expect(await screen.findByText("Accuracy")).toBeInTheDocument();
    expect(screen.getByText("Relevance")).toBeInTheDocument();
    expect(screen.getByText("Tone")).toBeInTheDocument();
  });

  it("opens MetricDialog when 'Create new metric...' is clicked", async () => {
    render(
      <TestWrapper>
        <MetricsAutocomplete value={[]} onChange={vi.fn()} />
      </TestWrapper>,
    );
    const openButton = screen.getByTitle("Open");
    fireEvent.click(openButton);

    const createOption = await screen.findByText("Create new metric...");
    fireEvent.click(createOption);

    expect(screen.getByTestId("metric-dialog")).toBeInTheDocument();
  });

  it("calls onChange when a metric is selected", async () => {
    const onChange = vi.fn();
    render(
      <TestWrapper>
        <MetricsAutocomplete value={[]} onChange={onChange} />
      </TestWrapper>,
    );
    const openButton = screen.getByTitle("Open");
    fireEvent.click(openButton);

    const option = await screen.findByText("Accuracy");
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith([MOCK_METRICS[0]]);
  });
});

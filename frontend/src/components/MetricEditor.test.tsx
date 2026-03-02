/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  MetricEditor,
  type MetricConfig,
  createEmptyMetric,
} from "./MetricEditor";

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

function makeMetric(overrides: Partial<MetricConfig> = {}): MetricConfig {
  return { ...createEmptyMetric(), ...overrides };
}

describe("MetricEditor", () => {
  it("should render a metric item when value is non-empty", () => {
    const metric = makeMetric({ name: "Accuracy" });
    render(
      <TestWrapper>
        <MetricEditor value={[metric]} onChange={vi.fn()} />
      </TestWrapper>,
    );
    const input = screen.getByDisplayValue("Accuracy");
    expect(input).toBeInTheDocument();
  });

  it("should render the 'Add metric' button", () => {
    render(
      <TestWrapper>
        <MetricEditor value={[]} onChange={vi.fn()} />
      </TestWrapper>,
    );
    expect(
      screen.getByRole("button", { name: /add metric/i }),
    ).toBeInTheDocument();
  });

  it("should add a new empty metric when 'Add metric' clicked", () => {
    const onChange = vi.fn();
    render(
      <TestWrapper>
        <MetricEditor value={[]} onChange={onChange} />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: /add metric/i }));
    expect(onChange).toHaveBeenCalledOnce();
    const newValue = onChange.mock.calls[0]?.[0] as MetricConfig[];
    expect(newValue).toHaveLength(1);
    expect(newValue[0]?.type).toBe("scale");
  });

  it("should show scale slider by default", () => {
    const metric = makeMetric({ name: "Quality", type: "scale", scaleMax: 10 });
    render(
      <TestWrapper>
        <MetricEditor value={[metric]} onChange={vi.fn()} />
      </TestWrapper>,
    );
    expect(screen.getByText(/Scale: 1 – 10/)).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("should show Scale/Category toggle buttons", () => {
    const metric = makeMetric({ name: "Test" });
    render(
      <TestWrapper>
        <MetricEditor value={[metric]} onChange={vi.fn()} />
      </TestWrapper>,
    );
    expect(screen.getByRole("button", { name: "Scale" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Category" }),
    ).toBeInTheDocument();
  });

  it("should show category UI when type is category", () => {
    const metric = makeMetric({
      name: "Sentiment",
      type: "category",
      categories: ["Positive", "Negative"],
    });
    render(
      <TestWrapper>
        <MetricEditor value={[metric]} onChange={vi.fn()} />
      </TestWrapper>,
    );
    expect(screen.getByText("Positive")).toBeInTheDocument();
    expect(screen.getByText("Negative")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Add category...")).toBeInTheDocument();
  });

  it("should update metric name when input changes", () => {
    const metric = makeMetric({ name: "Old" });
    const onChange = vi.fn();
    render(
      <TestWrapper>
        <MetricEditor value={[metric]} onChange={onChange} />
      </TestWrapper>,
    );
    fireEvent.change(screen.getByDisplayValue("Old"), {
      target: { value: "New" },
    });
    expect(onChange).toHaveBeenCalledOnce();
    const updated = onChange.mock.calls[0]?.[0] as MetricConfig[];
    expect(updated[0]?.name).toBe("New");
  });
});

describe("createEmptyMetric", () => {
  it("should return a metric with default scale type", () => {
    const metric = createEmptyMetric();
    expect(metric.type).toBe("scale");
    expect(metric.scaleMax).toBe(10);
    expect(metric.categories).toEqual([]);
    expect(metric.name).toBe("");
    expect(metric.key).toBeTruthy();
  });

  it("should generate unique keys", () => {
    const a = createEmptyMetric();
    const b = createEmptyMetric();
    expect(a.key).not.toBe(b.key);
  });
});

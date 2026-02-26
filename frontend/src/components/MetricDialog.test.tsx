/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { MetricDialog } from "./MetricDialog";
import type { Metric } from "../lib/metricUtils";

// Mock useMetrics hook
const mockCreateMetric = vi.fn();
vi.mock("../hooks/useMetrics", () => ({
  useMetrics: () => ({
    metrics: [],
    loading: false,
    error: null,
    createMetric: mockCreateMetric,
    refetch: vi.fn(),
  }),
}));

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

const SCALE_METRIC: Metric = {
  __typename: "MetricType",
  id: "m-scale",
  name: "Accuracy",
  description: "How accurate",
  config: { type: "scale", scaling: 5 },
  account: "acc-1",
};

const CATEGORY_METRIC: Metric = {
  __typename: "MetricType",
  id: "m-cat",
  name: "Sentiment",
  description: null,
  config: { type: "category", categories: ["Good", "Bad"] },
  account: "acc-1",
};

const BINARY_METRIC: Metric = {
  __typename: "MetricType",
  id: "m-binary",
  name: "Pass/Fail",
  description: null,
  config: { type: "scale", scaling: 1 },
  account: "acc-1",
};

describe("MetricDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create mode", () => {
    it("renders with empty name input", () => {
      render(
        <TestWrapper>
          <MetricDialog open={true} onClose={vi.fn()} />
        </TestWrapper>,
      );
      const input = screen.getByPlaceholderText("Metric name");
      expect(input).toBeInTheDocument();
      expect((input as HTMLInputElement).value).toBe("");
    });

    it("renders type toggle with binary, scale, and category options", () => {
      render(
        <TestWrapper>
          <MetricDialog open={true} onClose={vi.fn()} />
        </TestWrapper>,
      );
      expect(screen.getByRole("button", { name: /binary/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /scale/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /category/i })).toBeInTheDocument();
    });

    it("Create button is disabled when name is empty", () => {
      render(
        <TestWrapper>
          <MetricDialog open={true} onClose={vi.fn()} />
        </TestWrapper>,
      );
      expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
    });

    it("Create button is enabled when name is filled (binary type)", () => {
      render(
        <TestWrapper>
          <MetricDialog open={true} onClose={vi.fn()} />
        </TestWrapper>,
      );
      fireEvent.change(screen.getByPlaceholderText("Metric name"), {
        target: { value: "My Metric" },
      });
      expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();
    });

    it("shows scale slider when scale type is selected", () => {
      render(
        <TestWrapper>
          <MetricDialog open={true} onClose={vi.fn()} />
        </TestWrapper>,
      );
      // Click the "Scale" toggle button
      fireEvent.click(screen.getByRole("button", { name: /scale/i }));
      expect(screen.getByText(/Scale range/)).toBeInTheDocument();
    });

    it("shows category editor when category type is selected", () => {
      render(
        <TestWrapper>
          <MetricDialog open={true} onClose={vi.fn()} />
        </TestWrapper>,
      );
      fireEvent.click(screen.getByRole("button", { name: /category/i }));
      expect(screen.getByText("Categories")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Add category..."),
      ).toBeInTheDocument();
    });

    it("calls onClose when Cancel is clicked", () => {
      const onClose = vi.fn();
      render(
        <TestWrapper>
          <MetricDialog open={true} onClose={onClose} />
        </TestWrapper>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("calls createMetric with binary config", async () => {
      mockCreateMetric.mockResolvedValue("new-id");
      const onCreated = vi.fn();
      render(
        <TestWrapper>
          <MetricDialog
            open={true}
            onClose={vi.fn()}
            onCreated={onCreated}
          />
        </TestWrapper>,
      );
      fireEvent.change(screen.getByPlaceholderText("Metric name"), {
        target: { value: "Binary Check" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Create" }));
      await vi.waitFor(() => {
        expect(mockCreateMetric).toHaveBeenCalledWith({
          name: "Binary Check",
          description: undefined,
          config: { type: "scale", scaling: 1 },
        });
      });
    });
  });

  describe("edit mode", () => {
    it("renders metric name as static text", () => {
      render(
        <TestWrapper>
          <MetricDialog
            open={true}
            onClose={vi.fn()}
            metric={SCALE_METRIC}
          />
        </TestWrapper>,
      );
      expect(screen.getByText("Accuracy")).toBeInTheDocument();
      // Should not have the name input
      expect(
        screen.queryByPlaceholderText("Metric name"),
      ).not.toBeInTheDocument();
    });

    it("shows a type pill instead of toggle buttons", () => {
      render(
        <TestWrapper>
          <MetricDialog
            open={true}
            onClose={vi.fn()}
            metric={SCALE_METRIC}
          />
        </TestWrapper>,
      );
      // Should show a Chip with "Scale 1–5"
      expect(screen.getByText("Scale 1\u20135")).toBeInTheDocument();
      // No toggle buttons in edit mode
      expect(
        screen.queryByRole("button", { name: /binary/i }),
      ).not.toBeInTheDocument();
    });

    it("shows Binary type pill for metric with scaling=1", () => {
      render(
        <TestWrapper>
          <MetricDialog
            open={true}
            onClose={vi.fn()}
            metric={BINARY_METRIC}
          />
        </TestWrapper>,
      );
      expect(screen.getByText("Binary")).toBeInTheDocument();
    });

    it("does not show Create button, shows Close button", () => {
      render(
        <TestWrapper>
          <MetricDialog
            open={true}
            onClose={vi.fn()}
            metric={SCALE_METRIC}
          />
        </TestWrapper>,
      );
      expect(
        screen.queryByRole("button", { name: "Create" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Close" }),
      ).toBeInTheDocument();
    });

    it("shows description as plain text", () => {
      render(
        <TestWrapper>
          <MetricDialog
            open={true}
            onClose={vi.fn()}
            metric={SCALE_METRIC}
          />
        </TestWrapper>,
      );
      expect(screen.getByText("How accurate")).toBeInTheDocument();
      // Should NOT be an input
      expect(
        screen.queryByLabelText("Description (optional)"),
      ).not.toBeInTheDocument();
    });

    it("shows italic 'No description' when description is null", () => {
      render(
        <TestWrapper>
          <MetricDialog
            open={true}
            onClose={vi.fn()}
            metric={BINARY_METRIC}
          />
        </TestWrapper>,
      );
      expect(screen.getByText("No description")).toBeInTheDocument();
    });

    it("shows categories with dividers for category metric", () => {
      render(
        <TestWrapper>
          <MetricDialog
            open={true}
            onClose={vi.fn()}
            metric={CATEGORY_METRIC}
          />
        </TestWrapper>,
      );
      expect(screen.getByText("Good")).toBeInTheDocument();
      expect(screen.getByText("Bad")).toBeInTheDocument();
      expect(screen.getByText("Category")).toBeInTheDocument();
    });
  });
});

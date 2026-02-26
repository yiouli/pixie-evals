/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { EvaluationCard } from "./EvaluationCard";

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

// Mock useTestSuites hook
const mockTestSuitesReturn = {
  testSuites: [] as Array<{
    id: string;
    name: string;
    description?: string | null;
    config: unknown;
  }>,
  loading: false,
  error: null,
  refetch: vi.fn(),
  createTestSuite: vi.fn(),
};

vi.mock("../hooks/useTestSuites", () => ({
  useTestSuites: () => mockTestSuitesReturn,
}));

// Mock useMetrics hook
const mockMetricsReturn = {
  metrics: [] as Array<{
    id: string;
    name: string;
    description?: string | null;
    config: unknown;
  }>,
  loading: false,
  error: null,
  createMetric: vi.fn(),
  refetch: vi.fn(),
};

vi.mock("../hooks/useMetrics", () => ({
  useMetrics: () => mockMetricsReturn,
}));

describe("EvaluationCard", () => {
  const defaultProps = {
    testSuiteId: null as string | null,
    onCreateEvaluation: vi.fn(),
    onLinkChange: vi.fn(),
    onEvaluate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTestSuitesReturn.testSuites = [];
    mockTestSuitesReturn.loading = false;
    mockMetricsReturn.metrics = [];
    mockMetricsReturn.loading = false;
  });

  it("should show create button when no test suite is linked", () => {
    render(
      <TestWrapper>
        <EvaluationCard {...defaultProps} testSuiteId={null} />
      </TestWrapper>,
    );
    expect(
      screen.getByRole("button", { name: /create evaluation/i }),
    ).toBeInTheDocument();
  });

  it("should show create button when testSuiteId has no match in remote", () => {
    mockTestSuitesReturn.testSuites = [
      {
        id: "ts-other",
        name: "Other Suite",
        description: null,
        config: {},
      },
    ];

    render(
      <TestWrapper>
        <EvaluationCard {...defaultProps} testSuiteId="ts-missing" />
      </TestWrapper>,
    );
    expect(
      screen.getByRole("button", { name: /create evaluation/i }),
    ).toBeInTheDocument();
  });

  it("should call onCreateEvaluation when create button is clicked", () => {
    const onCreateEvaluation = vi.fn();

    render(
      <TestWrapper>
        <EvaluationCard
          {...defaultProps}
          testSuiteId={null}
          onCreateEvaluation={onCreateEvaluation}
        />
      </TestWrapper>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /create evaluation/i }),
    );
    expect(onCreateEvaluation).toHaveBeenCalledOnce();
  });

  it("should display linked evaluation name and description", () => {
    mockTestSuitesReturn.testSuites = [
      {
        id: "ts-1",
        name: "My Evaluation",
        description: "A test evaluation for quality.",
        config: {},
      },
    ];

    render(
      <TestWrapper>
        <EvaluationCard {...defaultProps} testSuiteId="ts-1" />
      </TestWrapper>,
    );
    expect(screen.getByText("My Evaluation")).toBeInTheDocument();
    expect(
      screen.getByText("A test evaluation for quality."),
    ).toBeInTheDocument();
  });

  it("should show evaluate button when linked to a test suite", () => {
    mockTestSuitesReturn.testSuites = [
      {
        id: "ts-1",
        name: "My Evaluation",
        description: null,
        config: {},
      },
    ];

    render(
      <TestWrapper>
        <EvaluationCard {...defaultProps} testSuiteId="ts-1" />
      </TestWrapper>,
    );
    expect(
      screen.getByRole("button", { name: /evaluate/i }),
    ).toBeInTheDocument();
  });

  it("should call onEvaluate when evaluate button is clicked", () => {
    const onEvaluate = vi.fn();
    mockTestSuitesReturn.testSuites = [
      {
        id: "ts-1",
        name: "My Evaluation",
        description: null,
        config: {},
      },
    ];

    render(
      <TestWrapper>
        <EvaluationCard
          {...defaultProps}
          testSuiteId="ts-1"
          onEvaluate={onEvaluate}
        />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: /evaluate/i }));
    expect(onEvaluate).toHaveBeenCalledOnce();
  });

  it("should show loading state", () => {
    mockTestSuitesReturn.loading = true;

    render(
      <TestWrapper>
        <EvaluationCard {...defaultProps} testSuiteId="ts-1" />
      </TestWrapper>,
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("should show 'No description' when evaluation has no description", () => {
    mockTestSuitesReturn.testSuites = [
      {
        id: "ts-1",
        name: "My Evaluation",
        description: null,
        config: {},
      },
    ];

    render(
      <TestWrapper>
        <EvaluationCard {...defaultProps} testSuiteId="ts-1" />
      </TestWrapper>,
    );
    expect(screen.getByText(/no description/i)).toBeInTheDocument();
  });

  it("should call onLinkChange when a different evaluation is selected from dropdown", () => {
    const onLinkChange = vi.fn();
    mockTestSuitesReturn.testSuites = [
      { id: "ts-1", name: "Suite A", description: null, config: {} },
      { id: "ts-2", name: "Suite B", description: null, config: {} },
    ];

    render(
      <TestWrapper>
        <EvaluationCard
          {...defaultProps}
          testSuiteId="ts-1"
          onLinkChange={onLinkChange}
        />
      </TestWrapper>,
    );

    // Open the select dropdown
    const selectButton = screen.getByRole("combobox");
    fireEvent.mouseDown(selectButton);

    // Select "Suite B" from the dropdown
    const listbox = within(screen.getByRole("listbox"));
    fireEvent.click(listbox.getByText("Suite B"));

    expect(onLinkChange).toHaveBeenCalledWith("ts-2");
  });

  it("should call onCreateEvaluation when 'Create new' is selected from dropdown", () => {
    const onCreateEvaluation = vi.fn();
    mockTestSuitesReturn.testSuites = [
      { id: "ts-1", name: "Suite A", description: null, config: {} },
    ];

    render(
      <TestWrapper>
        <EvaluationCard
          {...defaultProps}
          testSuiteId="ts-1"
          onCreateEvaluation={onCreateEvaluation}
        />
      </TestWrapper>,
    );

    // Open the select dropdown
    const selectButton = screen.getByRole("combobox");
    fireEvent.mouseDown(selectButton);

    // Select "Create new evaluation..." option
    const listbox = within(screen.getByRole("listbox"));
    fireEvent.click(listbox.getByText(/create new evaluation/i));

    expect(onCreateEvaluation).toHaveBeenCalledOnce();
  });

  it("should display metric chips when metrics exist", () => {
    mockTestSuitesReturn.testSuites = [
      {
        id: "ts-1",
        name: "Suite A",
        description: null,
        config: { input_schema: {} },
      },
    ];
    mockMetricsReturn.metrics = [
      {
        id: "m-1",
        name: "Accuracy",
        description: null,
        config: { type: "scale", scaling: 1 },
      },
      {
        id: "m-2",
        name: "Relevance",
        description: null,
        config: { type: "scale", scaling: 5 },
      },
    ];

    render(
      <TestWrapper>
        <EvaluationCard {...defaultProps} testSuiteId="ts-1" />
      </TestWrapper>,
    );

    // Metrics should be displayed (even though we can't filter by test suite yet)
    expect(screen.getByText("Accuracy")).toBeInTheDocument();
    expect(screen.getByText("Relevance")).toBeInTheDocument();
  });
});

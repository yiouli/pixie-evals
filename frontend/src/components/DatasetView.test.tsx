/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { DatasetView } from "./DatasetView";

const theme = createTheme();

// ---- Mock child components ----

vi.mock("./EvaluationCard", () => ({
  EvaluationCard: ({
    testSuiteId,
    onCreateEvaluation,
    onLinkChange,
    onEvaluate,
  }: {
    testSuiteId: string | null;
    onCreateEvaluation: () => void;
    onLinkChange: (id: string) => void;
    onEvaluate: () => void;
  }) => (
    <div data-testid="evaluation-card" data-test-suite-id={testSuiteId}>
      <button onClick={onCreateEvaluation}>Create Evaluation</button>
      <button onClick={() => onLinkChange("ts-new")}>Change Link</button>
      <button onClick={onEvaluate}>Evaluate</button>
    </div>
  ),
}));

vi.mock("./EditableText", () => ({
  EditableText: ({ value }: { value: string }) => <span>{value}</span>,
}));

vi.mock("./TestSuiteConfigDialog", () => ({
  TestSuiteConfigDialog: () => null,
}));

vi.mock("./EvaluatorSelectionDialog", () => ({
  EvaluatorSelectionDialog: () => null,
}));

vi.mock("./EvaluationDialog", () => ({
  EvaluationDialog: () => null,
}));

// ---- Mock Apollo hooks ----

const mockUseQueryReturn = {
  data: undefined as unknown,
  loading: false,
  error: undefined as unknown,
  refetch: vi.fn(),
};

const mockMutate = vi.fn().mockResolvedValue({});

vi.mock("@apollo/client", () => ({
  useQuery: () => mockUseQueryReturn,
  useMutation: () => [mockMutate, {}],
  gql: (s: TemplateStringsArray) => s,
}));

vi.mock("../lib/apolloClient", () => ({
  sdkClient: {},
  remoteClient: {},
}));

vi.mock("../graphql/sdk/query", () => ({
  GET_DATASET: "GET_DATASET",
  GET_DATA_ENTRIES: "GET_DATA_ENTRIES",
}));

vi.mock("../graphql/sdk/mutation", () => ({
  LINK_DATASET_TO_TEST_SUITE: "LINK_DATASET_TO_TEST_SUITE",
}));

function renderWithRouter(datasetId = "ds-1") {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[`/dataset/${datasetId}`]}>
        <Routes>
          <Route path="/dataset/:datasetId" element={<DatasetView />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("DatasetView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQueryReturn.data = undefined;
    mockUseQueryReturn.loading = false;
    mockUseQueryReturn.error = undefined;
  });

  it("should show loading spinner when dataset is loading", () => {
    mockUseQueryReturn.loading = true;

    renderWithRouter();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("should show error alert when dataset fails to load", () => {
    mockUseQueryReturn.error = new Error("Network error");

    renderWithRouter();
    expect(screen.getByText(/failed to load dataset/i)).toBeInTheDocument();
  });

  it("should render EvaluationCard when dataset is loaded", () => {
    mockUseQueryReturn.data = {
      getDataset: {
        id: "ds-1",
        fileName: "test.csv",
        createdAt: "2026-01-01",
        rowSchema: null,
        testSuiteId: "ts-1",
      },
      getDataEntries: [],
    };

    renderWithRouter();
    expect(screen.getByTestId("evaluation-card")).toBeInTheDocument();
    expect(screen.getByTestId("evaluation-card")).toHaveAttribute(
      "data-test-suite-id",
      "ts-1",
    );
  });

  it("should render EvaluationCard with null testSuiteId when unlinked", () => {
    mockUseQueryReturn.data = {
      getDataset: {
        id: "ds-1",
        fileName: "test.csv",
        createdAt: "2026-01-01",
        rowSchema: null,
        testSuiteId: null,
      },
      getDataEntries: [],
    };

    renderWithRouter();
    const card = screen.getByTestId("evaluation-card");
    expect(card).toBeInTheDocument();
    // Null testSuiteId renders as no attribute
    expect(card.hasAttribute("data-test-suite-id")).toBe(false);
  });

  it("should display dataset name in editable text", () => {
    mockUseQueryReturn.data = {
      getDataset: {
        id: "ds-1",
        fileName: "my-dataset.csv",
        createdAt: "2026-01-01",
        rowSchema: null,
        testSuiteId: null,
      },
      getDataEntries: [],
    };

    renderWithRouter();
    expect(screen.getByText("my-dataset.csv")).toBeInTheDocument();
  });

  it("should render Delete button", () => {
    mockUseQueryReturn.data = {
      getDataset: {
        id: "ds-1",
        fileName: "test.csv",
        createdAt: "2026-01-01",
        rowSchema: null,
        testSuiteId: null,
      },
      getDataEntries: [],
    };

    renderWithRouter();
    expect(
      screen.getByRole("button", { name: /delete/i }),
    ).toBeInTheDocument();
  });
});

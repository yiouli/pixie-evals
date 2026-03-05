/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TestSuiteView } from "./TestSuiteView";

const theme = createTheme();

// ---- mocks for Apollo hooks ------------------------------------------------

const mockUseQueryReturn = {
  data: undefined as unknown,
  loading: false,
  error: undefined as unknown,
  refetch: vi.fn(),
};

vi.mock("@apollo/client", () => ({
  useQuery: () => mockUseQueryReturn,
  useLazyQuery: () => [
    vi.fn(),
    { loading: false, data: undefined, error: undefined },
  ],
  useSubscription: () => ({ error: undefined }),
  useMutation: () => [vi.fn().mockResolvedValue({ data: {} })],
}));

vi.mock("../lib/apolloClient", () => ({
  sdkClient: {},
  remoteClient: {},
}));

vi.mock("../graphql/remote/query", () => ({
  GET_TEST_SUITE_METRICS: "GET_TEST_SUITE_METRICS",
  GET_OPTIMIZATION_LABEL_STATS: "GET_OPTIMIZATION_LABEL_STATS",
}));

vi.mock("../graphql/remote/subscription", () => ({
  GENERATE_DATASET: {},
}));

vi.mock("../graphql/remote/mutation", () => ({
  SEND_DATASET_GENERATION_FEEDBACK: {},
  ADD_TEST_CASES: {},
}));

vi.mock("../graphql/sdk/mutation", () => ({
  CREATE_DATASET: {},
  ADD_DATA_ENTRY: {},
  UPLOAD_FILE: {},
  LINK_DATASET_TO_TEST_SUITE: {},
}));

vi.mock("../generated/remote/graphql", () => ({
  DatasetGenerationStatusEnum: {
    Planning: "PLANNING",
    AwaitingFeedback: "AWAITING_FEEDBACK",
    GeneratingDescriptions: "GENERATING_DESCRIPTIONS",
    GeneratingData: "GENERATING_DATA",
    Saving: "SAVING",
    Complete: "COMPLETE",
    Error: "ERROR",
  },
}));

// ---- other hooks -----------------------------------------------------------

vi.mock("../hooks/useTestSuites", () => ({
  useTestSuites: () => ({
    testSuites: [{ id: "ts-1", name: "My Suite", config: {} }],
    loading: false,
  }),
}));

// pretend user is always authenticated
vi.mock("../lib/store", () => ({
  useAuthStore: () => () => true,
}));

// stub evaluation hook so we can open the dialog and satisfy required
// callbacks. the actual logic is tested elsewhere.
const mockSubmitLabel = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks/useEvaluation", () => ({
  useEvaluation: () => ({
    testCases: [],
    loading: false,
    error: null,
    submitLabel: mockSubmitLabel,
    removeTestCase: vi.fn(),
    skipLabeling: vi.fn(),
    nextCandidateId: "tc-1",
    refetch: vi.fn(),
    page: 0,
    pageSize: 25,
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    totalCount: 0,
  }),
}));

function renderWithRouter(testSuiteId = "ts-1") {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[`/testsuites/${testSuiteId}`]}>
        <Routes>
          <Route path="/testsuites/:testSuiteId" element={<TestSuiteView />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("TestSuiteView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQueryReturn.data = undefined;
    mockUseQueryReturn.loading = false;
    mockUseQueryReturn.error = undefined;
  });

  it("should refetch optimization stats after a manual label is saved", async () => {
    // initial stats (no labels available -> button disabled)
    mockUseQueryReturn.data = {
      getOptimizationLabelStats: { beforeCutoff: 10, afterCutoff: 0 },
    };

    renderWithRouter();

    // open manual labeling dialog by clicking button
    fireEvent.click(screen.getByRole("button", { name: /Manual Label/i }));

    // dialog should appear
    expect(screen.getByText("Manual Labeling")).toBeInTheDocument();

    // click save to trigger handleSaveLabel
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockSubmitLabel).toHaveBeenCalled();
    });

    // refetch should have been called to refresh label stats
    await waitFor(() => {
      expect(mockUseQueryReturn.refetch).toHaveBeenCalled();
    });
  });
});

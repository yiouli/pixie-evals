/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ManualLabelingDialog } from "./ManualLabelingDialog";

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

// Mock the auth store to provide a token
vi.mock("../lib/store", () => ({
  useAuthStore: (selector: (state: { token: string | null }) => unknown) =>
    selector({ token: "mock-jwt-token" }),
}));

// Mock the env module
vi.mock("../lib/env", () => ({
  SDK_BASE_URL: "http://localhost:8100",
}));

const SAMPLE_METRICS = [
  { id: "m1", name: "Accuracy" },
  { id: "m2", name: "Relevance" },
];

// Helper to set up global fetch mock
function mockFetch(response: { ok: boolean; text?: string; json?: object }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    text: () => Promise.resolve(response.text ?? ""),
    json: () => Promise.resolve(response.json ?? {}),
    statusText: "Not Found",
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("ManualLabelingDialog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

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

  it("should show 'no candidate' message when no testCaseId", () => {
    render(
      <TestWrapper>
        <ManualLabelingDialog open={true} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(
      screen.getByText("No candidate available for labeling"),
    ).toBeInTheDocument();
  });

  it("should fetch labeling HTML with Authorization header", async () => {
    const fetchMock = mockFetch({
      ok: true,
      text: "<html><body>Labeling UI</body></html>",
    });

    render(
      <TestWrapper>
        <ManualLabelingDialog
          open={true}
          onClose={vi.fn()}
          testCaseId="test-case-123"
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8100/labeling/test-case-123",
        { headers: { Authorization: "Bearer mock-jwt-token" } },
      );
    });
  });

  it("should render iframe with srcdoc after successful fetch", async () => {
    mockFetch({
      ok: true,
      text: "<html><body>Labeling Content</body></html>",
    });

    render(
      <TestWrapper>
        <ManualLabelingDialog
          open={true}
          onClose={vi.fn()}
          testCaseId="test-case-456"
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      const iframe = screen.getByTitle("Labeling UI");
      expect(iframe).toBeInTheDocument();
      expect(iframe.getAttribute("srcdoc")).toContain("Labeling Content");
    });
  });

  it("should show error when fetch fails", async () => {
    mockFetch({
      ok: false,
      json: { detail: "Test case not found" },
    });

    render(
      <TestWrapper>
        <ManualLabelingDialog
          open={true}
          onClose={vi.fn()}
          testCaseId="bad-id"
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("Test case not found")).toBeInTheDocument();
    });
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
      screen.getByText("No metrics configured for this evaluation"),
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

  it("should disable Save when no testCaseId", () => {
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

/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { DatasetUploadDialog } from "./DatasetUploadDialog";

// Mock the useDatasetUpload hook
vi.mock("../hooks/useDatasetUpload", () => ({
  useDatasetUpload: () => ({
    uploadFile: mockUploadFile,
    uploading: false,
    error: null,
    reset: vi.fn(),
  }),
}));

const mockUploadFile = vi.fn();

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe("DatasetUploadDialog", () => {
  beforeEach(() => {
    mockUploadFile.mockReset();
  });

  it("should render the dialog when open", () => {
    render(
      <TestWrapper>
        <DatasetUploadDialog open={true} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(screen.getByText("Upload Dataset")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(
      <TestWrapper>
        <DatasetUploadDialog open={false} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(screen.queryByText("Upload Dataset")).not.toBeInTheDocument();
  });

  it("should show drop zone instructions", () => {
    render(
      <TestWrapper>
        <DatasetUploadDialog open={true} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(
      screen.getByText(/drag.*drop.*file|click.*browse/i),
    ).toBeInTheDocument();
  });

  it("should have Cancel and Upload buttons", () => {
    render(
      <TestWrapper>
        <DatasetUploadDialog open={true} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
  });

  it("should disable Upload when no file is selected", () => {
    render(
      <TestWrapper>
        <DatasetUploadDialog open={true} onClose={vi.fn()} />
      </TestWrapper>,
    );
    expect(screen.getByRole("button", { name: "Upload" })).toBeDisabled();
  });

  it("should call onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <DatasetUploadDialog open={true} onClose={onClose} />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

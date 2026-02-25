/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { TestCaseDataGrid } from "./TestCaseDataGrid";

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

const SAMPLE_ROWS = [
  { id: "1", input: "What is AI?", expected_output: "AI is...", label: null },
  { id: "2", input: "Explain ML", expected_output: "ML is...", label: 8 },
];

describe("TestCaseDataGrid", () => {
  it("should render rows in the data grid", () => {
    render(
      <TestWrapper>
        <TestCaseDataGrid rows={SAMPLE_ROWS} />
      </TestWrapper>,
    );
    // DataGrid renders the data in cells
    expect(screen.getByText("What is AI?")).toBeInTheDocument();
    expect(screen.getByText("Explain ML")).toBeInTheDocument();
  });

  it("should auto-detect columns from row keys", () => {
    render(
      <TestWrapper>
        <TestCaseDataGrid rows={SAMPLE_ROWS} />
      </TestWrapper>,
    );
    expect(screen.getByText("Input")).toBeInTheDocument();
    expect(screen.getByText("Expected output")).toBeInTheDocument();
    expect(screen.getByText("Label")).toBeInTheDocument();
  });

  it("should render with empty rows", () => {
    render(
      <TestWrapper>
        <TestCaseDataGrid rows={[]} />
      </TestWrapper>,
    );
    expect(screen.getByText("No rows")).toBeInTheDocument();
  });
});

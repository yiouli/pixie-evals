/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { EditableText } from "./EditableText";

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe("EditableText", () => {
  it("should display the current value in view mode", () => {
    render(
      <TestWrapper>
        <EditableText value="Hello World" onSave={vi.fn()} />
      </TestWrapper>,
    );
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("should display placeholder when value is empty", () => {
    render(
      <TestWrapper>
        <EditableText value="" onSave={vi.fn()} placeholder="Click here" />
      </TestWrapper>,
    );
    expect(screen.getByText("Click here")).toBeInTheDocument();
  });

  it("should switch to edit mode on click", () => {
    render(
      <TestWrapper>
        <EditableText value="Hello" onSave={vi.fn()} />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByText("Hello"));
    const input = screen.getByDisplayValue("Hello");
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("should save on blur", () => {
    const onSave = vi.fn();
    render(
      <TestWrapper>
        <EditableText value="Hello" onSave={onSave} />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByText("Hello"));
    const input = screen.getByDisplayValue("Hello");
    fireEvent.change(input, { target: { value: "World" } });
    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalledWith("World");
  });

  it("should save on Enter key (single-line)", () => {
    const onSave = vi.fn();
    render(
      <TestWrapper>
        <EditableText value="Hello" onSave={onSave} />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByText("Hello"));
    const input = screen.getByDisplayValue("Hello");
    fireEvent.change(input, { target: { value: "New Value" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSave).toHaveBeenCalledWith("New Value");
  });

  it("should cancel on Escape key", () => {
    const onSave = vi.fn();
    render(
      <TestWrapper>
        <EditableText value="Hello" onSave={onSave} />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByText("Hello"));
    const input = screen.getByDisplayValue("Hello");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });
    // Should revert to original and exit edit mode
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("should not call onSave when value has not changed", () => {
    const onSave = vi.fn();
    render(
      <TestWrapper>
        <EditableText value="Hello" onSave={onSave} />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByText("Hello"));
    const input = screen.getByDisplayValue("Hello");
    fireEvent.blur(input);
    expect(onSave).not.toHaveBeenCalled();
  });
});

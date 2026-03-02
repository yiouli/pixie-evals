/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ArrayEditor, type ArrayItemRendererProps } from "./ArrayEditor";

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

/** Simple string items for testing. */
function StringItemRenderer({
  value,
  onChange,
}: ArrayItemRendererProps<string>) {
  return (
    <input
      data-testid="item-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

describe("ArrayEditor", () => {
  it("should render items using the renderItem function", () => {
    render(
      <TestWrapper>
        <ArrayEditor<string>
          value={["alpha", "beta"]}
          onChange={vi.fn()}
          renderItem={(props) => <StringItemRenderer {...props} />}
          getItemId={(item) => item}
        />
      </TestWrapper>,
    );
    const inputs = screen.getAllByTestId("item-input");
    expect(inputs).toHaveLength(2);
    expect((inputs[0] as HTMLInputElement).value).toBe("alpha");
    expect((inputs[1] as HTMLInputElement).value).toBe("beta");
  });

  it("should render the add button with custom label", () => {
    render(
      <TestWrapper>
        <ArrayEditor<string>
          value={[]}
          onChange={vi.fn()}
          renderItem={(props) => <StringItemRenderer {...props} />}
          addLabel="Add step"
        />
      </TestWrapper>,
    );
    expect(
      screen.getByRole("button", { name: /add step/i }),
    ).toBeInTheDocument();
  });

  it("should call onChange with a new item when Add is clicked", () => {
    const onChange = vi.fn();
    render(
      <TestWrapper>
        <ArrayEditor<string>
          value={["a"]}
          onChange={onChange}
          renderItem={(props) => <StringItemRenderer {...props} />}
          createItem={() => "new"}
          getItemId={(item) => item}
        />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: /add item/i }));
    expect(onChange).toHaveBeenCalledWith(["a", "new"]);
  });

  it("should render with no items and just the add button", () => {
    render(
      <TestWrapper>
        <ArrayEditor<string>
          value={[]}
          onChange={vi.fn()}
          renderItem={(props) => <StringItemRenderer {...props} />}
        />
      </TestWrapper>,
    );
    expect(screen.queryByTestId("item-input")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add item/i }),
    ).toBeInTheDocument();
  });

  it("should render delete buttons for each item", () => {
    render(
      <TestWrapper>
        <ArrayEditor<string>
          value={["a", "b"]}
          onChange={vi.fn()}
          renderItem={(props) => <StringItemRenderer {...props} />}
          getItemId={(item) => item}
        />
      </TestWrapper>,
    );
    // Each sortable card has a delete button
    const deleteButtons = screen.getAllByTestId("DeleteOutlineIcon");
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
  });
});

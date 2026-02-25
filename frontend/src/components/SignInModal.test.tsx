/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { SignInModal } from "./SignInModal";
import { useAuthStore } from "../lib/store";

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe("SignInModal", () => {
  it("should render the sign-in form when open", () => {
    render(
      <TestWrapper>
        <SignInModal open={true} />
      </TestWrapper>,
    );
    expect(screen.getByText("Pixie Evals")).toBeInTheDocument();
    expect(screen.getByText("Sign in to continue")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("should not render when open is false", () => {
    render(
      <TestWrapper>
        <SignInModal open={false} />
      </TestWrapper>,
    );
    expect(screen.queryByText("Sign in to continue")).not.toBeInTheDocument();
  });

  it("should show error when username or password is empty", async () => {
    render(
      <TestWrapper>
        <SignInModal open={true} />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    // Wait for the error to appear
    expect(
      await screen.findByText("Please enter both username and password"),
    ).toBeInTheDocument();
  });

  it("should call login with mock token when credentials provided", async () => {
    // Reset store
    useAuthStore.setState({ isAuthenticated: false, token: null });

    render(
      <TestWrapper>
        <SignInModal open={true} />
      </TestWrapper>,
    );

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "testpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    // Should have logged in (store updated)
    // Since mock token includes Date.now(), check isAuthenticated
    await vi.waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });
});

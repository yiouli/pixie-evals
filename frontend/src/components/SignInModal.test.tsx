/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { SignInModal } from "./SignInModal";

const mockLogin = vi.fn();
const mockSignUp = vi.fn();
const mockOAuthLogin = vi.fn();

vi.mock("../hooks", () => ({
  useAuth: () => ({
    login: mockLogin,
    signUp: mockSignUp,
    oAuthLogin: mockOAuthLogin,
    logout: vi.fn(),
    isAuthenticated: false,
    username: null,
  }),
}));

// Default: no OAuth client IDs configured (buttons hidden)
vi.mock("../lib/env", () => ({
  GOOGLE_CLIENT_ID: "",
  GITHUB_CLIENT_ID: "",
}));

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SignInModal", () => {
  describe("sign-in mode (default)", () => {
    it("should render the sign-in form when open", () => {
      render(
        <TestWrapper>
          <SignInModal open={true} />
        </TestWrapper>,
      );
      expect(screen.getByText("Pixie Evals")).toBeInTheDocument();
      expect(screen.getByText("Sign in to continue")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Sign In" }),
      ).toBeInTheDocument();
    });

    it("should not render when open is false", () => {
      render(
        <TestWrapper>
          <SignInModal open={false} />
        </TestWrapper>,
      );
      expect(screen.queryByText("Sign in to continue")).not.toBeInTheDocument();
    });

    it("should show error when email or password is empty", async () => {
      render(
        <TestWrapper>
          <SignInModal open={true} />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

      expect(
        await screen.findByText("Please enter both email and password"),
      ).toBeInTheDocument();
    });

    it("should call login with credentials when provided", async () => {
      mockLogin.mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <SignInModal open={true} />
        </TestWrapper>,
      );

      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "user@test.com" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "testpass" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

      await vi.waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("user@test.com", "testpass");
      });
    });

    it("should show error when login throws", async () => {
      mockLogin.mockRejectedValue(new Error("Invalid credentials"));

      render(
        <TestWrapper>
          <SignInModal open={true} />
        </TestWrapper>,
      );

      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "user@test.com" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "wrongpass" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

      expect(
        await screen.findByText("Invalid credentials"),
      ).toBeInTheDocument();
    });

    it("should not show confirm password field", () => {
      render(
        <TestWrapper>
          <SignInModal open={true} />
        </TestWrapper>,
      );
      expect(
        screen.queryByLabelText("Confirm Password"),
      ).not.toBeInTheDocument();
    });

    it("should show link to switch to sign-up mode", () => {
      render(
        <TestWrapper>
          <SignInModal open={true} />
        </TestWrapper>,
      );
      expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Sign Up" }),
      ).toBeInTheDocument();
    });
  });

  describe("sign-up mode", () => {
    function renderAndSwitchToSignUp() {
      render(
        <TestWrapper>
          <SignInModal open={true} />
        </TestWrapper>,
      );
      // Click the "Sign Up" link to switch modes
      fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    }

    it("should show sign-up UI after toggling mode", () => {
      renderAndSwitchToSignUp();

      expect(screen.getByText("Create an account")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
      // The submit button now reads "Sign Up"
      expect(
        screen.getByRole("button", { name: "Sign Up" }),
      ).toBeInTheDocument();
    });

    it("should show link to switch back to sign-in", () => {
      renderAndSwitchToSignUp();

      expect(screen.getByText("Already have an account?")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Sign In" }),
      ).toBeInTheDocument();
    });

    it("should show error when password is too short", async () => {
      renderAndSwitchToSignUp();

      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "user@test.com" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "short" },
      });
      fireEvent.change(screen.getByLabelText("Confirm Password"), {
        target: { value: "short" },
      });
      fireEvent.submit(screen.getByLabelText("Email").closest("form")!);

      expect(
        await screen.findByText("Password must be at least 8 characters"),
      ).toBeInTheDocument();
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it("should show error when passwords do not match", async () => {
      renderAndSwitchToSignUp();

      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "user@test.com" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "longpassword" },
      });
      fireEvent.change(screen.getByLabelText("Confirm Password"), {
        target: { value: "different" },
      });
      fireEvent.submit(screen.getByLabelText("Email").closest("form")!);

      expect(
        await screen.findByText("Passwords do not match"),
      ).toBeInTheDocument();
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it("should call signUp on valid submission", async () => {
      mockSignUp.mockResolvedValue(undefined);
      renderAndSwitchToSignUp();

      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "new@user.com" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByLabelText("Confirm Password"), {
        target: { value: "password123" },
      });
      fireEvent.submit(screen.getByLabelText("Email").closest("form")!);

      await vi.waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith("new@user.com", "password123");
      });
    });

    it("should show error when signUp throws", async () => {
      mockSignUp.mockRejectedValue(new Error("Email already exists"));
      renderAndSwitchToSignUp();

      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "dup@user.com" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByLabelText("Confirm Password"), {
        target: { value: "password123" },
      });
      fireEvent.submit(screen.getByLabelText("Email").closest("form")!);

      expect(
        await screen.findByText("Email already exists"),
      ).toBeInTheDocument();
    });
  });

  describe("OAuth buttons", () => {
    it("should not show OAuth buttons when client IDs are empty", () => {
      render(
        <TestWrapper>
          <SignInModal open={true} />
        </TestWrapper>,
      );

      expect(
        screen.queryByRole("button", { name: /Google/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /GitHub/i }),
      ).not.toBeInTheDocument();
      // No divider either
      expect(screen.queryByText("or")).not.toBeInTheDocument();
    });
  });
});

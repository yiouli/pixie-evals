/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { AppHeader } from "./AppHeader";

const theme = createTheme();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

// Mock the useAuth hook
const mockLogout = vi.fn();
let mockIsAuthenticated = true;
let mockUsername: string | null = "alice";

vi.mock("../hooks", () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    username: mockUsername,
    logout: mockLogout,
    login: vi.fn(),
  }),
}));

describe("AppHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = true;
    mockUsername = "alice";
  });

  it("should render the Pixie logo and brand name", () => {
    render(
      <TestWrapper>
        <AppHeader />
      </TestWrapper>,
    );
    expect(screen.getByAltText("Pixie Logo")).toBeInTheDocument();
    expect(screen.getByText("Pixie")).toBeInTheDocument();
  });

  it("should render the avatar with the first letter of the username", () => {
    render(
      <TestWrapper>
        <AppHeader />
      </TestWrapper>,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("should render the Sign Out button when authenticated", () => {
    render(
      <TestWrapper>
        <AppHeader />
      </TestWrapper>,
    );
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("should call logout when Sign Out is clicked", () => {
    render(
      <TestWrapper>
        <AppHeader />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByText("Sign Out"));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("should not render avatar or sign-out when not authenticated", () => {
    mockIsAuthenticated = false;
    mockUsername = null;
    render(
      <TestWrapper>
        <AppHeader />
      </TestWrapper>,
    );
    expect(screen.queryByText("Sign Out")).not.toBeInTheDocument();
    // Logo should still be visible
    expect(screen.getByAltText("Pixie Logo")).toBeInTheDocument();
  });

  it("should show '?' initial when username is null", () => {
    mockUsername = null;
    render(
      <TestWrapper>
        <AppHeader />
      </TestWrapper>,
    );
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("should show uppercase initial for lowercase username", () => {
    mockUsername = "bob";
    render(
      <TestWrapper>
        <AppHeader />
      </TestWrapper>,
    );
    expect(screen.getByText("B")).toBeInTheDocument();
  });
});

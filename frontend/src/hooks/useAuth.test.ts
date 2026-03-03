/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "./useAuth";
import { useAuthStore } from "../lib/store";

// Mock the Apollo client
const mockMutate = vi.fn();
vi.mock("../lib/apolloClient", () => ({
  remoteClient: {
    mutate: (...args: unknown[]) => mockMutate(...args),
    resetStore: vi.fn(() => Promise.resolve()),
  },
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      isAuthenticated: false,
      token: null,
      username: null,
    });
  });

  it("should start unauthenticated", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("should login successfully", async () => {
    mockMutate.mockResolvedValue({
      data: {
        getAuthToken: {
          accessToken: "real-jwt-token",
          tokenType: "bearer",
        },
      },
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login("user", "pass");
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.username).toBe("user");
    expect(useAuthStore.getState().token).toBe("real-jwt-token");
    expect(useAuthStore.getState().username).toBe("user");
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it("should throw on failed login", async () => {
    mockMutate.mockResolvedValue({ data: null });

    const { result } = renderHook(() => useAuth());

    await expect(
      act(async () => {
        await result.current.login("user", "wrong");
      }),
    ).rejects.toThrow("Login failed: no token returned");
  });

  it("should logout and clear state", async () => {
    // First login
    useAuthStore.getState().login("test-token", "testuser");

    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("should signUp successfully", async () => {
    mockMutate.mockResolvedValue({
      data: {
        signUp: {
          accessToken: "new-user-token",
          tokenType: "bearer",
        },
      },
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@user.com", "password123");
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.username).toBe("new@user.com");
    expect(useAuthStore.getState().token).toBe("new-user-token");
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it("should throw on failed signUp", async () => {
    mockMutate.mockResolvedValue({ data: null });

    const { result } = renderHook(() => useAuth());

    await expect(
      act(async () => {
        await result.current.signUp("new@user.com", "password123");
      }),
    ).rejects.toThrow("Sign up failed: no token returned");
  });

  it("should oAuthLogin successfully", async () => {
    // Mock window.open to return a fake popup
    const mockPopup = { closed: false, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);

    mockMutate.mockResolvedValue({
      data: {
        signInWithOauth: {
          accessToken: "oauth-token",
          tokenType: "bearer",
        },
      },
    });

    const { result } = renderHook(() => useAuth());

    // Start the oAuthLogin, then simulate the popup callback
    const loginPromise = act(async () => {
      const promise = result.current.oAuthLogin("google");
      // Simulate the OAuth callback message from the popup
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          data: { type: "oauth_callback", code: "auth-code-123" },
        }),
      );
      await promise;
    });

    await loginPromise;

    expect(result.current.isAuthenticated).toBe(true);
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          redirectUri: `${window.location.origin}/oauth/callback/index.html`,
        }),
      }),
    );
  });

  it("should throw when OAuth popup fails to open", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);

    const { result } = renderHook(() => useAuth());

    await expect(
      act(async () => {
        await result.current.oAuthLogin("github");
      }),
    ).rejects.toThrow("Failed to open popup window");
  });
});

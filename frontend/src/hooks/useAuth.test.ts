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
    useAuthStore.setState({ isAuthenticated: false, token: null, username: null });
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
});

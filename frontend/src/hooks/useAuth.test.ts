/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "./useAuth";
import { useAuthStore } from "../lib/store";

// Mock the Apollo client
vi.mock("../lib/apolloClient", () => ({
  remoteClient: {
    resetStore: vi.fn(() => Promise.resolve()),
  },
}));

describe("useAuth", () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: false, token: null });
  });

  it("should start unauthenticated", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("should login successfully", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login("user", "pass");
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(useAuthStore.getState().token).toBeTruthy();
  });

  it("should logout and clear state", async () => {
    // First login
    useAuthStore.getState().login("test-token");

    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });
});

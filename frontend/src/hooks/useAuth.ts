import { useCallback } from "react";
import { useAuthStore } from "../lib/store";
import { remoteClient } from "../lib/apolloClient";

/**
 * Hook for authentication operations.
 *
 * Wraps the remote server's getAuthToken mutation and manages
 * the Zustand auth store + localStorage persistence.
 */
export function useAuth() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const storeLogin = useAuthStore((state) => state.login);
  const storeLogout = useAuthStore((state) => state.logout);

  const login = useCallback(
    async (username: string, password: string) => {
      // TODO: Replace mock with real getAuthToken mutation
      void username;
      void password;
      const mockToken = `mock-token-${Date.now()}`;
      storeLogin(mockToken);
    },
    [storeLogin],
  );

  const logout = useCallback(() => {
    storeLogout();
    void remoteClient.resetStore();
  }, [storeLogout]);

  return { login, logout, isAuthenticated };
}

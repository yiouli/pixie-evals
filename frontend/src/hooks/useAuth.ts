import { useCallback } from "react";
import { useAuthStore } from "../lib/store";
import { remoteClient } from "../lib/apolloClient";
import { GET_AUTH_TOKEN } from "../graphql/remote/mutation";

/**
 * Hook for authentication operations.
 *
 * Wraps the remote server's getAuthToken mutation and manages
 * the Zustand auth store + localStorage persistence.
 */
export function useAuth() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const username = useAuthStore((state) => state.username);
  const storeLogin = useAuthStore((state) => state.login);
  const storeLogout = useAuthStore((state) => state.logout);

  const login = useCallback(
    async (username: string, password: string) => {
      const { data } = await remoteClient.mutate({
        mutation: GET_AUTH_TOKEN,
        variables: { username, password },
      });
      if (!data?.getAuthToken.accessToken) {
        throw new Error("Login failed: no token returned");
      }
      storeLogin(data.getAuthToken.accessToken, username);
    },
    [storeLogin],
  );

  const logout = useCallback(() => {
    storeLogout();
    void remoteClient.resetStore();
  }, [storeLogout]);

  return { login, logout, isAuthenticated, username };
}

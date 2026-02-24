/**
 * Hook for authentication operations.
 *
 * Wraps the remote server's getAuthToken mutation and
 * manages the auth store state.
 */
export function useAuth() {
  // TODO: Implement login/logout with Apollo mutation + Zustand store
  return {
    login: async (_username: string, _password: string) => {
      throw new Error("Not implemented");
    },
    logout: () => {
      throw new Error("Not implemented");
    },
    isAuthenticated: false,
    username: null as string | null,
  };
}

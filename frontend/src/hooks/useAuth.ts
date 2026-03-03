import { useCallback } from "react";
import { useAuthStore } from "../lib/store";
import { remoteClient } from "../lib/apolloClient";
import {
  GET_AUTH_TOKEN,
  SIGN_UP,
  SIGN_IN_WITH_OAUTH,
} from "../graphql/remote/mutation";
import { GOOGLE_CLIENT_ID, GITHUB_CLIENT_ID } from "../lib/env";

/** Supported OAuth providers. */
export type OAuthProvider = "google" | "github";

const OAUTH_CALLBACK_PATH = "/oauth/callback/index.html";

/**
 * Hook for authentication operations.
 *
 * Wraps the remote server's auth mutations (sign-in, sign-up, OAuth)
 * and manages the Zustand auth store + localStorage persistence.
 */
export function useAuth() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const username = useAuthStore((state) => state.username);
  const storeLogin = useAuthStore((state) => state.login);
  const storeLogout = useAuthStore((state) => state.logout);

  /** Sign in with email (used as username) and password. */
  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await remoteClient.mutate({
        mutation: GET_AUTH_TOKEN,
        variables: { username: email, password },
      });
      if (!data?.getAuthToken.accessToken) {
        throw new Error("Login failed: no token returned");
      }
      storeLogin(data.getAuthToken.accessToken, email);
    },
    [storeLogin],
  );

  /** Register a new account with email and password, then auto sign-in. */
  const signUp = useCallback(
    async (email: string, password: string) => {
      const { data } = await remoteClient.mutate({
        mutation: SIGN_UP,
        variables: { email, password },
      });
      if (!data?.signUp.accessToken) {
        throw new Error("Sign up failed: no token returned");
      }
      storeLogin(data.signUp.accessToken, email);
    },
    [storeLogin],
  );

  /**
   * Initiate OAuth sign-in by opening the provider's consent screen.
   *
   * Opens a popup window for the OAuth flow.  On success the popup
   * posts the authorization code back to this window, which then
   * exchanges it via the backend `signInWithOauth` mutation.
   */
  const oAuthLogin = useCallback(
    async (provider: OAuthProvider) => {
      const code = await openOAuthPopup(provider);
      const redirectUri = `${window.location.origin}${OAUTH_CALLBACK_PATH}`;
      const { data } = await remoteClient.mutate({
        mutation: SIGN_IN_WITH_OAUTH,
        variables: { provider, code, redirectUri },
      });
      if (!data?.signInWithOauth.accessToken) {
        throw new Error("OAuth login failed: no token returned");
      }
      // The username stored is the provider name since we don't decode
      // the JWT client-side. It will be replaced by the actual email
      // once the user context is fetched.
      storeLogin(data.signInWithOauth.accessToken, provider);
    },
    [storeLogin],
  );

  const logout = useCallback(() => {
    storeLogout();
    void remoteClient.resetStore();
  }, [storeLogout]);

  return { login, signUp, oAuthLogin, logout, isAuthenticated, username };
}

/**
 * Opens a popup window for OAuth consent and returns the auth code.
 *
 * The popup navigates to the provider's authorization URL.  After
 * consent, the provider redirects to our `/oauth/callback` page which
 * extracts the `code` query param and posts it back via `postMessage`.
 */
function openOAuthPopup(provider: OAuthProvider): Promise<string> {
  const redirectUri = `${window.location.origin}${OAUTH_CALLBACK_PATH}`;
  let authUrl: string;

  if (provider === "google") {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
    });
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  } else {
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: "user:email",
    });
    authUrl = `https://github.com/login/oauth/authorize?${params}`;
  }

  return new Promise<string>((resolve, reject) => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      authUrl,
      "oauth_popup",
      `width=${width},height=${height},left=${left},top=${top}`,
    );

    if (!popup) {
      reject(new Error("Failed to open popup window"));
      return;
    }

    let settled = false;
    let timeoutId: number | undefined;

    const handleFocus = () => {
      let isClosed = false;
      try {
        isClosed = popup.closed;
      } catch {
        return;
      }

      if (isClosed) {
        settle(() => reject(new Error("OAuth popup was closed")));
      }
    };

    const cleanup = () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("focus", handleFocus);
      if (typeof timeoutId === "number") {
        window.clearTimeout(timeoutId);
      }
    };

    const settle = (action: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      action();
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "oauth_callback" && event.data.code) {
        settle(() => resolve(event.data.code as string));
      } else if (event.data?.type === "oauth_error") {
        settle(() => reject(new Error(event.data.error ?? "OAuth failed")));
      }
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("focus", handleFocus);
    timeoutId = window.setTimeout(() => {
      settle(() => reject(new Error("OAuth flow timed out")));
    }, 180000);
  });
}

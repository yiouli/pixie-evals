/// <reference types="vite/client" />

/**
 * Environment configuration.
 *
 * All server URLs are configurable via Vite environment variables
 * with sensible localhost defaults for development.
 */

/** Remote pixie-server GraphQL endpoint. */
export const REMOTE_SERVER_URL =
  import.meta.env.VITE_REMOTE_SERVER_URL ?? "http://localhost:8000/graphql";

/** Local SDK server GraphQL HTTP endpoint. */
export const SDK_SERVER_URL =
  import.meta.env.VITE_SDK_SERVER_URL ?? "http://localhost:8100/graphql";

/** Local SDK server GraphQL WebSocket endpoint. */
export const SDK_SERVER_WS_URL =
  import.meta.env.VITE_SDK_SERVER_WS_URL ?? "ws://localhost:8100/graphql";

/** Local SDK server base URL (for labeling UI iframes, etc.). */
export const SDK_BASE_URL =
  import.meta.env.VITE_SDK_BASE_URL ?? "http://localhost:8100";

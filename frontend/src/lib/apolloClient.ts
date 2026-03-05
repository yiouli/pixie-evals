import { ApolloClient, InMemoryCache, HttpLink, split } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";
import { useAuthStore } from "./store";
import {
  REMOTE_SERVER_URL,
  REMOTE_SERVER_WS_URL,
  SDK_SERVER_URL,
  SDK_SERVER_WS_URL,
} from "./env";

// Auth middleware — attaches JWT to every remote-server request.
// Uses the recommended setContext helper to properly merge headers.
const authLink = setContext((_, { headers }) => {
  const token = useAuthStore.getState().token;
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

// Error middleware — logs out automatically when the server reports
// an authentication error (expired or invalid token).
const authErrorLink = onError(({ graphQLErrors }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (
        err.message === "Authentication required" ||
        (err.extensions?.["code"] as string | undefined) === "UNAUTHENTICATED"
      ) {
        useAuthStore.getState().logout();
        break;
      }
    }
  }
});

// Remote pixie-server client (with auth + auto-logout on expiry + WS for subscriptions)
const remoteHttpLink = new HttpLink({
  uri: REMOTE_SERVER_URL,
});

const remoteWsLink = new GraphQLWsLink(
  createClient({
    url: REMOTE_SERVER_WS_URL,
    connectionParams: () => {
      const token = useAuthStore.getState().token;
      return token ? { authorization: `Bearer ${token}` } : {};
    },
  }),
);

const remoteLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  remoteWsLink,
  authErrorLink.concat(authLink).concat(remoteHttpLink),
);

export const remoteClient = new ApolloClient({
  link: remoteLink,
  cache: new InMemoryCache(),
});

// SDK local server client (with WebSocket support for subscriptions)
// Auth middleware — forwards the JWT from the remote-server auth to the SDK
// server so it can proxy authenticated requests to the remote server.
const sdkAuthLink = setContext((_, { headers }) => {
  const token = useAuthStore.getState().token;
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

const sdkHttpLink = new HttpLink({
  uri: SDK_SERVER_URL,
});

const sdkWsLink = new GraphQLWsLink(
  createClient({
    url: SDK_SERVER_WS_URL,
    // Pass the auth token as a connection param so the SDK server can forward
    // it to the remote pixie-server for authenticated proxy calls.
    // The function is evaluated on every (re)connect to always use the latest token.
    connectionParams: () => {
      const token = useAuthStore.getState().token;
      return token ? { authorization: `Bearer ${token}` } : {};
    },
  }),
);

const sdkLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  sdkWsLink,
  sdkAuthLink.concat(sdkHttpLink),
);

export const sdkClient = new ApolloClient({
  link: sdkLink,
  cache: new InMemoryCache(),
});

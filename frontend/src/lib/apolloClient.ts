import { ApolloClient, InMemoryCache, HttpLink, split } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";
import { useAuthStore } from "./store";
import { REMOTE_SERVER_URL, SDK_SERVER_URL, SDK_SERVER_WS_URL } from "./env";

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

// Remote pixie-server client (with auth + auto-logout on expiry)
const remoteHttpLink = new HttpLink({
  uri: REMOTE_SERVER_URL,
});

export const remoteClient = new ApolloClient({
  link: authErrorLink.concat(authLink).concat(remoteHttpLink),
  cache: new InMemoryCache(),
});

// SDK local server client (with WebSocket support for subscriptions)
const sdkHttpLink = new HttpLink({
  uri: SDK_SERVER_URL,
});

const sdkWsLink = new GraphQLWsLink(
  createClient({
    url: SDK_SERVER_WS_URL,
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
  sdkHttpLink,
);

export const sdkClient = new ApolloClient({
  link: sdkLink,
  cache: new InMemoryCache(),
});

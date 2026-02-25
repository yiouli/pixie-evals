import { ApolloClient, InMemoryCache, HttpLink, split, ApolloLink } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";
import { useAuthStore } from "./store";
import { REMOTE_SERVER_URL, SDK_SERVER_URL, SDK_SERVER_WS_URL } from "./env";

// Auth middleware — attaches JWT to every remote-server request
const authLink = new ApolloLink((operation, forward) => {
  const token = useAuthStore.getState().token;
  if (token) {
    operation.setContext({
      headers: { authorization: `Bearer ${token}` },
    });
  }
  return forward(operation);
});

// Remote pixie-server client (with auth)
const remoteHttpLink = new HttpLink({
  uri: REMOTE_SERVER_URL,
});

export const remoteClient = new ApolloClient({
  link: authLink.concat(remoteHttpLink),
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

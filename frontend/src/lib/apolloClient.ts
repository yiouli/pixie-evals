import { ApolloClient, InMemoryCache, HttpLink, split } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";

// Remote pixie-server client
const remoteHttpLink = new HttpLink({
  uri: "http://localhost:8000/graphql",
});

export const remoteClient = new ApolloClient({
  link: remoteHttpLink,
  cache: new InMemoryCache(),
});

// SDK local server client (with WebSocket support for subscriptions)
const sdkHttpLink = new HttpLink({
  uri: "http://localhost:8100/graphql",
});

const sdkWsLink = new GraphQLWsLink(
  createClient({
    url: "ws://localhost:8100/graphql",
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

import { graphql } from "../../generated/remote/gql";

export const GET_AUTH_TOKEN = graphql(`
  mutation GetAuthToken($username: String!, $password: String!) {
    getAuthToken(username: $username, password: $password) {
      accessToken
      tokenType
    }
  }
`);

import { graphql } from "../../generated/remote/gql";

export const GET_AUTH_TOKEN = graphql(`
  mutation GetAuthToken($username: String!, $password: String!) {
    getAuthToken(username: $username, password: $password) {
      accessToken
      tokenType
    }
  }
`);

export const SIGN_UP = graphql(`
  mutation SignUp($email: String!, $password: String!) {
    signUp(email: $email, password: $password) {
      accessToken
      tokenType
    }
  }
`);

export const SIGN_IN_WITH_OAUTH = graphql(`
  mutation SignInWithOauth(
    $provider: String!
    $code: String!
    $redirectUri: String!
  ) {
    signInWithOauth(
      provider: $provider
      code: $code
      redirectUri: $redirectUri
    ) {
      accessToken
      tokenType
    }
  }
`);

export const CREATE_METRIC = graphql(`
  mutation CreateMetric(
    $name: String!
    $config: MetricConfigInput!
    $description: String
  ) {
    createMetric(name: $name, config: $config, description: $description)
  }
`);

export const CREATE_TEST_SUITE = graphql(`
  mutation CreateTestSuite(
    $name: String!
    $metricIds: [UUID!]!
    $config: TestSuiteConfigInput!
    $description: String
  ) {
    createTestSuite(
      name: $name
      metricIds: $metricIds
      config: $config
      description: $description
    )
  }
`);

export const LABEL_TEST_CASES = graphql(`
  mutation LabelTestCases($testSuiteId: UUID!, $labels: [LabelDetailsInput!]!) {
    labelTestCases(testSuiteId: $testSuiteId, labels: $labels)
  }
`);

export const REMOVE_TEST_CASES = graphql(`
  mutation RemoveTestCases($testSuiteId: UUID!, $testCaseIds: [UUID!]!) {
    removeTestCases(testSuiteId: $testSuiteId, testCaseIds: $testCaseIds)
  }
`);

export const SKIP_LABELING = graphql(`
  mutation SkipLabeling($testSuiteId: UUID!, $testCaseId: UUID!) {
    skipLabeling(testSuiteId: $testSuiteId, testCaseId: $testCaseId)
  }
`);

export const CREATE_DATA_ADAPTOR = graphql(`
  mutation CreateDataAdaptor(
    $name: String!
    $testSuiteId: UUID!
    $config: DataAdaptorConfigInput!
    $description: String
  ) {
    createDataAdaptor(
      name: $name
      testSuiteId: $testSuiteId
      config: $config
      description: $description
    )
  }
`);

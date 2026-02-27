import { graphql } from "../../generated/remote/gql";

export const LIST_METRICS = graphql(`
  query ListMetrics {
    listMetrics {
      id
      name
      description
      config
      account
    }
  }
`);

export const LIST_TEST_SUITES = graphql(`
  query ListTestSuites {
    listTestSuites {
      id
      name
      description
      account
      creator
      labelingUiTemplate
      config
    }
  }
`);

export const LIST_TEST_CASE_IDS = graphql(`
  query ListTestCaseIds($filters: TestCaseFiltersInput) {
    listTestCaseIds(filters: $filters)
  }
`);

export const GET_TEST_CASES_WITH_LABEL = graphql(`
  query GetTestCasesWithLabel($ids: [UUID!]!) {
    getTestCasesWithLabel(ids: $ids) {
      testCase {
        id
        description
        embedding
        dataAdaptor
        testSuite
        createdAt
      }
      label {
        id
        metric
        testCase
        value
        labeledAt
        labeler
        notes
        metadata
      }
    }
  }
`);

export const GET_LABELING_CANDIDATES = graphql(`
  query GetLabelingCandidates($testSuiteId: UUID!, $count: Int) {
    getLabelingCandidates(testSuiteId: $testSuiteId, count: $count)
  }
`);

export const GET_TEST_SUITE_METRICS = graphql(`
  query GetTestSuiteMetrics($testSuiteId: UUID!) {
    getTestSuiteMetrics(testSuiteId: $testSuiteId) {
      id
      name
      description
      config
      account
    }
  }
`);

export const LIST_EVALUATORS = graphql(`
  query ListEvaluators($testSuiteId: UUID!) {
    listEvaluators(testSuiteId: $testSuiteId) {
      id
      name
      description
      testSuite
      storagePath
      updatedAt
    }
  }
`);

export const GET_EVALUATOR_WITH_SIGNATURE = graphql(`
  query GetEvaluatorWithSignature($testSuiteId: UUID!) {
    getEvaluatorWithSignature(testSuiteId: $testSuiteId) {
      inputSchema
      outputSchema
      savedProgram
    }
  }
`);

export const LIST_DATA_ADAPTORS = graphql(`
  query ListDataAdaptors($testSuiteId: UUID!) {
    listDataAdaptors(testSuiteId: $testSuiteId) {
      id
      name
      description
      config
      testSuite
    }
  }
`);

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

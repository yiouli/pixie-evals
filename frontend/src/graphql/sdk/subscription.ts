import { graphql } from "../../generated/sdk/gql";

export const CREATE_TEST_SUITE_PROGRESS = graphql(`
  subscription CreateTestSuiteProgress($datasetId: UUID!, $input: TestSuiteCreateInput!) {
    createTestSuiteProgress(datasetId: $datasetId, input: $input) {
      status
      message
      progress
      testSuiteId
    }
  }
`);

export const EVALUATE_DATASET = graphql(`
  subscription EvaluateDataset($datasetId: UUID!) {
    evaluateDataset(datasetId: $datasetId) {
      status
      message
      progress
      total
      completed
      results {
        entryId
        output
        error
      }
    }
  }
`);

export const OPTIMIZE_EVALUATOR = graphql(`
  subscription OptimizeEvaluator($testSuiteId: UUID!) {
    optimizeEvaluator(testSuiteId: $testSuiteId) {
      status
      message
      progress
      evaluatorId
    }
  }
`);

export const IMPORT_TEST_CASES_PROGRESS = graphql(`
  subscription ImportTestCasesProgress($datasetId: UUID!, $testSuiteId: UUID!) {
    importTestCasesProgress(datasetId: $datasetId, testSuiteId: $testSuiteId) {
      status
      message
      progress
      testSuiteId
    }
  }
`);

import { graphql } from "../../generated/sdk/gql";

export const UPLOAD_FILE = graphql(`
  mutation UploadFile($file: Upload!) {
    uploadFile(file: $file) {
      id
      fileName
      createdAt
      rowSchema
    }
  }
`);

export const LINK_DATASET_TO_TEST_SUITE = graphql(`
  mutation LinkDatasetToTestSuite($datasetId: UUID!, $testSuiteId: UUID!) {
    linkDatasetToTestSuite(datasetId: $datasetId, testSuiteId: $testSuiteId)
  }
`);

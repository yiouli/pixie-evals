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

export const CREATE_DATASET = graphql(`
  mutation CreateDataset(
    $name: String!
    $rowSchema: JSON!
    $testSuiteId: UUID
    $description: String
  ) {
    createDataset(
      name: $name
      rowSchema: $rowSchema
      testSuiteId: $testSuiteId
      description: $description
    ) {
      id
      fileName
      createdAt
      rowSchema
      testSuiteId
    }
  }
`);

export const ADD_DATA_ENTRY = graphql(`
  mutation AddDataEntry($datasetId: UUID!, $data: JSON!) {
    addDataEntry(datasetId: $datasetId, data: $data) {
      id
      datasetId
      data
    }
  }
`);

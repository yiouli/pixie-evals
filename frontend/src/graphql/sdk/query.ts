import { graphql } from "../../generated/sdk/gql";

export const LIST_DATASETS = graphql(`
  query ListDatasets {
    listDatasets {
      id
      fileName
      createdAt
      rowSchema
      testSuiteId
    }
  }
`);

export const GET_DATASET = graphql(`
  query GetDataset($id: UUID!) {
    getDataset(id: $id) {
      id
      fileName
      createdAt
      rowSchema
      testSuiteId
    }
  }
`);

export const GET_DATA_ENTRIES = graphql(`
  query GetDataEntries($datasetId: UUID!, $offset: Int, $limit: Int) {
    getDataEntries(datasetId: $datasetId, offset: $offset, limit: $limit) {
      id
      datasetId
      data
    }
  }
`);

export const GET_LABELING_HTML = graphql(`
  query GetLabelingHtml($testCaseId: UUID!) {
    getLabelingHtml(testCaseId: $testCaseId)
  }
`);

export const LIST_LABELING_COMPONENTS = graphql(`
  query ListLabelingComponents {
    listLabelingComponents
  }
`);

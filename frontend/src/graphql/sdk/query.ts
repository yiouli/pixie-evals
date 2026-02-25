import { graphql } from "../../generated/sdk/gql";

export const LIST_DATASETS = graphql(`
  query ListDatasets {
    listDatasets {
      id
      fileName
      createdAt
      rowSchema
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

import { graphql } from "../../generated/remote/gql";

export const GENERATE_DATASET = graphql(`
  subscription GenerateDataset(
    $testSuiteId: UUID!
    $size: Int!
    $description: String!
  ) {
    generateDataset(
      testSuiteId: $testSuiteId
      size: $size
      description: $description
    ) {
      status
      message
      progress
      plan
      generatedEntry
      sessionId
      total
      completed
    }
  }
`);

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

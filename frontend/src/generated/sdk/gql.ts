/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  mutation UploadFile($file: Upload!) {\n    uploadFile(file: $file) {\n      id\n      fileName\n      createdAt\n      rowSchema\n    }\n  }\n": typeof types.UploadFileDocument,
    "\n  mutation LinkDatasetToTestSuite($datasetId: UUID!, $testSuiteId: UUID!) {\n    linkDatasetToTestSuite(datasetId: $datasetId, testSuiteId: $testSuiteId)\n  }\n": typeof types.LinkDatasetToTestSuiteDocument,
    "\n  query ListDatasets {\n    listDatasets {\n      id\n      fileName\n      createdAt\n      rowSchema\n      testSuiteId\n    }\n  }\n": typeof types.ListDatasetsDocument,
    "\n  query GetDataset($id: UUID!) {\n    getDataset(id: $id) {\n      id\n      fileName\n      createdAt\n      rowSchema\n      testSuiteId\n    }\n  }\n": typeof types.GetDatasetDocument,
    "\n  query GetDataEntries($datasetId: UUID!, $offset: Int, $limit: Int) {\n    getDataEntries(datasetId: $datasetId, offset: $offset, limit: $limit) {\n      id\n      datasetId\n      data\n    }\n  }\n": typeof types.GetDataEntriesDocument,
    "\n  query GetLabelingHtml($testCaseId: UUID!) {\n    getLabelingHtml(testCaseId: $testCaseId)\n  }\n": typeof types.GetLabelingHtmlDocument,
    "\n  query ListLabelingComponents {\n    listLabelingComponents\n  }\n": typeof types.ListLabelingComponentsDocument,
    "\n  subscription CreateTestSuiteProgress($datasetId: UUID!, $input: TestSuiteCreateInput!) {\n    createTestSuiteProgress(datasetId: $datasetId, input: $input) {\n      status\n      message\n      progress\n      testSuiteId\n    }\n  }\n": typeof types.CreateTestSuiteProgressDocument,
    "\n  subscription EvaluateDataset($datasetId: UUID!) {\n    evaluateDataset(datasetId: $datasetId) {\n      status\n      message\n      progress\n      total\n      completed\n      results {\n        entryId\n        output\n        error\n      }\n    }\n  }\n": typeof types.EvaluateDatasetDocument,
    "\n  subscription OptimizeEvaluator($testSuiteId: UUID!) {\n    optimizeEvaluator(testSuiteId: $testSuiteId) {\n      status\n      message\n      progress\n      evaluatorId\n    }\n  }\n": typeof types.OptimizeEvaluatorDocument,
    "\n  subscription ImportTestCasesProgress($datasetId: UUID!, $testSuiteId: UUID!) {\n    importTestCasesProgress(datasetId: $datasetId, testSuiteId: $testSuiteId) {\n      status\n      message\n      progress\n      testSuiteId\n    }\n  }\n": typeof types.ImportTestCasesProgressDocument,
};
const documents: Documents = {
    "\n  mutation UploadFile($file: Upload!) {\n    uploadFile(file: $file) {\n      id\n      fileName\n      createdAt\n      rowSchema\n    }\n  }\n": types.UploadFileDocument,
    "\n  mutation LinkDatasetToTestSuite($datasetId: UUID!, $testSuiteId: UUID!) {\n    linkDatasetToTestSuite(datasetId: $datasetId, testSuiteId: $testSuiteId)\n  }\n": types.LinkDatasetToTestSuiteDocument,
    "\n  query ListDatasets {\n    listDatasets {\n      id\n      fileName\n      createdAt\n      rowSchema\n      testSuiteId\n    }\n  }\n": types.ListDatasetsDocument,
    "\n  query GetDataset($id: UUID!) {\n    getDataset(id: $id) {\n      id\n      fileName\n      createdAt\n      rowSchema\n      testSuiteId\n    }\n  }\n": types.GetDatasetDocument,
    "\n  query GetDataEntries($datasetId: UUID!, $offset: Int, $limit: Int) {\n    getDataEntries(datasetId: $datasetId, offset: $offset, limit: $limit) {\n      id\n      datasetId\n      data\n    }\n  }\n": types.GetDataEntriesDocument,
    "\n  query GetLabelingHtml($testCaseId: UUID!) {\n    getLabelingHtml(testCaseId: $testCaseId)\n  }\n": types.GetLabelingHtmlDocument,
    "\n  query ListLabelingComponents {\n    listLabelingComponents\n  }\n": types.ListLabelingComponentsDocument,
    "\n  subscription CreateTestSuiteProgress($datasetId: UUID!, $input: TestSuiteCreateInput!) {\n    createTestSuiteProgress(datasetId: $datasetId, input: $input) {\n      status\n      message\n      progress\n      testSuiteId\n    }\n  }\n": types.CreateTestSuiteProgressDocument,
    "\n  subscription EvaluateDataset($datasetId: UUID!) {\n    evaluateDataset(datasetId: $datasetId) {\n      status\n      message\n      progress\n      total\n      completed\n      results {\n        entryId\n        output\n        error\n      }\n    }\n  }\n": types.EvaluateDatasetDocument,
    "\n  subscription OptimizeEvaluator($testSuiteId: UUID!) {\n    optimizeEvaluator(testSuiteId: $testSuiteId) {\n      status\n      message\n      progress\n      evaluatorId\n    }\n  }\n": types.OptimizeEvaluatorDocument,
    "\n  subscription ImportTestCasesProgress($datasetId: UUID!, $testSuiteId: UUID!) {\n    importTestCasesProgress(datasetId: $datasetId, testSuiteId: $testSuiteId) {\n      status\n      message\n      progress\n      testSuiteId\n    }\n  }\n": types.ImportTestCasesProgressDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UploadFile($file: Upload!) {\n    uploadFile(file: $file) {\n      id\n      fileName\n      createdAt\n      rowSchema\n    }\n  }\n"): (typeof documents)["\n  mutation UploadFile($file: Upload!) {\n    uploadFile(file: $file) {\n      id\n      fileName\n      createdAt\n      rowSchema\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation LinkDatasetToTestSuite($datasetId: UUID!, $testSuiteId: UUID!) {\n    linkDatasetToTestSuite(datasetId: $datasetId, testSuiteId: $testSuiteId)\n  }\n"): (typeof documents)["\n  mutation LinkDatasetToTestSuite($datasetId: UUID!, $testSuiteId: UUID!) {\n    linkDatasetToTestSuite(datasetId: $datasetId, testSuiteId: $testSuiteId)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ListDatasets {\n    listDatasets {\n      id\n      fileName\n      createdAt\n      rowSchema\n      testSuiteId\n    }\n  }\n"): (typeof documents)["\n  query ListDatasets {\n    listDatasets {\n      id\n      fileName\n      createdAt\n      rowSchema\n      testSuiteId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetDataset($id: UUID!) {\n    getDataset(id: $id) {\n      id\n      fileName\n      createdAt\n      rowSchema\n      testSuiteId\n    }\n  }\n"): (typeof documents)["\n  query GetDataset($id: UUID!) {\n    getDataset(id: $id) {\n      id\n      fileName\n      createdAt\n      rowSchema\n      testSuiteId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetDataEntries($datasetId: UUID!, $offset: Int, $limit: Int) {\n    getDataEntries(datasetId: $datasetId, offset: $offset, limit: $limit) {\n      id\n      datasetId\n      data\n    }\n  }\n"): (typeof documents)["\n  query GetDataEntries($datasetId: UUID!, $offset: Int, $limit: Int) {\n    getDataEntries(datasetId: $datasetId, offset: $offset, limit: $limit) {\n      id\n      datasetId\n      data\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetLabelingHtml($testCaseId: UUID!) {\n    getLabelingHtml(testCaseId: $testCaseId)\n  }\n"): (typeof documents)["\n  query GetLabelingHtml($testCaseId: UUID!) {\n    getLabelingHtml(testCaseId: $testCaseId)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ListLabelingComponents {\n    listLabelingComponents\n  }\n"): (typeof documents)["\n  query ListLabelingComponents {\n    listLabelingComponents\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription CreateTestSuiteProgress($datasetId: UUID!, $input: TestSuiteCreateInput!) {\n    createTestSuiteProgress(datasetId: $datasetId, input: $input) {\n      status\n      message\n      progress\n      testSuiteId\n    }\n  }\n"): (typeof documents)["\n  subscription CreateTestSuiteProgress($datasetId: UUID!, $input: TestSuiteCreateInput!) {\n    createTestSuiteProgress(datasetId: $datasetId, input: $input) {\n      status\n      message\n      progress\n      testSuiteId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription EvaluateDataset($datasetId: UUID!) {\n    evaluateDataset(datasetId: $datasetId) {\n      status\n      message\n      progress\n      total\n      completed\n      results {\n        entryId\n        output\n        error\n      }\n    }\n  }\n"): (typeof documents)["\n  subscription EvaluateDataset($datasetId: UUID!) {\n    evaluateDataset(datasetId: $datasetId) {\n      status\n      message\n      progress\n      total\n      completed\n      results {\n        entryId\n        output\n        error\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription OptimizeEvaluator($testSuiteId: UUID!) {\n    optimizeEvaluator(testSuiteId: $testSuiteId) {\n      status\n      message\n      progress\n      evaluatorId\n    }\n  }\n"): (typeof documents)["\n  subscription OptimizeEvaluator($testSuiteId: UUID!) {\n    optimizeEvaluator(testSuiteId: $testSuiteId) {\n      status\n      message\n      progress\n      evaluatorId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription ImportTestCasesProgress($datasetId: UUID!, $testSuiteId: UUID!) {\n    importTestCasesProgress(datasetId: $datasetId, testSuiteId: $testSuiteId) {\n      status\n      message\n      progress\n      testSuiteId\n    }\n  }\n"): (typeof documents)["\n  subscription ImportTestCasesProgress($datasetId: UUID!, $testSuiteId: UUID!) {\n    importTestCasesProgress(datasetId: $datasetId, testSuiteId: $testSuiteId) {\n      status\n      message\n      progress\n      testSuiteId\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;
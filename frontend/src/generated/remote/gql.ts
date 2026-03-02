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
    "\n  mutation GetAuthToken($username: String!, $password: String!) {\n    getAuthToken(username: $username, password: $password) {\n      accessToken\n      tokenType\n    }\n  }\n": typeof types.GetAuthTokenDocument,
    "\n  mutation CreateMetric($name: String!, $config: MetricConfigInput!, $description: String) {\n    createMetric(name: $name, config: $config, description: $description)\n  }\n": typeof types.CreateMetricDocument,
    "\n  mutation CreateTestSuite($name: String!, $metricIds: [UUID!]!, $config: TestSuiteConfigInput!, $description: String) {\n    createTestSuite(name: $name, metricIds: $metricIds, config: $config, description: $description)\n  }\n": typeof types.CreateTestSuiteDocument,
    "\n  mutation LabelTestCases($testSuiteId: UUID!, $labels: [LabelDetailsInput!]!) {\n    labelTestCases(testSuiteId: $testSuiteId, labels: $labels)\n  }\n": typeof types.LabelTestCasesDocument,
    "\n  mutation RemoveTestCases($testSuiteId: UUID!, $testCaseIds: [UUID!]!) {\n    removeTestCases(testSuiteId: $testSuiteId, testCaseIds: $testCaseIds)\n  }\n": typeof types.RemoveTestCasesDocument,
    "\n  mutation SkipLabeling($testSuiteId: UUID!, $testCaseId: UUID!) {\n    skipLabeling(testSuiteId: $testSuiteId, testCaseId: $testCaseId)\n  }\n": typeof types.SkipLabelingDocument,
    "\n  mutation CreateDataAdaptor(\n    $name: String!\n    $testSuiteId: UUID!\n    $config: DataAdaptorConfigInput!\n    $description: String\n  ) {\n    createDataAdaptor(\n      name: $name\n      testSuiteId: $testSuiteId\n      config: $config\n      description: $description\n    )\n  }\n": typeof types.CreateDataAdaptorDocument,
    "\n  query ListMetrics {\n    listMetrics {\n      id\n      name\n      description\n      config\n      account\n    }\n  }\n": typeof types.ListMetricsDocument,
    "\n  query ListTestSuites {\n    listTestSuites {\n      id\n      name\n      description\n      account\n      creator\n      labelingUiTemplate\n      config\n    }\n  }\n": typeof types.ListTestSuitesDocument,
    "\n  query ListTestCaseIds($filters: TestCaseFiltersInput) {\n    listTestCaseIds(filters: $filters)\n  }\n": typeof types.ListTestCaseIdsDocument,
    "\n  query GetTestCasesWithLabel($ids: [UUID!]!) {\n    getTestCasesWithLabel(ids: $ids) {\n      testCase {\n        id\n        description\n        embedding\n        dataAdaptor\n        testSuite\n        createdAt\n      }\n      label {\n        id\n        metric\n        testCase\n        value\n        labeledAt\n        labeler\n        notes\n        metadata\n      }\n    }\n  }\n": typeof types.GetTestCasesWithLabelDocument,
    "\n  query GetLabelingCandidates($testSuiteId: UUID!, $count: Int) {\n    getLabelingCandidates(testSuiteId: $testSuiteId, count: $count)\n  }\n": typeof types.GetLabelingCandidatesDocument,
    "\n  query GetTestSuiteMetrics($testSuiteId: UUID!) {\n    getTestSuiteMetrics(testSuiteId: $testSuiteId) {\n      id\n      name\n      description\n      config\n      account\n    }\n  }\n": typeof types.GetTestSuiteMetricsDocument,
    "\n  query ListEvaluators($testSuiteId: UUID!) {\n    listEvaluators(testSuiteId: $testSuiteId) {\n      id\n      name\n      description\n      testSuite\n      storagePath\n      updatedAt\n    }\n  }\n": typeof types.ListEvaluatorsDocument,
    "\n  query GetEvaluatorWithSignature($testSuiteId: UUID!) {\n    getEvaluatorWithSignature(testSuiteId: $testSuiteId) {\n      inputSchema\n      outputSchema\n      savedProgram\n    }\n  }\n": typeof types.GetEvaluatorWithSignatureDocument,
    "\n  query GetOptimizationLabelStats($testSuiteId: UUID!) {\n    getOptimizationLabelStats(testSuiteId: $testSuiteId) {\n      beforeCutoff\n      afterCutoff\n      cutoffDate\n    }\n  }\n": typeof types.GetOptimizationLabelStatsDocument,
    "\n  query ListDataAdaptors($testSuiteId: UUID!) {\n    listDataAdaptors(testSuiteId: $testSuiteId) {\n      id\n      name\n      description\n      config\n      testSuite\n    }\n  }\n": typeof types.ListDataAdaptorsDocument,
};
const documents: Documents = {
    "\n  mutation GetAuthToken($username: String!, $password: String!) {\n    getAuthToken(username: $username, password: $password) {\n      accessToken\n      tokenType\n    }\n  }\n": types.GetAuthTokenDocument,
    "\n  mutation CreateMetric($name: String!, $config: MetricConfigInput!, $description: String) {\n    createMetric(name: $name, config: $config, description: $description)\n  }\n": types.CreateMetricDocument,
    "\n  mutation CreateTestSuite($name: String!, $metricIds: [UUID!]!, $config: TestSuiteConfigInput!, $description: String) {\n    createTestSuite(name: $name, metricIds: $metricIds, config: $config, description: $description)\n  }\n": types.CreateTestSuiteDocument,
    "\n  mutation LabelTestCases($testSuiteId: UUID!, $labels: [LabelDetailsInput!]!) {\n    labelTestCases(testSuiteId: $testSuiteId, labels: $labels)\n  }\n": types.LabelTestCasesDocument,
    "\n  mutation RemoveTestCases($testSuiteId: UUID!, $testCaseIds: [UUID!]!) {\n    removeTestCases(testSuiteId: $testSuiteId, testCaseIds: $testCaseIds)\n  }\n": types.RemoveTestCasesDocument,
    "\n  mutation SkipLabeling($testSuiteId: UUID!, $testCaseId: UUID!) {\n    skipLabeling(testSuiteId: $testSuiteId, testCaseId: $testCaseId)\n  }\n": types.SkipLabelingDocument,
    "\n  mutation CreateDataAdaptor(\n    $name: String!\n    $testSuiteId: UUID!\n    $config: DataAdaptorConfigInput!\n    $description: String\n  ) {\n    createDataAdaptor(\n      name: $name\n      testSuiteId: $testSuiteId\n      config: $config\n      description: $description\n    )\n  }\n": types.CreateDataAdaptorDocument,
    "\n  query ListMetrics {\n    listMetrics {\n      id\n      name\n      description\n      config\n      account\n    }\n  }\n": types.ListMetricsDocument,
    "\n  query ListTestSuites {\n    listTestSuites {\n      id\n      name\n      description\n      account\n      creator\n      labelingUiTemplate\n      config\n    }\n  }\n": types.ListTestSuitesDocument,
    "\n  query ListTestCaseIds($filters: TestCaseFiltersInput) {\n    listTestCaseIds(filters: $filters)\n  }\n": types.ListTestCaseIdsDocument,
    "\n  query GetTestCasesWithLabel($ids: [UUID!]!) {\n    getTestCasesWithLabel(ids: $ids) {\n      testCase {\n        id\n        description\n        embedding\n        dataAdaptor\n        testSuite\n        createdAt\n      }\n      label {\n        id\n        metric\n        testCase\n        value\n        labeledAt\n        labeler\n        notes\n        metadata\n      }\n    }\n  }\n": types.GetTestCasesWithLabelDocument,
    "\n  query GetLabelingCandidates($testSuiteId: UUID!, $count: Int) {\n    getLabelingCandidates(testSuiteId: $testSuiteId, count: $count)\n  }\n": types.GetLabelingCandidatesDocument,
    "\n  query GetTestSuiteMetrics($testSuiteId: UUID!) {\n    getTestSuiteMetrics(testSuiteId: $testSuiteId) {\n      id\n      name\n      description\n      config\n      account\n    }\n  }\n": types.GetTestSuiteMetricsDocument,
    "\n  query ListEvaluators($testSuiteId: UUID!) {\n    listEvaluators(testSuiteId: $testSuiteId) {\n      id\n      name\n      description\n      testSuite\n      storagePath\n      updatedAt\n    }\n  }\n": types.ListEvaluatorsDocument,
    "\n  query GetEvaluatorWithSignature($testSuiteId: UUID!) {\n    getEvaluatorWithSignature(testSuiteId: $testSuiteId) {\n      inputSchema\n      outputSchema\n      savedProgram\n    }\n  }\n": types.GetEvaluatorWithSignatureDocument,
    "\n  query GetOptimizationLabelStats($testSuiteId: UUID!) {\n    getOptimizationLabelStats(testSuiteId: $testSuiteId) {\n      beforeCutoff\n      afterCutoff\n      cutoffDate\n    }\n  }\n": types.GetOptimizationLabelStatsDocument,
    "\n  query ListDataAdaptors($testSuiteId: UUID!) {\n    listDataAdaptors(testSuiteId: $testSuiteId) {\n      id\n      name\n      description\n      config\n      testSuite\n    }\n  }\n": types.ListDataAdaptorsDocument,
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
export function graphql(source: "\n  mutation GetAuthToken($username: String!, $password: String!) {\n    getAuthToken(username: $username, password: $password) {\n      accessToken\n      tokenType\n    }\n  }\n"): (typeof documents)["\n  mutation GetAuthToken($username: String!, $password: String!) {\n    getAuthToken(username: $username, password: $password) {\n      accessToken\n      tokenType\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateMetric($name: String!, $config: MetricConfigInput!, $description: String) {\n    createMetric(name: $name, config: $config, description: $description)\n  }\n"): (typeof documents)["\n  mutation CreateMetric($name: String!, $config: MetricConfigInput!, $description: String) {\n    createMetric(name: $name, config: $config, description: $description)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateTestSuite($name: String!, $metricIds: [UUID!]!, $config: TestSuiteConfigInput!, $description: String) {\n    createTestSuite(name: $name, metricIds: $metricIds, config: $config, description: $description)\n  }\n"): (typeof documents)["\n  mutation CreateTestSuite($name: String!, $metricIds: [UUID!]!, $config: TestSuiteConfigInput!, $description: String) {\n    createTestSuite(name: $name, metricIds: $metricIds, config: $config, description: $description)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation LabelTestCases($testSuiteId: UUID!, $labels: [LabelDetailsInput!]!) {\n    labelTestCases(testSuiteId: $testSuiteId, labels: $labels)\n  }\n"): (typeof documents)["\n  mutation LabelTestCases($testSuiteId: UUID!, $labels: [LabelDetailsInput!]!) {\n    labelTestCases(testSuiteId: $testSuiteId, labels: $labels)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveTestCases($testSuiteId: UUID!, $testCaseIds: [UUID!]!) {\n    removeTestCases(testSuiteId: $testSuiteId, testCaseIds: $testCaseIds)\n  }\n"): (typeof documents)["\n  mutation RemoveTestCases($testSuiteId: UUID!, $testCaseIds: [UUID!]!) {\n    removeTestCases(testSuiteId: $testSuiteId, testCaseIds: $testCaseIds)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SkipLabeling($testSuiteId: UUID!, $testCaseId: UUID!) {\n    skipLabeling(testSuiteId: $testSuiteId, testCaseId: $testCaseId)\n  }\n"): (typeof documents)["\n  mutation SkipLabeling($testSuiteId: UUID!, $testCaseId: UUID!) {\n    skipLabeling(testSuiteId: $testSuiteId, testCaseId: $testCaseId)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateDataAdaptor(\n    $name: String!\n    $testSuiteId: UUID!\n    $config: DataAdaptorConfigInput!\n    $description: String\n  ) {\n    createDataAdaptor(\n      name: $name\n      testSuiteId: $testSuiteId\n      config: $config\n      description: $description\n    )\n  }\n"): (typeof documents)["\n  mutation CreateDataAdaptor(\n    $name: String!\n    $testSuiteId: UUID!\n    $config: DataAdaptorConfigInput!\n    $description: String\n  ) {\n    createDataAdaptor(\n      name: $name\n      testSuiteId: $testSuiteId\n      config: $config\n      description: $description\n    )\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ListMetrics {\n    listMetrics {\n      id\n      name\n      description\n      config\n      account\n    }\n  }\n"): (typeof documents)["\n  query ListMetrics {\n    listMetrics {\n      id\n      name\n      description\n      config\n      account\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ListTestSuites {\n    listTestSuites {\n      id\n      name\n      description\n      account\n      creator\n      labelingUiTemplate\n      config\n    }\n  }\n"): (typeof documents)["\n  query ListTestSuites {\n    listTestSuites {\n      id\n      name\n      description\n      account\n      creator\n      labelingUiTemplate\n      config\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ListTestCaseIds($filters: TestCaseFiltersInput) {\n    listTestCaseIds(filters: $filters)\n  }\n"): (typeof documents)["\n  query ListTestCaseIds($filters: TestCaseFiltersInput) {\n    listTestCaseIds(filters: $filters)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetTestCasesWithLabel($ids: [UUID!]!) {\n    getTestCasesWithLabel(ids: $ids) {\n      testCase {\n        id\n        description\n        embedding\n        dataAdaptor\n        testSuite\n        createdAt\n      }\n      label {\n        id\n        metric\n        testCase\n        value\n        labeledAt\n        labeler\n        notes\n        metadata\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetTestCasesWithLabel($ids: [UUID!]!) {\n    getTestCasesWithLabel(ids: $ids) {\n      testCase {\n        id\n        description\n        embedding\n        dataAdaptor\n        testSuite\n        createdAt\n      }\n      label {\n        id\n        metric\n        testCase\n        value\n        labeledAt\n        labeler\n        notes\n        metadata\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetLabelingCandidates($testSuiteId: UUID!, $count: Int) {\n    getLabelingCandidates(testSuiteId: $testSuiteId, count: $count)\n  }\n"): (typeof documents)["\n  query GetLabelingCandidates($testSuiteId: UUID!, $count: Int) {\n    getLabelingCandidates(testSuiteId: $testSuiteId, count: $count)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetTestSuiteMetrics($testSuiteId: UUID!) {\n    getTestSuiteMetrics(testSuiteId: $testSuiteId) {\n      id\n      name\n      description\n      config\n      account\n    }\n  }\n"): (typeof documents)["\n  query GetTestSuiteMetrics($testSuiteId: UUID!) {\n    getTestSuiteMetrics(testSuiteId: $testSuiteId) {\n      id\n      name\n      description\n      config\n      account\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ListEvaluators($testSuiteId: UUID!) {\n    listEvaluators(testSuiteId: $testSuiteId) {\n      id\n      name\n      description\n      testSuite\n      storagePath\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query ListEvaluators($testSuiteId: UUID!) {\n    listEvaluators(testSuiteId: $testSuiteId) {\n      id\n      name\n      description\n      testSuite\n      storagePath\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetEvaluatorWithSignature($testSuiteId: UUID!) {\n    getEvaluatorWithSignature(testSuiteId: $testSuiteId) {\n      inputSchema\n      outputSchema\n      savedProgram\n    }\n  }\n"): (typeof documents)["\n  query GetEvaluatorWithSignature($testSuiteId: UUID!) {\n    getEvaluatorWithSignature(testSuiteId: $testSuiteId) {\n      inputSchema\n      outputSchema\n      savedProgram\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetOptimizationLabelStats($testSuiteId: UUID!) {\n    getOptimizationLabelStats(testSuiteId: $testSuiteId) {\n      beforeCutoff\n      afterCutoff\n      cutoffDate\n    }\n  }\n"): (typeof documents)["\n  query GetOptimizationLabelStats($testSuiteId: UUID!) {\n    getOptimizationLabelStats(testSuiteId: $testSuiteId) {\n      beforeCutoff\n      afterCutoff\n      cutoffDate\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ListDataAdaptors($testSuiteId: UUID!) {\n    listDataAdaptors(testSuiteId: $testSuiteId) {\n      id\n      name\n      description\n      config\n      testSuite\n    }\n  }\n"): (typeof documents)["\n  query ListDataAdaptors($testSuiteId: UUID!) {\n    listDataAdaptors(testSuiteId: $testSuiteId) {\n      id\n      name\n      description\n      config\n      testSuite\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;
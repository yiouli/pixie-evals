/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** Date with time (isoformat) */
  DateTime: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: any; output: any; }
  UUID: { input: any; output: any; }
};

export type AuthTokenType = {
  __typename?: 'AuthTokenType';
  accessToken: Scalars['String']['output'];
  tokenType: Scalars['String']['output'];
};

export type DataAdaptorConfigInput = {
  fields: Scalars['JSON']['input'];
  inputSchema: Scalars['JSON']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
};

export type DataAdaptorType = {
  __typename?: 'DataAdaptorType';
  config: Scalars['JSON']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
  testSuite: Scalars['UUID']['output'];
};

export type EvaluatorType = {
  __typename?: 'EvaluatorType';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
  storagePath: Scalars['String']['output'];
  testSuite: Scalars['UUID']['output'];
  trainingCutoff?: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type EvaluatorWithSignatureType = {
  __typename?: 'EvaluatorWithSignatureType';
  inputSchema: Scalars['JSON']['output'];
  outputSchema: Scalars['JSON']['output'];
  savedProgram?: Maybe<Scalars['JSON']['output']>;
};

export type LabelDetailsInput = {
  labeler?: InputMaybe<Scalars['String']['input']>;
  labels: Array<MetricLabelInputGql>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  testCaseId: Scalars['UUID']['input'];
};

export enum LabelSourcingEnum {
  Correction = 'CORRECTION',
  Manual = 'MANUAL',
  Recommended = 'RECOMMENDED'
}

export type LabelType = {
  __typename?: 'LabelType';
  id: Scalars['UUID']['output'];
  labeledAt: Scalars['DateTime']['output'];
  labeler?: Maybe<Scalars['UUID']['output']>;
  metadata?: Maybe<Scalars['JSON']['output']>;
  metric: Scalars['UUID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  testCase: Scalars['UUID']['output'];
  value: Scalars['JSON']['output'];
};

export enum LabeledByEnum {
  Ai = 'AI',
  User = 'USER'
}

export type LabelingUiTemplateType = {
  __typename?: 'LabelingUiTemplateType';
  account: Scalars['UUID']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
  storagePath: Scalars['String']['output'];
};

export type MetricConfigInput = {
  categories?: InputMaybe<Scalars['JSON']['input']>;
  scaling?: InputMaybe<Scalars['Int']['input']>;
  type: Scalars['String']['input'];
};

export type MetricLabelInputGql = {
  metricId: Scalars['UUID']['input'];
  value: Scalars['JSON']['input'];
};

export type MetricType = {
  __typename?: 'MetricType';
  account: Scalars['UUID']['output'];
  config: Scalars['JSON']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addTestCases: Array<Scalars['UUID']['output']>;
  createDataAdaptor: Scalars['UUID']['output'];
  createEvaluator: Scalars['UUID']['output'];
  createMetric: Scalars['UUID']['output'];
  createTestSuite: Scalars['UUID']['output'];
  getAuthToken: AuthTokenType;
  labelTestCases: Array<Scalars['UUID']['output']>;
  removeTestCases: Array<Scalars['UUID']['output']>;
  signInWithOauth: AuthTokenType;
  signUp: AuthTokenType;
  skipLabeling: Scalars['Boolean']['output'];
};


export type MutationAddTestCasesArgs = {
  dataAdaptorId?: InputMaybe<Scalars['UUID']['input']>;
  testCases: Array<TestCaseWithLabelInput>;
  testSuiteId: Scalars['UUID']['input'];
};


export type MutationCreateDataAdaptorArgs = {
  config: DataAdaptorConfigInput;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  testSuiteId: Scalars['UUID']['input'];
};


export type MutationCreateEvaluatorArgs = {
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  programJson: Scalars['String']['input'];
  testSuiteId: Scalars['UUID']['input'];
  trainingCutoff: Scalars['DateTime']['input'];
};


export type MutationCreateMetricArgs = {
  config: MetricConfigInput;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};


export type MutationCreateTestSuiteArgs = {
  config: TestSuiteConfigInput;
  description?: InputMaybe<Scalars['String']['input']>;
  metricIds: Array<Scalars['UUID']['input']>;
  name: Scalars['String']['input'];
};


export type MutationGetAuthTokenArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationLabelTestCasesArgs = {
  labels: Array<LabelDetailsInput>;
  testSuiteId: Scalars['UUID']['input'];
};


export type MutationRemoveTestCasesArgs = {
  testCaseIds: Array<Scalars['UUID']['input']>;
  testSuiteId: Scalars['UUID']['input'];
};


export type MutationSignInWithOauthArgs = {
  code: Scalars['String']['input'];
  provider: Scalars['String']['input'];
  redirectUri: Scalars['String']['input'];
};


export type MutationSignUpArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationSkipLabelingArgs = {
  testCaseId: Scalars['UUID']['input'];
  testSuiteId: Scalars['UUID']['input'];
};

export type OptimizationLabelStats = {
  __typename?: 'OptimizationLabelStats';
  afterCutoff: Scalars['Int']['output'];
  beforeCutoff: Scalars['Int']['output'];
  cutoffDate?: Maybe<Scalars['DateTime']['output']>;
};

export type Query = {
  __typename?: 'Query';
  getEvaluatorContent?: Maybe<Scalars['String']['output']>;
  getEvaluatorWithSignature?: Maybe<EvaluatorWithSignatureType>;
  getLabelingCandidates: Array<Scalars['UUID']['output']>;
  getLabelingUiTemplateContent?: Maybe<Scalars['String']['output']>;
  getManualLabelsAfterCutoff: Array<TestCaseWithLabelType>;
  getOptimizationLabelStats: OptimizationLabelStats;
  getTestCasesWithLabel: Array<TestCaseWithLabelType>;
  getTestSuiteMetrics: Array<MetricType>;
  listDataAdaptors: Array<DataAdaptorType>;
  listEvaluators: Array<EvaluatorType>;
  listLabelingUiTemplates: Array<LabelingUiTemplateType>;
  listMetrics: Array<MetricType>;
  listTestCaseIds: Array<Scalars['UUID']['output']>;
  listTestSuites: Array<TestSuiteType>;
};


export type QueryGetEvaluatorContentArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryGetEvaluatorWithSignatureArgs = {
  testSuiteId: Scalars['UUID']['input'];
};


export type QueryGetLabelingCandidatesArgs = {
  count?: Scalars['Int']['input'];
  testSuiteId: Scalars['UUID']['input'];
};


export type QueryGetLabelingUiTemplateContentArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryGetManualLabelsAfterCutoffArgs = {
  testSuiteId: Scalars['UUID']['input'];
};


export type QueryGetOptimizationLabelStatsArgs = {
  testSuiteId: Scalars['UUID']['input'];
};


export type QueryGetTestCasesWithLabelArgs = {
  ids: Array<Scalars['UUID']['input']>;
};


export type QueryGetTestSuiteMetricsArgs = {
  testSuiteId: Scalars['UUID']['input'];
};


export type QueryListDataAdaptorsArgs = {
  testSuiteId: Scalars['UUID']['input'];
};


export type QueryListEvaluatorsArgs = {
  testSuiteId: Scalars['UUID']['input'];
};


export type QueryListLabelingUiTemplatesArgs = {
  accountId: Scalars['UUID']['input'];
};


export type QueryListTestCaseIdsArgs = {
  filters?: InputMaybe<TestCaseFiltersInput>;
};

export type TestCaseFiltersInput = {
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  labeled?: InputMaybe<Scalars['Boolean']['input']>;
  labeledBy?: InputMaybe<LabeledByEnum>;
  sourcing?: InputMaybe<LabelSourcingEnum>;
  testSuiteIds?: InputMaybe<Array<Scalars['UUID']['input']>>;
};

export type TestCaseLabelInput = {
  metricId: Scalars['UUID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  value: Scalars['JSON']['input'];
};

export type TestCaseType = {
  __typename?: 'TestCaseType';
  createdAt: Scalars['DateTime']['output'];
  dataAdaptor?: Maybe<Scalars['UUID']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  embedding?: Maybe<Array<Scalars['Float']['output']>>;
  id: Scalars['UUID']['output'];
  testSuite: Scalars['UUID']['output'];
};

export type TestCaseWithLabelInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  embedding: Array<Scalars['Float']['input']>;
  labels?: InputMaybe<Array<TestCaseLabelInput>>;
};

export type TestCaseWithLabelType = {
  __typename?: 'TestCaseWithLabelType';
  label?: Maybe<LabelType>;
  testCase: TestCaseType;
};

export type TestSuiteConfigInput = {
  inputSchema: Scalars['JSON']['input'];
};

export type TestSuiteType = {
  __typename?: 'TestSuiteType';
  account: Scalars['UUID']['output'];
  config: Scalars['JSON']['output'];
  creator: Scalars['UUID']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  labelingUiTemplate?: Maybe<Scalars['UUID']['output']>;
  name: Scalars['String']['output'];
};

export type GetAuthTokenMutationVariables = Exact<{
  username: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type GetAuthTokenMutation = { __typename?: 'Mutation', getAuthToken: { __typename?: 'AuthTokenType', accessToken: string, tokenType: string } };

export type SignUpMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type SignUpMutation = { __typename?: 'Mutation', signUp: { __typename?: 'AuthTokenType', accessToken: string, tokenType: string } };

export type SignInWithOauthMutationVariables = Exact<{
  provider: Scalars['String']['input'];
  code: Scalars['String']['input'];
  redirectUri: Scalars['String']['input'];
}>;


export type SignInWithOauthMutation = { __typename?: 'Mutation', signInWithOauth: { __typename?: 'AuthTokenType', accessToken: string, tokenType: string } };

export type CreateMetricMutationVariables = Exact<{
  name: Scalars['String']['input'];
  config: MetricConfigInput;
  description?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateMetricMutation = { __typename?: 'Mutation', createMetric: any };

export type CreateTestSuiteMutationVariables = Exact<{
  name: Scalars['String']['input'];
  metricIds: Array<Scalars['UUID']['input']> | Scalars['UUID']['input'];
  config: TestSuiteConfigInput;
  description?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateTestSuiteMutation = { __typename?: 'Mutation', createTestSuite: any };

export type LabelTestCasesMutationVariables = Exact<{
  testSuiteId: Scalars['UUID']['input'];
  labels: Array<LabelDetailsInput> | LabelDetailsInput;
}>;


export type LabelTestCasesMutation = { __typename?: 'Mutation', labelTestCases: Array<any> };

export type RemoveTestCasesMutationVariables = Exact<{
  testSuiteId: Scalars['UUID']['input'];
  testCaseIds: Array<Scalars['UUID']['input']> | Scalars['UUID']['input'];
}>;


export type RemoveTestCasesMutation = { __typename?: 'Mutation', removeTestCases: Array<any> };

export type SkipLabelingMutationVariables = Exact<{
  testSuiteId: Scalars['UUID']['input'];
  testCaseId: Scalars['UUID']['input'];
}>;


export type SkipLabelingMutation = { __typename?: 'Mutation', skipLabeling: boolean };

export type CreateDataAdaptorMutationVariables = Exact<{
  name: Scalars['String']['input'];
  testSuiteId: Scalars['UUID']['input'];
  config: DataAdaptorConfigInput;
  description?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateDataAdaptorMutation = { __typename?: 'Mutation', createDataAdaptor: any };

export type ListMetricsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListMetricsQuery = { __typename?: 'Query', listMetrics: Array<{ __typename?: 'MetricType', id: any, name: string, description?: string | null, config: any, account: any }> };

export type ListTestSuitesQueryVariables = Exact<{ [key: string]: never; }>;


export type ListTestSuitesQuery = { __typename?: 'Query', listTestSuites: Array<{ __typename?: 'TestSuiteType', id: any, name: string, description?: string | null, account: any, creator: any, labelingUiTemplate?: any | null, config: any }> };

export type ListTestCaseIdsQueryVariables = Exact<{
  filters?: InputMaybe<TestCaseFiltersInput>;
}>;


export type ListTestCaseIdsQuery = { __typename?: 'Query', listTestCaseIds: Array<any> };

export type GetTestCasesWithLabelQueryVariables = Exact<{
  ids: Array<Scalars['UUID']['input']> | Scalars['UUID']['input'];
}>;


export type GetTestCasesWithLabelQuery = { __typename?: 'Query', getTestCasesWithLabel: Array<{ __typename?: 'TestCaseWithLabelType', testCase: { __typename?: 'TestCaseType', id: any, description?: string | null, embedding?: Array<number> | null, dataAdaptor?: any | null, testSuite: any, createdAt: any }, label?: { __typename?: 'LabelType', id: any, metric: any, testCase: any, value: any, labeledAt: any, labeler?: any | null, notes?: string | null, metadata?: any | null } | null }> };

export type GetLabelingCandidatesQueryVariables = Exact<{
  testSuiteId: Scalars['UUID']['input'];
  count?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetLabelingCandidatesQuery = { __typename?: 'Query', getLabelingCandidates: Array<any> };

export type GetTestSuiteMetricsQueryVariables = Exact<{
  testSuiteId: Scalars['UUID']['input'];
}>;


export type GetTestSuiteMetricsQuery = { __typename?: 'Query', getTestSuiteMetrics: Array<{ __typename?: 'MetricType', id: any, name: string, description?: string | null, config: any, account: any }> };

export type ListEvaluatorsQueryVariables = Exact<{
  testSuiteId: Scalars['UUID']['input'];
}>;


export type ListEvaluatorsQuery = { __typename?: 'Query', listEvaluators: Array<{ __typename?: 'EvaluatorType', id: any, name: string, description?: string | null, testSuite: any, storagePath: string, updatedAt: any }> };

export type GetEvaluatorWithSignatureQueryVariables = Exact<{
  testSuiteId: Scalars['UUID']['input'];
}>;


export type GetEvaluatorWithSignatureQuery = { __typename?: 'Query', getEvaluatorWithSignature?: { __typename?: 'EvaluatorWithSignatureType', inputSchema: any, outputSchema: any, savedProgram?: any | null } | null };

export type GetOptimizationLabelStatsQueryVariables = Exact<{
  testSuiteId: Scalars['UUID']['input'];
}>;


export type GetOptimizationLabelStatsQuery = { __typename?: 'Query', getOptimizationLabelStats: { __typename?: 'OptimizationLabelStats', beforeCutoff: number, afterCutoff: number, cutoffDate?: any | null } };

export type ListDataAdaptorsQueryVariables = Exact<{
  testSuiteId: Scalars['UUID']['input'];
}>;


export type ListDataAdaptorsQuery = { __typename?: 'Query', listDataAdaptors: Array<{ __typename?: 'DataAdaptorType', id: any, name: string, description?: string | null, config: any, testSuite: any }> };


export const GetAuthTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GetAuthToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getAuthToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}}]}}]}}]} as unknown as DocumentNode<GetAuthTokenMutation, GetAuthTokenMutationVariables>;
export const SignUpDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SignUp"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signUp"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}}]}}]}}]} as unknown as DocumentNode<SignUpMutation, SignUpMutationVariables>;
export const SignInWithOauthDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SignInWithOauth"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"provider"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"code"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"redirectUri"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signInWithOauth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"provider"},"value":{"kind":"Variable","name":{"kind":"Name","value":"provider"}}},{"kind":"Argument","name":{"kind":"Name","value":"code"},"value":{"kind":"Variable","name":{"kind":"Name","value":"code"}}},{"kind":"Argument","name":{"kind":"Name","value":"redirectUri"},"value":{"kind":"Variable","name":{"kind":"Name","value":"redirectUri"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}},{"kind":"Field","name":{"kind":"Name","value":"tokenType"}}]}}]}}]} as unknown as DocumentNode<SignInWithOauthMutation, SignInWithOauthMutationVariables>;
export const CreateMetricDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateMetric"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"config"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MetricConfigInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createMetric"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"config"},"value":{"kind":"Variable","name":{"kind":"Name","value":"config"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}}]}]}}]} as unknown as DocumentNode<CreateMetricMutation, CreateMetricMutationVariables>;
export const CreateTestSuiteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTestSuite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"metricIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"config"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TestSuiteConfigInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTestSuite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"metricIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"metricIds"}}},{"kind":"Argument","name":{"kind":"Name","value":"config"},"value":{"kind":"Variable","name":{"kind":"Name","value":"config"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}}]}]}}]} as unknown as DocumentNode<CreateTestSuiteMutation, CreateTestSuiteMutationVariables>;
export const LabelTestCasesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LabelTestCases"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"labels"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LabelDetailsInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"labelTestCases"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"testSuiteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"labels"},"value":{"kind":"Variable","name":{"kind":"Name","value":"labels"}}}]}]}}]} as unknown as DocumentNode<LabelTestCasesMutation, LabelTestCasesMutationVariables>;
export const RemoveTestCasesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveTestCases"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"testCaseIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeTestCases"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"testSuiteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"testCaseIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"testCaseIds"}}}]}]}}]} as unknown as DocumentNode<RemoveTestCasesMutation, RemoveTestCasesMutationVariables>;
export const SkipLabelingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SkipLabeling"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"testCaseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"skipLabeling"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"testSuiteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"testCaseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"testCaseId"}}}]}]}}]} as unknown as DocumentNode<SkipLabelingMutation, SkipLabelingMutationVariables>;
export const CreateDataAdaptorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateDataAdaptor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"config"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DataAdaptorConfigInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createDataAdaptor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"testSuiteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"config"},"value":{"kind":"Variable","name":{"kind":"Name","value":"config"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}}]}]}}]} as unknown as DocumentNode<CreateDataAdaptorMutation, CreateDataAdaptorMutationVariables>;
export const ListMetricsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListMetrics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listMetrics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"config"}},{"kind":"Field","name":{"kind":"Name","value":"account"}}]}}]}}]} as unknown as DocumentNode<ListMetricsQuery, ListMetricsQueryVariables>;
export const ListTestSuitesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListTestSuites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listTestSuites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"account"}},{"kind":"Field","name":{"kind":"Name","value":"creator"}},{"kind":"Field","name":{"kind":"Name","value":"labelingUiTemplate"}},{"kind":"Field","name":{"kind":"Name","value":"config"}}]}}]}}]} as unknown as DocumentNode<ListTestSuitesQuery, ListTestSuitesQueryVariables>;
export const ListTestCaseIdsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListTestCaseIds"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filters"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"TestCaseFiltersInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listTestCaseIds"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filters"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filters"}}}]}]}}]} as unknown as DocumentNode<ListTestCaseIdsQuery, ListTestCaseIdsQueryVariables>;
export const GetTestCasesWithLabelDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTestCasesWithLabel"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getTestCasesWithLabel"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"testCase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"embedding"}},{"kind":"Field","name":{"kind":"Name","value":"dataAdaptor"}},{"kind":"Field","name":{"kind":"Name","value":"testSuite"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"label"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"metric"}},{"kind":"Field","name":{"kind":"Name","value":"testCase"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"labeledAt"}},{"kind":"Field","name":{"kind":"Name","value":"labeler"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}}]}}]}}]}}]} as unknown as DocumentNode<GetTestCasesWithLabelQuery, GetTestCasesWithLabelQueryVariables>;
export const GetLabelingCandidatesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLabelingCandidates"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"count"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLabelingCandidates"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"testSuiteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"count"},"value":{"kind":"Variable","name":{"kind":"Name","value":"count"}}}]}]}}]} as unknown as DocumentNode<GetLabelingCandidatesQuery, GetLabelingCandidatesQueryVariables>;
export const GetTestSuiteMetricsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTestSuiteMetrics"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getTestSuiteMetrics"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"testSuiteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"config"}},{"kind":"Field","name":{"kind":"Name","value":"account"}}]}}]}}]} as unknown as DocumentNode<GetTestSuiteMetricsQuery, GetTestSuiteMetricsQueryVariables>;
export const ListEvaluatorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListEvaluators"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listEvaluators"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"testSuiteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"testSuite"}},{"kind":"Field","name":{"kind":"Name","value":"storagePath"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<ListEvaluatorsQuery, ListEvaluatorsQueryVariables>;
export const GetEvaluatorWithSignatureDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetEvaluatorWithSignature"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getEvaluatorWithSignature"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"testSuiteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inputSchema"}},{"kind":"Field","name":{"kind":"Name","value":"outputSchema"}},{"kind":"Field","name":{"kind":"Name","value":"savedProgram"}}]}}]}}]} as unknown as DocumentNode<GetEvaluatorWithSignatureQuery, GetEvaluatorWithSignatureQueryVariables>;
export const GetOptimizationLabelStatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetOptimizationLabelStats"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getOptimizationLabelStats"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"testSuiteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"beforeCutoff"}},{"kind":"Field","name":{"kind":"Name","value":"afterCutoff"}},{"kind":"Field","name":{"kind":"Name","value":"cutoffDate"}}]}}]}}]} as unknown as DocumentNode<GetOptimizationLabelStatsQuery, GetOptimizationLabelStatsQueryVariables>;
export const ListDataAdaptorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListDataAdaptors"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listDataAdaptors"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"testSuiteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"config"}},{"kind":"Field","name":{"kind":"Name","value":"testSuite"}}]}}]}}]} as unknown as DocumentNode<ListDataAdaptorsQuery, ListDataAdaptorsQueryVariables>;
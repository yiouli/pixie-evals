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
  /** Represents a file upload. */
  Upload: { input: any; output: any; }
};

export enum CreationStatus {
  Complete = 'COMPLETE',
  Creating = 'CREATING',
  Embedding = 'EMBEDDING',
  Error = 'ERROR',
  Uploading = 'UPLOADING'
}

export type DataEntryType = {
  __typename?: 'DataEntryType';
  data: Scalars['JSON']['output'];
  datasetId: Scalars['UUID']['output'];
  id: Scalars['UUID']['output'];
};

export type DatasetType = {
  __typename?: 'DatasetType';
  createdAt: Scalars['DateTime']['output'];
  fileName: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  rowSchema: Scalars['JSON']['output'];
  testSuiteId?: Maybe<Scalars['UUID']['output']>;
};

export type EvaluationResultItem = {
  __typename?: 'EvaluationResultItem';
  entryId: Scalars['String']['output'];
  error?: Maybe<Scalars['String']['output']>;
  output: Scalars['JSON']['output'];
};

export enum EvaluationStatus {
  Complete = 'COMPLETE',
  Error = 'ERROR',
  Evaluating = 'EVALUATING',
  Loading = 'LOADING',
  Saving = 'SAVING'
}

export type EvaluationUpdate = {
  __typename?: 'EvaluationUpdate';
  completed: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  progress: Scalars['Float']['output'];
  results?: Maybe<Array<EvaluationResultItem>>;
  status: EvaluationStatus;
  total: Scalars['Int']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  deleteDataset: Scalars['Boolean']['output'];
  linkDatasetToTestSuite: Scalars['Boolean']['output'];
  scaffoldLabelingComponent: Scalars['String']['output'];
  uploadFile: DatasetType;
};


export type MutationDeleteDatasetArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationLinkDatasetToTestSuiteArgs = {
  datasetId: Scalars['UUID']['input'];
  testSuiteId: Scalars['UUID']['input'];
};


export type MutationScaffoldLabelingComponentArgs = {
  testSuiteId: Scalars['UUID']['input'];
};


export type MutationUploadFileArgs = {
  file: Scalars['Upload']['input'];
};

export enum OptimizationStatus {
  Complete = 'COMPLETE',
  Error = 'ERROR',
  Loading = 'LOADING',
  Optimizing = 'OPTIMIZING',
  Preparing = 'PREPARING',
  Saving = 'SAVING'
}

export type OptimizationUpdate = {
  __typename?: 'OptimizationUpdate';
  evaluatorId?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  progress: Scalars['Float']['output'];
  status: OptimizationStatus;
};

export type Query = {
  __typename?: 'Query';
  dataEntryCount: Scalars['Int']['output'];
  getDataEntries: Array<DataEntryType>;
  getDataset?: Maybe<DatasetType>;
  getLabelingHtml: Scalars['String']['output'];
  listDatasets: Array<DatasetType>;
  listLabelingComponents: Array<Scalars['String']['output']>;
  renderLabelingUi: Scalars['String']['output'];
};


export type QueryDataEntryCountArgs = {
  datasetId: Scalars['UUID']['input'];
};


export type QueryGetDataEntriesArgs = {
  datasetId: Scalars['UUID']['input'];
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};


export type QueryGetDatasetArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryGetLabelingHtmlArgs = {
  testCaseId: Scalars['UUID']['input'];
};


export type QueryRenderLabelingUiArgs = {
  entryId: Scalars['UUID']['input'];
  templateName?: InputMaybe<Scalars['String']['input']>;
};

export type Subscription = {
  __typename?: 'Subscription';
  createTestSuiteProgress: TestSuiteCreationProgress;
  evaluateDataset: EvaluationUpdate;
  importTestCasesProgress: TestSuiteCreationProgress;
  optimizeEvaluator: OptimizationUpdate;
};


export type SubscriptionCreateTestSuiteProgressArgs = {
  datasetId: Scalars['UUID']['input'];
  input: TestSuiteCreateInput;
};


export type SubscriptionEvaluateDatasetArgs = {
  datasetId: Scalars['UUID']['input'];
};


export type SubscriptionImportTestCasesProgressArgs = {
  datasetId: Scalars['UUID']['input'];
  testSuiteId: Scalars['UUID']['input'];
};


export type SubscriptionOptimizeEvaluatorArgs = {
  testSuiteId: Scalars['UUID']['input'];
};

export type TestSuiteCreateInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  inputSchema: Scalars['JSON']['input'];
  metricIds?: Array<Scalars['UUID']['input']>;
  name: Scalars['String']['input'];
};

export type TestSuiteCreationProgress = {
  __typename?: 'TestSuiteCreationProgress';
  message: Scalars['String']['output'];
  progress: Scalars['Float']['output'];
  status: CreationStatus;
  testSuiteId?: Maybe<Scalars['UUID']['output']>;
};

export type UploadFileMutationVariables = Exact<{
  file: Scalars['Upload']['input'];
}>;


export type UploadFileMutation = { __typename?: 'Mutation', uploadFile: { __typename?: 'DatasetType', id: any, fileName: string, createdAt: any, rowSchema: any } };

export type LinkDatasetToTestSuiteMutationVariables = Exact<{
  datasetId: Scalars['UUID']['input'];
  testSuiteId: Scalars['UUID']['input'];
}>;


export type LinkDatasetToTestSuiteMutation = { __typename?: 'Mutation', linkDatasetToTestSuite: boolean };

export type ListDatasetsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListDatasetsQuery = { __typename?: 'Query', listDatasets: Array<{ __typename?: 'DatasetType', id: any, fileName: string, createdAt: any, rowSchema: any, testSuiteId?: any | null }> };

export type GetDatasetQueryVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;


export type GetDatasetQuery = { __typename?: 'Query', getDataset?: { __typename?: 'DatasetType', id: any, fileName: string, createdAt: any, rowSchema: any, testSuiteId?: any | null } | null };

export type GetDataEntriesQueryVariables = Exact<{
  datasetId: Scalars['UUID']['input'];
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetDataEntriesQuery = { __typename?: 'Query', getDataEntries: Array<{ __typename?: 'DataEntryType', id: any, datasetId: any, data: any }> };

export type GetLabelingHtmlQueryVariables = Exact<{
  testCaseId: Scalars['UUID']['input'];
}>;


export type GetLabelingHtmlQuery = { __typename?: 'Query', getLabelingHtml: string };

export type ListLabelingComponentsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListLabelingComponentsQuery = { __typename?: 'Query', listLabelingComponents: Array<string> };

export type CreateTestSuiteProgressSubscriptionVariables = Exact<{
  datasetId: Scalars['UUID']['input'];
  input: TestSuiteCreateInput;
}>;


export type CreateTestSuiteProgressSubscription = { __typename?: 'Subscription', createTestSuiteProgress: { __typename?: 'TestSuiteCreationProgress', status: CreationStatus, message: string, progress: number, testSuiteId?: any | null } };

export type EvaluateDatasetSubscriptionVariables = Exact<{
  datasetId: Scalars['UUID']['input'];
}>;


export type EvaluateDatasetSubscription = { __typename?: 'Subscription', evaluateDataset: { __typename?: 'EvaluationUpdate', status: EvaluationStatus, message: string, progress: number, total: number, completed: number, results?: Array<{ __typename?: 'EvaluationResultItem', entryId: string, output: any, error?: string | null }> | null } };

export type OptimizeEvaluatorSubscriptionVariables = Exact<{
  testSuiteId: Scalars['UUID']['input'];
}>;


export type OptimizeEvaluatorSubscription = { __typename?: 'Subscription', optimizeEvaluator: { __typename?: 'OptimizationUpdate', status: OptimizationStatus, message: string, progress: number, evaluatorId?: string | null } };

export type ImportTestCasesProgressSubscriptionVariables = Exact<{
  datasetId: Scalars['UUID']['input'];
  testSuiteId: Scalars['UUID']['input'];
}>;


export type ImportTestCasesProgressSubscription = { __typename?: 'Subscription', importTestCasesProgress: { __typename?: 'TestSuiteCreationProgress', status: CreationStatus, message: string, progress: number, testSuiteId?: any | null } };


export const UploadFileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UploadFile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"file"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Upload"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uploadFile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"file"},"value":{"kind":"Variable","name":{"kind":"Name","value":"file"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"rowSchema"}}]}}]}}]} as unknown as DocumentNode<UploadFileMutation, UploadFileMutationVariables>;
export const LinkDatasetToTestSuiteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LinkDatasetToTestSuite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"datasetId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"linkDatasetToTestSuite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"datasetId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"datasetId"}}},{"kind":"Argument","name":{"kind":"Name","value":"testSuiteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}}}]}]}}]} as unknown as DocumentNode<LinkDatasetToTestSuiteMutation, LinkDatasetToTestSuiteMutationVariables>;
export const ListDatasetsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListDatasets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listDatasets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"rowSchema"}},{"kind":"Field","name":{"kind":"Name","value":"testSuiteId"}}]}}]}}]} as unknown as DocumentNode<ListDatasetsQuery, ListDatasetsQueryVariables>;
export const GetDatasetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDataset"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getDataset"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"rowSchema"}},{"kind":"Field","name":{"kind":"Name","value":"testSuiteId"}}]}}]}}]} as unknown as DocumentNode<GetDatasetQuery, GetDatasetQueryVariables>;
export const GetDataEntriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDataEntries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"datasetId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getDataEntries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"datasetId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"datasetId"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"datasetId"}},{"kind":"Field","name":{"kind":"Name","value":"data"}}]}}]}}]} as unknown as DocumentNode<GetDataEntriesQuery, GetDataEntriesQueryVariables>;
export const GetLabelingHtmlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLabelingHtml"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"testCaseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLabelingHtml"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"testCaseId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"testCaseId"}}}]}]}}]} as unknown as DocumentNode<GetLabelingHtmlQuery, GetLabelingHtmlQueryVariables>;
export const ListLabelingComponentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListLabelingComponents"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listLabelingComponents"}}]}}]} as unknown as DocumentNode<ListLabelingComponentsQuery, ListLabelingComponentsQueryVariables>;
export const CreateTestSuiteProgressDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"CreateTestSuiteProgress"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"datasetId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TestSuiteCreateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTestSuiteProgress"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"datasetId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"datasetId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"testSuiteId"}}]}}]}}]} as unknown as DocumentNode<CreateTestSuiteProgressSubscription, CreateTestSuiteProgressSubscriptionVariables>;
export const EvaluateDatasetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"EvaluateDataset"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"datasetId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"evaluateDataset"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"datasetId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"datasetId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"completed"}},{"kind":"Field","name":{"kind":"Name","value":"results"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entryId"}},{"kind":"Field","name":{"kind":"Name","value":"output"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]}}]} as unknown as DocumentNode<EvaluateDatasetSubscription, EvaluateDatasetSubscriptionVariables>;
export const OptimizeEvaluatorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"OptimizeEvaluator"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"optimizeEvaluator"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"testSuiteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"evaluatorId"}}]}}]}}]} as unknown as DocumentNode<OptimizeEvaluatorSubscription, OptimizeEvaluatorSubscriptionVariables>;
export const ImportTestCasesProgressDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"ImportTestCasesProgress"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"datasetId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"importTestCasesProgress"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"datasetId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"datasetId"}}},{"kind":"Argument","name":{"kind":"Name","value":"testSuiteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"testSuiteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"testSuiteId"}}]}}]}}]} as unknown as DocumentNode<ImportTestCasesProgressSubscription, ImportTestCasesProgressSubscriptionVariables>;
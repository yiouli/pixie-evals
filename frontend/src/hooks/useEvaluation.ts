import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { remoteClient } from "../lib/apolloClient";
import { useAuthStore } from "../lib/store";
import {
  LIST_TEST_CASE_IDS,
  GET_TEST_CASES_WITH_LABEL,
  GET_LABELING_CANDIDATES,
} from "../graphql/remote/query";
import {
  LABEL_TEST_CASES,
  REMOVE_TEST_CASES,
  SKIP_LABELING,
} from "../graphql/remote/mutation";
import type { GetTestCasesWithLabelQuery } from "../generated/remote/graphql";

/** A test case with its label as returned by the server. */
export type TestCaseWithLabel =
  GetTestCasesWithLabelQuery["getTestCasesWithLabel"][number];

/** Input for a single metric label value. */
export interface MetricLabelValue {
  metricId: string;
  value: unknown;
}

/**
 * Hook for evaluation operations.
 *
 * Manages test case display, labeling, and evaluation results
 * for a specific test suite.
 */
export function useEvaluation(testSuiteId: string) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Fetch all test case IDs for this test suite
  const {
    data: idsData,
    loading: idsLoading,
    error: idsError,
    refetch: refetchIds,
  } = useQuery(LIST_TEST_CASE_IDS, {
    client: remoteClient,
    variables: { filters: { testSuiteIds: [testSuiteId] } },
    skip: !testSuiteId || !isAuthenticated,
  });

  const allIds: string[] = useMemo(
    () => (idsData?.listTestCaseIds as string[] | undefined) ?? [],
    [idsData],
  );
  const totalCount = allIds.length;

  // Get the page slice of IDs
  const pageIds = useMemo(
    () => allIds.slice(page * pageSize, (page + 1) * pageSize),
    [allIds, page, pageSize],
  );

  // Fetch test cases with labels for the current page
  const {
    data: casesData,
    loading: casesLoading,
    error: casesError,
    refetch: refetchCases,
  } = useQuery(GET_TEST_CASES_WITH_LABEL, {
    client: remoteClient,
    variables: { ids: pageIds },
    skip: pageIds.length === 0,
  });

  // Fetch labeling candidates (for manual label button)
  const { data: candidatesData, refetch: refetchCandidates } = useQuery(
    GET_LABELING_CANDIDATES,
    {
      client: remoteClient,
      variables: { testSuiteId, count: 1 },
      skip: !testSuiteId || !isAuthenticated,
    },
  );

  const [labelMutation] = useMutation(LABEL_TEST_CASES, {
    client: remoteClient,
  });

  const [removeMutation] = useMutation(REMOVE_TEST_CASES, {
    client: remoteClient,
  });

  const [skipMutation] = useMutation(SKIP_LABELING, {
    client: remoteClient,
  });

  /** Submit manual labels for a test case. */
  const submitLabel = useCallback(
    async (
      testCaseId: string,
      labels: MetricLabelValue[],
      notes?: string,
    ) => {
      await labelMutation({
        variables: {
          testSuiteId,
          labels: [
            {
              testCaseId,
              labels: labels.map((l) => ({
                metricId: l.metricId,
                value: l.value,
              })),
              notes,
            },
          ],
        },
      });
      await refetchCases();
      await refetchCandidates();
    },
    [testSuiteId, labelMutation, refetchCases, refetchCandidates],
  );

  /** Remove a test case from the test suite. */
  const removeTestCase = useCallback(
    async (testCaseId: string) => {
      await removeMutation({
        variables: {
          testSuiteId,
          testCaseIds: [testCaseId],
        },
      });
      await refetchIds();
      await refetchCases();
    },
    [testSuiteId, removeMutation, refetchIds, refetchCases],
  );

  /** Skip labeling for a test case. */
  const skipLabeling = useCallback(
    async (testCaseId: string) => {
      await skipMutation({
        variables: {
          testSuiteId,
          testCaseId,
        },
      });
      await refetchCandidates();
    },
    [testSuiteId, skipMutation, refetchCandidates],
  );

  /** The next labeling candidate ID. */
  const nextCandidateId: string | undefined =
    (candidatesData?.getLabelingCandidates as string[] | undefined)?.[0];

  /** Refetch all test case data (IDs, cases, and candidates). */
  const refetch = useCallback(async () => {
    await refetchIds();
    await refetchCases();
    await refetchCandidates();
  }, [refetchIds, refetchCases, refetchCandidates]);

  return {
    testCases: casesData?.getTestCasesWithLabel ?? [],
    loading: idsLoading || casesLoading,
    error: idsError ?? casesError ?? null,
    submitLabel,
    removeTestCase,
    skipLabeling,
    nextCandidateId,
    refetch,
    page,
    pageSize,
    setPage,
    setPageSize,
    totalCount,
  };
}

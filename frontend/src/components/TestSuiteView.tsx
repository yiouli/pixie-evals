import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useQuery } from "@apollo/client";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LabelRoundedIcon from "@mui/icons-material/LabelRounded";
import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import { EditableText } from "./EditableText";
import { MetricChip } from "./MetricChip";
import { TestCaseDataGrid } from "./TestCaseDataGrid";
import { ManualLabelingDialog } from "./ManualLabelingDialog";
import { OptimizationDialog } from "./OptimizationDialog";
import { useTestSuites } from "../hooks/useTestSuites";
import {
  GET_TEST_SUITE_METRICS,
  GET_OPTIMIZATION_LABEL_STATS,
} from "../graphql/remote/query";
import { remoteClient } from "../lib/apolloClient";
import { parseMetricConfig } from "../lib/metricUtils";
import { useAuthStore } from "../lib/store";
import { useEvaluation } from "../hooks/useEvaluation";
import { JsonSchemaViewer } from "@stoplight/json-schema-viewer";

/**
 * Test suite detail view.
 *
 * Shows test suite name (click to edit), evaluation metrics, action
 * buttons (manual label, import test cases, delete),
 * description (click to edit), readonly metrics list, readonly input
 * schema, and paginated test cases with per-row action buttons.
 */
export function TestSuiteView() {
  const { testSuiteId } = useParams<{ testSuiteId: string }>();
  const navigate = useNavigate();
  const [labelingOpen, setLabelingOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | undefined>();
  const [optimizationOpen, setOptimizationOpen] = useState(false);

  // Fetch test suite data from remote server
  const { testSuites, loading: suitesLoading } = useTestSuites();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { data: metricsData, loading: metricsLoading } = useQuery(
    GET_TEST_SUITE_METRICS,
    {
      client: remoteClient,
      variables: { testSuiteId: testSuiteId ?? "" },
      skip: !isAuthenticated || !testSuiteId,
    },
  );
  const metrics = metricsData?.getTestSuiteMetrics ?? [];

  // Fetch optimization label stats to determine if optimize button should be enabled
  const { data: labelStatsData } = useQuery(
    GET_OPTIMIZATION_LABEL_STATS,
    {
      client: remoteClient,
      variables: { testSuiteId: testSuiteId ?? "" },
      skip: !isAuthenticated || !testSuiteId,
    },
  );
  const labelStats = labelStatsData?.getOptimizationLabelStats;
  const canOptimize = useMemo(() => {
    if (!labelStats) return false;
    const threshold = Math.max(5, 0.2 * labelStats.beforeCutoff);
    return labelStats.afterCutoff > threshold;
  }, [labelStats]);

  const {
    testCases,
    loading: casesLoading,
    error: casesError,
    submitLabel,
    removeTestCase,
    skipLabeling,
    nextCandidateId,
    totalCount,
  } = useEvaluation(testSuiteId ?? "");

  // Find the current test suite from the list
  const testSuite = useMemo(
    () => testSuites.find((ts) => ts.id === testSuiteId),
    [testSuites, testSuiteId],
  );

  // Extract input schema from test suite config
  const inputSchema = useMemo(() => {
    if (!testSuite?.config) return {};
    const config = parseMetricConfig(testSuite.config);
    return config.input_schema ?? {};
  }, [testSuite]);

  // Transform test cases into rows for the data grid
  const rows = useMemo(
    () =>
      testCases.map((tc) => ({
        id: tc.testCase.id as string,
        description: tc.testCase.description ?? "-",
        created: tc.testCase.createdAt as string,
        labeled: tc.label ? "Yes" : "No",
        labelValue: tc.label ? JSON.stringify(tc.label.value) : "-",
      })),
    [testCases],
  );

  const handleManualLabel = () => {
    setSelectedEntryId(nextCandidateId);
    setLabelingOpen(true);
  };

  const handleLabelRow = (id: string) => {
    setSelectedEntryId(id);
    setLabelingOpen(true);
  };

  const handleDeleteRow = async (id: string) => {
    await removeTestCase(id);
  };

  const handleSaveLabel = async (
    ratings: Record<string, number>,
    notes: string,
  ) => {
    if (!selectedEntryId) return;
    const labels = Object.entries(ratings).map(([metricId, value]) => ({
      metricId,
      value,
    }));
    await submitLabel(selectedEntryId, labels, notes || undefined);
    setLabelingOpen(false);
  };

  const handleSkip = async () => {
    if (!selectedEntryId) return;
    await skipLabeling(selectedEntryId);
    // Advance to next candidate
    setSelectedEntryId(nextCandidateId);
  };

  if (suitesLoading || metricsLoading) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!testSuite) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="warning">
          Evaluation not found: {testSuiteId}
        </Alert>
        <Button onClick={() => navigate("/")} sx={{ mt: 2 }}>
          Back to selection
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ height: "100%", overflowY: "auto" }}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Tooltip title="Back to selection">
            <IconButton onClick={() => navigate("/")} size="small">
              <ArrowBackRoundedIcon />
            </IconButton>
          </Tooltip>
          <EditableText
            value={testSuite.name}
            onSave={() => {
              /* Name update not yet supported */
            }}
            variant="h4"
          />
        </Stack>

        {/* Test Suite ID */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, ml: 5 }}
        >
          ID: {testSuiteId}
        </Typography>

        {/* Action buttons */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<LabelRoundedIcon />}
            onClick={handleManualLabel}
          >
            Manual Label
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileUploadRoundedIcon />}
          >
            Import Test Cases
          </Button>
          <Tooltip
            title={
              canOptimize
                ? "Optimize evaluator with new manual labels"
                : `Need more manual labels after cutoff (${labelStats?.afterCutoff ?? 0} available, need > ${labelStats ? Math.max(5, Math.round(0.2 * labelStats.beforeCutoff)) : 5})`
            }
          >
            <span>
              <Button
                variant="outlined"
                startIcon={<AutoFixHighRoundedIcon />}
                onClick={() => setOptimizationOpen(true)}
                disabled={!canOptimize}
              >
                Optimize Evaluator
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineRoundedIcon />}
          >
            Delete
          </Button>
        </Stack>

        {/* Description */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 0.5 }}
          >
            Description
          </Typography>
          <EditableText
            value={testSuite.description ?? ""}
            onSave={() => {
              /* Description update not yet supported */
            }}
            variant="body1"
            placeholder="Click to add a description..."
            multiline
          />
        </Box>

        {/* Metrics */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Evaluation Metrics
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {metrics.map((metric) => (
              <MetricChip
                key={metric.id as string}
                metric={metric}
              />
            ))}
          </Stack>
        </Box>

        {/* Input Schema */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Input Schema
          </Typography>
          <Paper
            variant="outlined"
            sx={{ p: 2, borderRadius: 2, bgcolor: "grey.50" }}
          >
            <JsonSchemaViewer
              schema={inputSchema}
              emptyText="No input schema defined."
              defaultExpandedDepth={2}
            />
          </Paper>
        </Box>

        {/* Test Cases Grid */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Test Cases ({totalCount})
          </Typography>
          {casesError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {casesError.message}
            </Alert>
          )}
          <TestCaseDataGrid
            rows={rows}
            showActions
            onLabel={handleLabelRow}
            onDelete={handleDeleteRow}
            loading={casesLoading}
          />
        </Box>
      </Container>

      {/* Manual Labeling Dialog */}
      <ManualLabelingDialog
        open={labelingOpen}
        onClose={() => setLabelingOpen(false)}
        entryId={selectedEntryId}
        metrics={metrics.map((m) => ({
          id: m.id as string,
          name: m.name,
        }))}
        onSave={handleSaveLabel}
        onSkip={handleSkip}
      />

      {/* Optimization Dialog */}
      {testSuiteId && (
        <OptimizationDialog
          open={optimizationOpen}
          onClose={() => setOptimizationOpen(false)}
          testSuiteId={testSuiteId}
        />
      )}
    </Box>
  );
}

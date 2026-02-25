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
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import { useQuery, useMutation } from "@apollo/client";
import { sdkClient } from "../lib/apolloClient";
import { GET_DATASET, GET_DATA_ENTRIES } from "../graphql/sdk/query";
import { LINK_DATASET_TO_TEST_SUITE } from "../graphql/sdk/mutation";
import { EditableText } from "./EditableText";
import { TestSuiteConfigDialog } from "./TestSuiteConfigDialog";
import { LinkTestSuiteDialog } from "./LinkTestSuiteDialog";
import { EvaluatorSelectionDialog } from "./EvaluatorSelectionDialog";
import { EvaluationDialog } from "./EvaluationDialog";
import { useMetrics } from "../hooks/useMetrics";

/**
 * Dataset detail view.
 *
 * Shows dataset name (click to edit), action buttons (conditional on
 * whether dataset is linked to a test suite), description, JSON schema,
 * evaluation metrics, and a paginated data grid of entries.
 *
 * When not linked to a test suite: "Create Test Suite" and "Link Test Suite".
 * When linked: "Evaluate" button to start AI evaluation.
 */
export function DatasetView() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const navigate = useNavigate();
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [evalSelectorOpen, setEvalSelectorOpen] = useState(false);
  const [evalDialogOpen, setEvalDialogOpen] = useState(false);
  const [datasetName, setDatasetName] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  const {
    data: datasetData,
    loading: datasetLoading,
    error: datasetError,
    refetch: refetchDataset,
  } = useQuery(GET_DATASET, {
    client: sdkClient,
    variables: { id: datasetId! },
    skip: !datasetId,
  });

  const { data: entriesData, loading: entriesLoading } = useQuery(
    GET_DATA_ENTRIES,
    {
      client: sdkClient,
      variables: { datasetId: datasetId!, offset: 0, limit: 100 },
      skip: !datasetId,
    },
  );

  const [linkMutation] = useMutation(LINK_DATASET_TO_TEST_SUITE, {
    client: sdkClient,
  });

  const dataset = datasetData?.getDataset;
  const entries = entriesData?.getDataEntries ?? [];
  const displayName = datasetName ?? dataset?.fileName ?? "Loading...";
  const testSuiteId = dataset?.testSuiteId as string | null | undefined;
  const hasTestSuite = !!testSuiteId;

  // Fetch metrics for the linked test suite
  const { metrics: allMetrics } = useMetrics();

  // Metrics associated with the test suite (filter from all)
  const metrics = useMemo(() => allMetrics, [allMetrics]);

  // Flatten entries for DataGrid
  const rows = useMemo(
    () =>
      entries.map((entry) => ({
        id: entry.id,
        ...(typeof entry.data === "object" ? entry.data : {}),
      })),
    [entries],
  );

  // Auto-detect columns from first row
  const columns = useMemo<GridColDef[]>(() => {
    const firstRow = rows[0];
    if (!firstRow) return [];
    return Object.keys(firstRow)
      .filter((key) => key !== "id")
      .map((key) => ({
        field: key,
        headerName: key,
        flex: 1,
        minWidth: 150,
        renderCell: (params: GridRenderCellParams) => {
          const val = params.value;
          if (val === null || val === undefined) return "-";
          if (typeof val === "object") return JSON.stringify(val);
          return String(val);
        },
      }));
  }, [rows]);

  // Format schema for display
  const schemaDisplay = useMemo(() => {
    if (!dataset?.rowSchema) return null;
    const schema =
      typeof dataset.rowSchema === "string"
        ? JSON.parse(dataset.rowSchema)
        : dataset.rowSchema;
    return JSON.stringify(schema, null, 2);
  }, [dataset?.rowSchema]);

  const handleLinkTestSuite = async (selectedTestSuiteId: string) => {
    if (!datasetId) return;
    await linkMutation({
      variables: {
        datasetId,
        testSuiteId: selectedTestSuiteId,
      },
    });
    await refetchDataset();
  };

  const handleCreateTestSuiteSuccess = async (newTestSuiteId: string) => {
    setConfigDialogOpen(false);
    // Auto-link the dataset to the newly created test suite
    if (datasetId) {
      await linkMutation({
        variables: {
          datasetId,
          testSuiteId: newTestSuiteId,
        },
      });
      await refetchDataset();
    }
    navigate(`/test-suite/${newTestSuiteId}`);
  };

  if (datasetLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (datasetError) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load dataset: {datasetError.message}
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
        {/* Header with back button and editable name */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Tooltip title="Back to selection">
            <IconButton onClick={() => navigate("/")} size="small">
              <ArrowBackRoundedIcon />
            </IconButton>
          </Tooltip>
          <EditableText
            value={displayName}
            onSave={(value) => setDatasetName(value)}
            variant="h4"
          />
        </Stack>

        {/* Linked test suite indicator */}
        {hasTestSuite && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1, ml: 5 }}
          >
            Linked Test Suite: {testSuiteId}
          </Typography>
        )}

        {/* Action buttons — conditional on test suite linkage */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          {!hasTestSuite ? (
            <>
              <Button
                variant="contained"
                startIcon={<ScienceRoundedIcon />}
                onClick={() => setConfigDialogOpen(true)}
              >
                Create Test Suite
              </Button>
              <Button
                variant="outlined"
                startIcon={<LinkRoundedIcon />}
                onClick={() => setLinkDialogOpen(true)}
              >
                Link Test Suite
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                startIcon={<PlayArrowRoundedIcon />}
                onClick={() => setEvalSelectorOpen(true)}
              >
                Evaluate
              </Button>
            </>
          )}
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
            value={description}
            onSave={setDescription}
            variant="body1"
            placeholder="Click to add a description..."
            multiline
          />
        </Box>

        {/* Metrics (shown when linked to test suite) */}
        {hasTestSuite && metrics.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Evaluation Metrics
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {metrics.map((metric) => (
                <Chip
                  key={metric.id as string}
                  label={metric.name}
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Schema */}
        {schemaDisplay && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Schema
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "grey.50",
                maxHeight: 300,
                overflow: "auto",
              }}
            >
              <Box
                component="pre"
                sx={{ m: 0, fontSize: "0.875rem", fontFamily: "monospace" }}
              >
                {schemaDisplay}
              </Box>
            </Paper>
          </Box>
        )}

        {/* Data Grid */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Dataset Content
          </Typography>
          <Box sx={{ height: 500 }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={entriesLoading}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              pageSizeOptions={[25, 50, 100]}
              disableRowSelectionOnClick
            />
          </Box>
        </Box>
      </Container>

      {/* Create Test Suite from this dataset */}
      <TestSuiteConfigDialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        preselectedDatasetId={datasetId}
        onSuccess={handleCreateTestSuiteSuccess}
      />

      {/* Link existing test suite */}
      <LinkTestSuiteDialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        onLink={handleLinkTestSuite}
      />

      {/* Evaluator selection dialog (when clicking Evaluate) */}
      {hasTestSuite && (
        <EvaluatorSelectionDialog
          open={evalSelectorOpen}
          onClose={() => setEvalSelectorOpen(false)}
          testSuiteId={testSuiteId!}
          onSelect={() => {
            setEvalSelectorOpen(false);
            setEvalDialogOpen(true);
          }}
        />
      )}

      {/* AI Evaluation progress dialog */}
      <EvaluationDialog
        open={evalDialogOpen}
        onClose={() => setEvalDialogOpen(false)}
        metrics={metrics.map((m) => ({
          id: m.id as string,
          name: m.name,
        }))}
      />
    </Box>
  );
}

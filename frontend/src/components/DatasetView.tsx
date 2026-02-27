import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import { useQuery, useMutation } from "@apollo/client";
import { sdkClient } from "../lib/apolloClient";
import { GET_DATASET, GET_DATA_ENTRIES } from "../graphql/sdk/query";
import { LINK_DATASET_TO_TEST_SUITE } from "../graphql/sdk/mutation";
import { EditableText } from "./EditableText";
import { TestSuiteConfigDialog } from "./TestSuiteConfigDialog";
import { EvaluationCard } from "./EvaluationCard";
import { EvaluationDialog } from "./EvaluationDialog";
import { JsonSchemaViewer } from "@stoplight/json-schema-viewer";

/**
 * Dataset detail view.
 *
 * Shows dataset name (click to edit), an EvaluationCard for the linked
 * evaluation (with dropdown to switch/create), description, JSON schema,
 * and a paginated data grid of entries.
 */
export function DatasetView() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const navigate = useNavigate();
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
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

        {/* Linked evaluation card */}
        <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 3 }}>
          <Box sx={{ flex: 1, maxWidth: 480 }}>
            <EvaluationCard
              testSuiteId={(testSuiteId as string) ?? null}
              onCreateEvaluation={() => setConfigDialogOpen(true)}
              onLinkChange={handleLinkTestSuite}
              onEvaluate={() => setEvalDialogOpen(true)}
            />
          </Box>
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

        {/* Schema */}

        <JsonSchemaViewer
          schema={dataset?.rowSchema}
          emptyText="Cannot parse row schema."
          defaultExpandedDepth={2}
        />

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

      {/* AI Evaluation progress dialog */}
      {datasetId && (
        <EvaluationDialog
          open={evalDialogOpen}
          onClose={() => setEvalDialogOpen(false)}
          datasetId={datasetId}
        />
      )}
    </Box>
  );
}

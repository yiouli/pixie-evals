import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  Paper,
} from "@mui/material";
import { gql, useQuery } from "@apollo/client";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { sdkClient } from "../lib/apolloClient";
import { DatasetUploadDialog } from "./DatasetUploadDialog";
import { useDatasets } from "../hooks/useDatasets";
import { useTestSuites } from "../hooks/useTestSuites";
import { MetricEditor, type MetricConfig, createEmptyMetric } from "./MetricEditor";

const GET_DATASET = gql`
  query GetDatasetForConfig($id: UUID!) {
    getDataset(id: $id) {
      id
      fileName
      createdAt
      rowSchema
    }
  }
`;

const GET_DATA_ENTRIES = gql`
  query GetDataEntriesForConfig($datasetId: UUID!, $offset: Int, $limit: Int) {
    getDataEntries(datasetId: $datasetId, offset: $offset, limit: $limit) {
      id
      datasetId
      data
    }
  }
`;

interface DataEntry {
  id: string;
  datasetId: string;
  data: Record<string, unknown>;
}

interface TestSuiteConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (testSuiteId: string) => void;
  /** Pre-selected dataset ID (e.g., when creating from dataset view). */
  preselectedDatasetId?: string;
}

/**
 * Test suite configuration dialog.
 *
 * Fields: name, description (optional), metrics (editable list),
 * dataset selection (or upload). Once a dataset is selected, shows
 * the readonly input schema and paginated test cases preview.
 */
export function TestSuiteConfigDialog({
  open,
  onClose,
  onSuccess,
  preselectedDatasetId,
}: TestSuiteConfigDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metrics, setMetrics] = useState<MetricConfig[]>([createEmptyMetric()]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(
    preselectedDatasetId ?? null,
  );
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const { datasets } = useDatasets();
  const { createTestSuite } = useTestSuites();

  // Fetch selected dataset details
  const { data: datasetData } = useQuery<{
    getDataset: { rowSchema: Record<string, unknown> | string };
  }>(GET_DATASET, {
    client: sdkClient,
    variables: { id: selectedDatasetId },
    skip: !selectedDatasetId,
  });

  // Fetch preview entries for selected dataset
  const { data: entriesData, loading: entriesLoading } = useQuery<{
    getDataEntries: DataEntry[];
  }>(GET_DATA_ENTRIES, {
    client: sdkClient,
    variables: { datasetId: selectedDatasetId, offset: 0, limit: 10 },
    skip: !selectedDatasetId,
  });

  useEffect(() => {
    if (preselectedDatasetId) {
      setSelectedDatasetId(preselectedDatasetId);
    }
  }, [preselectedDatasetId]);

  // Flatten entries for DataGrid preview
  const previewRows = useMemo(() => {
    const entries = entriesData?.getDataEntries ?? [];
    return entries.map((entry) => ({
      id: entry.id,
      ...(typeof entry.data === "object" ? entry.data : {}),
    }));
  }, [entriesData]);

  // Auto-detect columns from preview rows
  const previewColumns = useMemo<GridColDef[]>(() => {
    const firstRow = previewRows[0];
    if (!firstRow) return [];
    return Object.keys(firstRow)
      .filter((key) => key !== "id")
      .map((key) => ({
        field: key,
        headerName: key,
        flex: 1,
        minWidth: 120,
      }));
  }, [previewRows]);

  // Format schema for display
  const schemaDisplay = useMemo(() => {
    const raw = datasetData?.getDataset?.rowSchema;
    if (!raw) return null;
    const schema = typeof raw === "string" ? JSON.parse(raw) : raw;
    return JSON.stringify(schema, null, 2);
  }, [datasetData]);

  const handleCreate = async () => {
    if (!selectedDatasetId) return;
    setCreating(true);
    try {
      const validMetrics = metrics.filter((m) => m.name.trim());
      const id = await createTestSuite({
        name: name.trim(),
        description: description.trim(),
        metrics: validMetrics,
        datasetId: selectedDatasetId,
      });
      onSuccess?.(id);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setMetrics([createEmptyMetric()]);
    setSelectedDatasetId(preselectedDatasetId ?? null);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Create Test Suite</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Test Suite Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            multiline
            rows={2}
          />

          {/* Metrics */}
          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Metrics
            </Typography>
            <MetricEditor value={metrics} onChange={setMetrics} />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Dataset selection */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Dataset
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel>Select Dataset</InputLabel>
                <Select
                  value={selectedDatasetId ?? ""}
                  onChange={(e) =>
                    setSelectedDatasetId(e.target.value || null)
                  }
                  label="Select Dataset"
                >
                  {datasets.map((ds) => (
                    <MenuItem key={ds.id} value={ds.id}>
                      {ds.fileName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary">
                or
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setUploadDialogOpen(true)}
              >
                Upload New
              </Button>
            </Stack>
          </Box>

          {/* Dataset preview (shown when dataset selected) */}
          {selectedDatasetId && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />

              {schemaDisplay && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    Input Schema
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: "grey.50",
                      maxHeight: 200,
                      overflow: "auto",
                    }}
                  >
                    <Box
                      component="pre"
                      sx={{
                        m: 0,
                        fontSize: "0.8rem",
                        fontFamily: "monospace",
                      }}
                    >
                      {schemaDisplay}
                    </Box>
                  </Paper>
                </Box>
              )}

              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1 }}
              >
                Test Cases Preview
              </Typography>
              <Box sx={{ height: 300 }}>
                <DataGrid
                  rows={previewRows}
                  columns={previewColumns}
                  loading={entriesLoading}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                  }}
                  pageSizeOptions={[10]}
                  disableRowSelectionOnClick
                  density="compact"
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={
              !name.trim() ||
              !selectedDatasetId ||
              creating ||
              metrics.every((m) => !m.name.trim())
            }
          >
            {creating ? "Creating..." : "Create Test Suite"}
          </Button>
        </DialogActions>
      </Dialog>

      <DatasetUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onSuccess={(datasetId) => {
          setUploadDialogOpen(false);
          setSelectedDatasetId(datasetId);
        }}
      />
    </>
  );
}

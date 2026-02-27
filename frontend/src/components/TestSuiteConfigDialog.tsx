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
  FormControlLabel,
  Checkbox,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  Paper,
} from "@mui/material";
import { useQuery, useMutation } from "@apollo/client";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { sdkClient, remoteClient } from "../lib/apolloClient";
import { GET_DATASET, GET_DATA_ENTRIES } from "../graphql/sdk/query";
import { LINK_DATASET_TO_TEST_SUITE } from "../graphql/sdk/mutation";
import { CREATE_DATA_ADAPTOR } from "../graphql/remote/mutation";
import { DatasetUploadDialog } from "./DatasetUploadDialog";
import { MetricsAutocomplete } from "./MetricsAutocomplete";
import { DataAdaptorEditor } from "./DataAdaptorEditor";
import { useDatasets } from "../hooks/useDatasets";
import { useTestSuites } from "../hooks/useTestSuites";
import { computeOutputSchema, type AdaptorField } from "../lib/schemaUtils";
import type { Metric } from "../lib/metricUtils";

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
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(
    preselectedDatasetId ?? null,
  );
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Data adaptor state
  const [adaptorEnabled, setAdaptorEnabled] = useState(false);
  const [adaptorName, setAdaptorName] = useState("");
  const [adaptorFields, setAdaptorFields] = useState<AdaptorField[]>([]);

  const { datasets } = useDatasets();
  const { createTestSuite } = useTestSuites();
  const [linkMutation] = useMutation(LINK_DATASET_TO_TEST_SUITE, {
    client: sdkClient,
  });

  // Fetch selected dataset details
  const { data: datasetData } = useQuery(GET_DATASET, {
    client: sdkClient,
    variables: { id: selectedDatasetId! },
    skip: !selectedDatasetId,
  });

  // Fetch preview entries for selected dataset
  const { data: entriesData, loading: entriesLoading } = useQuery(
    GET_DATA_ENTRIES,
    {
      client: sdkClient,
      variables: { datasetId: selectedDatasetId!, offset: 0, limit: 10 },
      skip: !selectedDatasetId,
    },
  );

  useEffect(() => {
    if (preselectedDatasetId) {
      setSelectedDatasetId(preselectedDatasetId);
    }
  }, [preselectedDatasetId]);

  // Pre-fill adaptor name when dataset changes
  useEffect(() => {
    if (selectedDatasetId) {
      const ds = datasets.find((d) => d.id === selectedDatasetId);
      setAdaptorName(ds ? `from ${ds.fileName}` : "");
    }
    // Reset adaptor fields when dataset changes
    setAdaptorFields([]);
  }, [selectedDatasetId, datasets]);

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

  // Parse the raw dataset schema into a typed object
  const parsedInputSchema = useMemo<Record<string, unknown>>(() => {
    const raw = datasetData?.getDataset?.rowSchema;
    if (!raw) return {};
    return typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>);
  }, [datasetData]);

  // Compute the output schema when adaptor is enabled and has valid fields
  const adaptorOutputSchema = useMemo(() => {
    if (!adaptorEnabled || adaptorFields.length === 0) return null;
    const validFields = adaptorFields.filter(
      (f) => f.schemaPath && f.name.trim(),
    );
    if (validFields.length === 0) return null;
    return computeOutputSchema(parsedInputSchema, validFields);
  }, [adaptorEnabled, adaptorFields, parsedInputSchema]);

  // The effective input schema for the test suite:
  // adaptor output schema when adaptor is configured, otherwise raw dataset schema
  const effectiveInputSchema = useMemo(() => {
    if (adaptorEnabled && adaptorOutputSchema) return adaptorOutputSchema;
    return parsedInputSchema;
  }, [adaptorEnabled, adaptorOutputSchema, parsedInputSchema]);

  const effectiveSchemaDisplay = useMemo(() => {
    if (!Object.keys(effectiveInputSchema).length) return null;
    return JSON.stringify(effectiveInputSchema, null, 2);
  }, [effectiveInputSchema]);

  const handleCreate = async () => {
    if (!selectedDatasetId) return;
    setCreating(true);
    try {
      const metricIds = selectedMetrics.map((m) => m.id as string);

      // Use effective schema (adaptor output or raw dataset schema)
      const inputSchema = effectiveInputSchema;

      const id = await createTestSuite({
        name: name.trim(),
        description: description.trim(),
        metricIds,
        datasetId: selectedDatasetId,
        inputSchema,
      });

      // Auto-link the dataset to the newly created test suite
      await linkMutation({
        variables: {
          datasetId: selectedDatasetId,
          testSuiteId: id,
        },
      });

      // Create data adaptor if enabled with valid fields
      if (adaptorEnabled && adaptorFields.some((f) => f.schemaPath && f.name.trim())) {
        const validFields = adaptorFields.filter(
          (f) => f.schemaPath && f.name.trim(),
        );
        await remoteClient.mutate({
          mutation: CREATE_DATA_ADAPTOR,
          variables: {
            name: adaptorName.trim() || "from dataset",
            testSuiteId: id,
            config: {
              inputSchema: parsedInputSchema,
              fields: validFields.map((f) => ({
                name: f.name,
                schema_path: f.schemaPath,
                ...(f.description ? { description: f.description } : {}),
              })),
              metadata: { dataset_id: selectedDatasetId },
            },
          },
        });
      }

      onSuccess?.(id);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setSelectedMetrics([]);
    setSelectedDatasetId(preselectedDatasetId ?? null);
    setAdaptorEnabled(false);
    setAdaptorName("");
    setAdaptorFields([]);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Create Evaluation</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Evaluation Name"
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
            <MetricsAutocomplete
              value={selectedMetrics}
              onChange={setSelectedMetrics}
            />
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

          {/* Dataset preview and adaptor config (shown when dataset selected) */}
          {selectedDatasetId && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />

              {/* Data Adaptor toggle and editor */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={adaptorEnabled}
                    onChange={(e) => setAdaptorEnabled(e.target.checked)}
                  />
                }
                label="Configure Data Adaptor"
                sx={{ mb: 1 }}
              />

              {adaptorEnabled && Object.keys(parsedInputSchema).length > 0 && (
                <Paper
                  variant="outlined"
                  sx={{ p: 2, mb: 2, borderRadius: 2 }}
                >
                  <DataAdaptorEditor
                    inputSchema={parsedInputSchema}
                    fields={adaptorFields}
                    onChange={setAdaptorFields}
                    name={adaptorName}
                    onNameChange={setAdaptorName}
                  />
                </Paper>
              )}

              {/* Effective Input Schema */}
              {effectiveSchemaDisplay && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    {adaptorEnabled && adaptorOutputSchema
                      ? "Transformed Input Schema"
                      : "Input Schema"}
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
                      {effectiveSchemaDisplay}
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
              selectedMetrics.length === 0 ||
              (adaptorEnabled &&
                (!adaptorName.trim() ||
                  !adaptorFields.some((f) => f.schemaPath && f.name.trim())))
            }
          >
            {creating ? "Creating..." : "Create Evaluation"}
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

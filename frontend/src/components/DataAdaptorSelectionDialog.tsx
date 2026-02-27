import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Alert,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  CircularProgress,
  Divider,
} from "@mui/material";
import { useDataAdaptors, parseAdaptorConfig, findAdaptorForDataset } from "../hooks/useDataAdaptors";
import { DataAdaptorEditor } from "./DataAdaptorEditor";
import { areSchemasCompatible, type AdaptorField } from "../lib/schemaUtils";

interface DataAdaptorSelectionDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Called when the dialog should close (cancel). */
  onClose: () => void;
  /** Called when the user completes adaptor selection/creation and wants to proceed. */
  onComplete: () => void;
  /** The test suite ID to link the dataset to. */
  testSuiteId: string;
  /** The dataset ID for metadata association. */
  datasetId: string;
  /** The dataset's row schema (JSON Schema object). */
  datasetSchema: Record<string, unknown>;
  /** The dataset file name (for pre-filling adaptor name). */
  datasetFileName: string;
}

/**
 * Dialog for selecting or creating a data adaptor when schema incompatibility
 * is detected between a dataset and a test suite.
 *
 * Shows:
 * - An alert explaining the incompatibility
 * - A list of existing compatible adaptors for the test suite (auto-selects
 *   one matching the current dataset if available)
 * - An option to create a new adaptor
 */
export function DataAdaptorSelectionDialog({
  open,
  onClose,
  onComplete,
  testSuiteId,
  datasetId,
  datasetSchema,
  datasetFileName,
}: DataAdaptorSelectionDialogProps) {
  const { adaptors, loading, createDataAdaptor } = useDataAdaptors(testSuiteId);
  const [mode, setMode] = useState<"select" | "create">("select");
  const [selectedAdaptorId, setSelectedAdaptorId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // State for creating new adaptor
  const [adaptorName, setAdaptorName] = useState(`from ${datasetFileName}`);
  const [adaptorFields, setAdaptorFields] = useState<AdaptorField[]>([]);

  // Filter adaptors by input schema compatibility
  const compatibleAdaptors = useMemo(() => {
    return adaptors.filter((a) => {
      const config = parseAdaptorConfig(a.config);
      if (!config) return false;
      return areSchemasCompatible(datasetSchema, config.inputSchema);
    });
  }, [adaptors, datasetSchema]);

  // Auto-select adaptor matching this dataset, or first compatible one
  useEffect(() => {
    if (compatibleAdaptors.length === 0) {
      setMode("create");
      return;
    }

    const datasetMatch = findAdaptorForDataset(compatibleAdaptors, datasetId);
    if (datasetMatch) {
      setSelectedAdaptorId(datasetMatch.id as string);
      setMode("select");
    } else if (compatibleAdaptors.length > 0) {
      setSelectedAdaptorId(compatibleAdaptors[0]!.id as string);
      setMode("select");
    }
  }, [compatibleAdaptors, datasetId]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setAdaptorName(`from ${datasetFileName}`);
      setAdaptorFields([]);
      setSaving(false);
    }
  }, [open, datasetFileName]);

  const canSave =
    mode === "select"
      ? !!selectedAdaptorId
      : adaptorName.trim() &&
        adaptorFields.some((f) => f.schemaPath && f.name.trim());

  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === "create") {
        const validFields = adaptorFields.filter(
          (f) => f.schemaPath && f.name.trim(),
        );
        await createDataAdaptor({
          name: adaptorName.trim(),
          inputSchema: datasetSchema,
          fields: validFields,
          datasetId,
        });
      }
      // In "select" mode, the adaptor already exists — no action needed
      // since the adaptor ↔ dataset association is through metadata.
      // If the selected adaptor doesn't have metadata for this dataset,
      // that's acceptable — the key link is adaptor ↔ test suite.
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Data Adaptor Required</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          The dataset schema is not compatible with the evaluation&apos;s input
          schema. A data adaptor is required to map the dataset fields to the
          expected format.
        </Alert>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {compatibleAdaptors.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Select Existing Adaptor
                </Typography>
                <RadioGroup
                  value={mode === "select" ? selectedAdaptorId : ""}
                  onChange={(e) => {
                    setSelectedAdaptorId(e.target.value);
                    setMode("select");
                  }}
                >
                  {compatibleAdaptors.map((a) => (
                    <FormControlLabel
                      key={a.id as string}
                      value={a.id as string}
                      control={<Radio />}
                      label={
                        <Stack>
                          <Typography variant="body2">{a.name}</Typography>
                          {a.description && (
                            <Typography variant="caption" color="text.secondary">
                              {a.description}
                            </Typography>
                          )}
                        </Stack>
                      }
                    />
                  ))}
                </RadioGroup>

                <Divider sx={{ my: 2 }} />
              </>
            )}

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              {compatibleAdaptors.length > 0
                ? "Or Create New Adaptor"
                : "Create New Adaptor"}
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                cursor: mode === "create" ? "default" : "pointer",
                borderColor: mode === "create" ? "primary.main" : undefined,
              }}
              onClick={() => setMode("create")}
            >
              {mode === "create" ? (
                <DataAdaptorEditor
                  inputSchema={datasetSchema}
                  fields={adaptorFields}
                  onChange={setAdaptorFields}
                  name={adaptorName}
                  onNameChange={setAdaptorName}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Click to configure a new data adaptor for this dataset.
                </Typography>
              )}
            </Paper>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!canSave || saving}
        >
          {saving ? "Saving..." : "Continue"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

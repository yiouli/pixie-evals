import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stack,
  Chip,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import { useSubscription } from "@apollo/client";
import { sdkClient } from "../lib/apolloClient";
import { IMPORT_TEST_CASES_PROGRESS } from "../graphql/sdk/subscription";
import { CreationStatus } from "../generated/sdk/graphql";
import { useDatasets } from "../hooks/useDatasets";

interface ImportTestCasesDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Called when the dialog should close. */
  onClose: () => void;
  /** UUID of the remote test suite to import into. */
  testSuiteId: string;
  /** Called when import completes successfully. */
  onComplete?: () => void;
}

/**
 * Import test cases dialog.
 *
 * Lets the user pick a local dataset, then subscribes to the
 * import_test_cases_progress subscription on the SDK server to
 * embed and upload entries as test cases to an existing test suite.
 */
export function ImportTestCasesDialog({
  open,
  onClose,
  testSuiteId,
  onComplete,
}: ImportTestCasesDialogProps) {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(
    null,
  );
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<CreationStatus | null>(null);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const completeCalled = useRef(false);

  const { datasets } = useDatasets();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedDatasetId(null);
      setImporting(false);
      setStatus(null);
      setMessage("");
      setProgress(0);
      completeCalled.current = false;
    }
  }, [open]);

  // Subscribe to import progress
  const { error: subscriptionError } = useSubscription(
    IMPORT_TEST_CASES_PROGRESS,
    {
      client: sdkClient,
      variables: {
        datasetId: selectedDatasetId!,
        testSuiteId,
      },
      skip: !importing || !selectedDatasetId,
      onData: ({ data: subData }) => {
        const update = subData?.data?.importTestCasesProgress;
        if (!update) return;
        setStatus(update.status);
        setMessage(update.message);
        setProgress(update.progress * 100);
      },
    },
  );

  // Notify parent when import completes
  useEffect(() => {
    if (status === CreationStatus.Complete && !completeCalled.current) {
      completeCalled.current = true;
      onComplete?.();
    }
  }, [status, onComplete]);

  const handleImport = () => {
    if (!selectedDatasetId) return;
    completeCalled.current = false;
    setImporting(true);
    setMessage("Starting import...");
    setProgress(0);
    setStatus(null);
  };

  const isRunning =
    importing &&
    status !== CreationStatus.Complete &&
    status !== CreationStatus.Error;
  const isComplete = status === CreationStatus.Complete;
  const isError = status === CreationStatus.Error;

  const handleClose = useCallback(() => {
    if (isRunning) return;
    onClose();
  }, [isRunning, onClose]);

  return (
    <Dialog
      open={open}
      onClose={isRunning ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" component="span">
            Import Test Cases
          </Typography>
          {isComplete && (
            <Chip
              icon={<CheckCircleRoundedIcon />}
              label="Complete"
              color="success"
              size="small"
            />
          )}
          {isError && (
            <Chip
              icon={<ErrorRoundedIcon />}
              label="Error"
              color="error"
              size="small"
            />
          )}
        </Stack>
      </DialogTitle>
      <DialogContent>
        {!importing ? (
          /* Dataset selection */
          <Box sx={{ mt: 1 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              Select a dataset to import test cases from. Entries will be
              embedded and uploaded to this test suite.
            </Typography>
            <FormControl fullWidth size="small">
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
          </Box>
        ) : (
          /* Progress view */
          <Box sx={{ py: 2 }}>
            {subscriptionError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Connection error: {subscriptionError.message}
              </Alert>
            )}
            <Typography
              variant="body2"
              color="text.secondary"
              gutterBottom
            >
              {message || "Starting import..."}
            </Typography>
            <LinearProgress
              variant={
                isRunning && progress === 0 ? "indeterminate" : "determinate"
              }
              value={progress}
              sx={{ height: 8, borderRadius: 4, mb: 1 }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              {progress.toFixed(0)}% complete
            </Typography>
            {isComplete && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {message}
              </Alert>
            )}
            {isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {message}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!importing ? (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!selectedDatasetId}
            >
              Import
            </Button>
          </>
        ) : (
          <Button
            onClick={handleClose}
            disabled={isRunning}
            variant={isComplete ? "contained" : "outlined"}
          >
            {isComplete ? "Done" : isError ? "Close" : "Importing..."}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

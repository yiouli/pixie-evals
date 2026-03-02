import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  LinearProgress,
  Stack,
  Chip,
  Alert,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import { useSubscription } from "@apollo/client";
import { sdkClient } from "../lib/apolloClient";
import { OptimizationStatus } from "../generated/sdk/graphql";
import { OPTIMIZE_EVALUATOR } from "../graphql/sdk/subscription";

interface OptimizationDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Called when the dialog should close. */
  onClose: () => void;
  /** UUID of the remote test suite to optimize. */
  testSuiteId: string;
}

/**
 * Evaluator optimization progress dialog.
 *
 * Subscribes to the optimize_evaluator GraphQL subscription on the local
 * SDK server. Displays a progress bar and status messages as the DSPy
 * optimization runs.
 */
export function OptimizationDialog({
  open,
  onClose,
  testSuiteId,
}: OptimizationDialogProps) {
  const [status, setStatus] = useState<OptimizationStatus>(OptimizationStatus.Loading);
  const [message, setMessage] = useState("Starting optimization...");
  const [progress, setProgress] = useState(0);
  const [evaluatorId, setEvaluatorId] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStatus(OptimizationStatus.Loading);
      setMessage("Starting optimization...");
      setProgress(0);
      setEvaluatorId(null);
    }
  }, [open]);

  // Subscribe to optimization updates
  const { error: subscriptionError } = useSubscription(
    OPTIMIZE_EVALUATOR,
    {
      client: sdkClient,
      variables: { testSuiteId },
      skip: !open || !testSuiteId,
      onData: ({ data: subData }) => {
        const update = subData?.data?.optimizeEvaluator;
        if (!update) return;

        setStatus(update.status);
        setMessage(update.message);
        setProgress(update.progress * 100);
        if (update.evaluatorId) {
          setEvaluatorId(update.evaluatorId);
        }
      },
    },
  );

  const isRunning =
    status === OptimizationStatus.Loading ||
    status === OptimizationStatus.Preparing ||
    status === OptimizationStatus.Optimizing ||
    status === OptimizationStatus.Saving;
  const isComplete = status === OptimizationStatus.Complete;
  const isError = status === OptimizationStatus.Error;

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

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
            Optimize Evaluator
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
        {/* Subscription error */}
        {subscriptionError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Connection error: {subscriptionError.message}
          </Alert>
        )}

        {/* Progress bar */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {message}
          </Typography>
          <LinearProgress
            variant={
              isRunning && progress === 0 ? "indeterminate" : "determinate"
            }
            value={progress}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.5, display: "block" }}
          >
            {progress.toFixed(0)}% complete
          </Typography>
        </Box>

        {/* Completion info */}
        {isComplete && evaluatorId && (
          <Alert severity="success" sx={{ mb: 2 }}>
            New evaluator created successfully.
          </Alert>
        )}

        {/* Status info */}
        {isRunning && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Optimization may take several minutes. Please keep this dialog open.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant={isRunning ? "outlined" : "contained"}
          color={isRunning ? "error" : "primary"}
          onClick={handleClose}
        >
          {isRunning ? "Cancel" : "Close"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

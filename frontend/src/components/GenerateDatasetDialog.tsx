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
  Stack,
  TextField,
  Alert,
  Chip,
  Paper,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { useSubscription, useMutation } from "@apollo/client";
import { remoteClient, sdkClient } from "../lib/apolloClient";
import { GENERATE_DATASET } from "../graphql/remote/subscription";
import {
  SEND_DATASET_GENERATION_FEEDBACK,
  ADD_TEST_CASES,
} from "../graphql/remote/mutation";
import { CREATE_DATASET, ADD_DATA_ENTRY } from "../graphql/sdk/mutation";
import { DatasetGenerationStatusEnum } from "../generated/remote/graphql";

interface GenerateDatasetDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Called when the dialog should close. */
  onClose: () => void;
  /** UUID of the remote test suite to generate data for. */
  testSuiteId: string;
  /** Called after generation completes successfully. */
  onComplete?: () => void;
}

type Phase = "form" | "running" | "awaiting_feedback" | "complete" | "error";

/**
 * Dialog for AI-powered dataset generation.
 *
 * Walks the user through:
 * 1. Input form (name, size, description)
 * 2. Subscription to remote server for AI generation
 * 3. Plan review and approval
 * 4. Progress tracking as entries are generated
 * 5. Creates local dataset + entries in SDK server
 * 6. Creates test cases on remote server
 */
export function GenerateDatasetDialog({
  open,
  onClose,
  testSuiteId,
  onComplete,
}: GenerateDatasetDialogProps) {
  // Form state
  const [name, setName] = useState("");
  const [size, setSize] = useState(10);
  const [description, setDescription] = useState("");

  // Subscription state
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [, setStatus] = useState<DatasetGenerationStatusEnum | null>(null);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [plan, setPlan] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  /** Accumulated error messages from individual entry generation failures. */
  const [generationErrors, setGenerationErrors] = useState<string[]>([]);

  // Local dataset tracking
  const localDatasetIdRef = useRef<string | null>(null);
  /** Whether the local dataset has been created yet (deferred to first success). */
  const datasetCreatedRef = useRef(false);
  const [entriesAdded, setEntriesAdded] = useState(0);

  // Mutations
  const [sendFeedback] = useMutation(SEND_DATASET_GENERATION_FEEDBACK, {
    client: remoteClient,
  });
  const [addTestCases] = useMutation(ADD_TEST_CASES, {
    client: remoteClient,
  });
  const [createDataset] = useMutation(CREATE_DATASET, {
    client: sdkClient,
  });
  const [addDataEntry] = useMutation(ADD_DATA_ENTRY, {
    client: sdkClient,
  });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setName("");
      setSize(10);
      setDescription("");
      setStarted(false);
      setPhase("form");
      setStatus(null);
      setMessage("");
      setProgress(0);
      setPlan(null);
      setSessionId(null);
      setTotal(0);
      setCompleted(0);
      setErrorMsg(null);
      setFeedback("");
      setGenerationErrors([]);
      localDatasetIdRef.current = null;
      datasetCreatedRef.current = false;
      setEntriesAdded(0);
    }
  }, [open]);

  /**
   * Create a local dataset in the SDK server.
   * Called lazily on the first successful entry generation.
   */
  const ensureLocalDataset = useCallback(
    async (schema: Record<string, unknown>) => {
      if (datasetCreatedRef.current) return;
      datasetCreatedRef.current = true;
      try {
        const result = await createDataset({
          variables: {
            name,
            rowSchema: schema,
            testSuiteId,
            description: description || undefined,
          },
        });
        const dsId = result.data?.createDataset?.id;
        if (dsId) {
          localDatasetIdRef.current = String(dsId);
        }
      } catch (err) {
        console.error("Failed to create local dataset:", err);
      }
    },
    [createDataset, name, testSuiteId, description],
  );

  /**
   * Add a generated entry to both the local SDK dataset and the remote
   * test suite as a test case. On the first call, the local dataset is
   * created (deferred to avoid empty datasets when all entries fail).
   */
  const processGeneratedEntry = useCallback(
    async (entry: Record<string, unknown>) => {
      // Lazily create the local dataset on the first successful entry
      await ensureLocalDataset({ type: "object" });

      // Add to local SDK dataset
      if (localDatasetIdRef.current) {
        try {
          await addDataEntry({
            variables: {
              datasetId: localDatasetIdRef.current,
              data: entry,
            },
          });
          setEntriesAdded((prev) => prev + 1);
        } catch (err) {
          console.error("Failed to add local data entry:", err);
        }
      }

      // Add as test case on remote server (with empty embedding — server will compute)
      try {
        await addTestCases({
          variables: {
            testSuiteId,
            testCases: [
              {
                embedding: [],
                description: JSON.stringify(entry),
              },
            ],
          },
        });
      } catch (err) {
        console.error("Failed to add remote test case:", err);
      }
    },
    [addDataEntry, addTestCases, testSuiteId, ensureLocalDataset],
  );

  // Subscribe to remote dataset generation
  const { error: subscriptionError } = useSubscription(GENERATE_DATASET, {
    client: remoteClient,
    variables: {
      testSuiteId,
      size,
      description: description || name,
    },
    skip: !open || !started,
    onData: ({ data: subData }) => {
      const update = subData?.data?.generateDataset;
      if (!update) return;

      setStatus(update.status);
      setMessage(update.message);
      setProgress(update.progress * 100);
      if (update.sessionId) setSessionId(update.sessionId);
      if (update.total != null) setTotal(update.total);
      if (update.completed != null) setCompleted(update.completed);

      switch (update.status) {
        case DatasetGenerationStatusEnum.Planning:
        case DatasetGenerationStatusEnum.GeneratingDescriptions:
          setPhase("running");
          break;

        case DatasetGenerationStatusEnum.AwaitingFeedback:
          setPhase("awaiting_feedback");
          if (update.plan) setPlan(update.plan);
          break;

        case DatasetGenerationStatusEnum.GeneratingData:
        case DatasetGenerationStatusEnum.Saving:
          setPhase("running");
          // Track individual entry generation errors
          if (
            update.message &&
            update.message.toLowerCase().startsWith("error generating")
          ) {
            setGenerationErrors((prev) => [...prev, update.message]);
          }
          // Process generated entry if present
          if (
            update.generatedEntry &&
            typeof update.generatedEntry === "object"
          ) {
            void processGeneratedEntry(
              update.generatedEntry as Record<string, unknown>,
            );
          }
          break;

        case DatasetGenerationStatusEnum.Complete:
          setPhase("complete");
          onComplete?.();
          break;

        case DatasetGenerationStatusEnum.Error:
          setPhase("error");
          setErrorMsg(update.message);
          break;
      }
    },
  });

  /** Start the generation by enabling the subscription. */
  const handleStart = useCallback(() => {
    if (!name.trim() || !description.trim()) return;
    setStarted(true);
    setPhase("running");
    setMessage("Connecting to AI generation service...");
  }, [name, description]);

  /** Approve the plan and proceed with generation. */
  const handleApprovePlan = useCallback(async () => {
    if (!sessionId) return;
    // Dataset creation is deferred to the first successful entry
    try {
      await sendFeedback({
        variables: { sessionId, feedback: "proceed" },
      });
      setPhase("running");
      setMessage("Plan approved. Generating data...");
    } catch (err) {
      setErrorMsg(
        `Failed to send feedback: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, [sessionId, sendFeedback]);

  /** Send user feedback on the plan. */
  const handleSendFeedback = useCallback(async () => {
    if (!sessionId || !feedback.trim()) return;
    try {
      await sendFeedback({
        variables: { sessionId, feedback },
      });
      setFeedback("");
      setPhase("running");
      setMessage("Feedback sent. Regenerating plan...");
    } catch (err) {
      setErrorMsg(
        `Failed to send feedback: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, [sessionId, feedback, sendFeedback]);

  const isRunning = phase === "running" || phase === "awaiting_feedback";
  const isComplete = phase === "complete";
  const isError = phase === "error";
  const isForm = phase === "form";

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onClose={isRunning ? undefined : handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AutoAwesomeRoundedIcon color="primary" />
          <Typography variant="h6" component="span">
            Generate Dataset with AI
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

        {/* Error message */}
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2, whiteSpace: "pre-wrap" }}>
            {errorMsg}
          </Alert>
        )}

        {/* Individual entry generation errors */}
        {generationErrors.length > 0 && !isError && (
          <Alert
            severity="warning"
            sx={{ mb: 2, maxHeight: 150, overflow: "auto" }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {generationErrors.length} entr
              {generationErrors.length === 1 ? "y" : "ies"} failed to generate:
            </Typography>
            {generationErrors.map((err, i) => (
              <Typography key={i} variant="body2" sx={{ mt: 0.5 }}>
                {err}
              </Typography>
            ))}
          </Alert>
        )}

        {/* PHASE: Form Input */}
        {isForm && (
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              Generate a synthetic dataset using AI. Provide a name, desired
              number of entries, and a description of the data you want.
            </Typography>
            <TextField
              label="Dataset Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              placeholder="e.g. Customer Support Conversations"
            />
            <TextField
              label="Number of Entries"
              type="number"
              value={size}
              onChange={(e) =>
                setSize(Math.max(1, parseInt(e.target.value) || 1))
              }
              required
              fullWidth
              slotProps={{
                htmlInput: { min: 1, max: 1000 },
              }}
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              fullWidth
              multiline
              rows={3}
              placeholder="Describe the kind of data entries you want generated..."
            />
          </Stack>
        )}

        {/* PHASE: Running / Progress */}
        {!isForm && (
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
            <Stack
              direction="row"
              justifyContent="space-between"
              sx={{ mt: 0.5 }}
            >
              <Typography variant="caption" color="text.secondary">
                {progress.toFixed(0)}% complete
              </Typography>
              {total > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {completed} / {total} entries
                </Typography>
              )}
            </Stack>
          </Box>
        )}

        {/* PHASE: Plan Review / Awaiting Feedback */}
        {phase === "awaiting_feedback" && plan && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Generation Plan
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mb: 2 }}>
              {plan}
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Feedback (optional)"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                fullWidth
                multiline
                rows={2}
                placeholder="Provide feedback to refine the plan, or approve to proceed..."
                size="small"
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleApprovePlan}
                >
                  Approve & Generate
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleSendFeedback}
                  disabled={!feedback.trim()}
                >
                  Send Feedback
                </Button>
              </Stack>
            </Stack>
          </Paper>
        )}

        {/* Summary stats */}
        {!isForm && (
          <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
            {total > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Target Entries
                </Typography>
                <Typography variant="h6">{total}</Typography>
              </Box>
            )}
            {entriesAdded > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Saved Locally
                </Typography>
                <Typography variant="h6" color="success.main">
                  {entriesAdded}
                </Typography>
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {isForm ? (
          <>
            <Button variant="text" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleStart}
              disabled={!name.trim() || !description.trim()}
              startIcon={<AutoAwesomeRoundedIcon />}
            >
              Generate
            </Button>
          </>
        ) : (
          <Button
            variant={isRunning ? "outlined" : "contained"}
            color={isRunning ? "error" : "primary"}
            onClick={handleClose}
          >
            {isRunning ? "Cancel" : "Close"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

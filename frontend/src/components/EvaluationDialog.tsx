import { useState, useEffect, useMemo, useCallback } from "react";
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
  Paper,
  Chip,
  Alert,
  Collapse,
  IconButton,
  Tooltip,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import { useSubscription } from "@apollo/client";
import { sdkClient } from "../lib/apolloClient";
import { EVALUATE_DATASET } from "../graphql/sdk/subscription";
import { EvaluationResultItem } from "@/generated/sdk/graphql";


/** Accumulated statistics for a metric across all results. */
interface MetricStats {
  count: number;
  sum: number;
  values: unknown[];
}
interface EvaluationDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Called when the dialog should close. */
  onClose: () => void;
  /** UUID of the local dataset to evaluate. */
  datasetId: string;
  /** Metrics to show statistics for. */
  metrics?: Array<{ id: string; name: string; config?: unknown }>;
}

/**
 * AI Evaluation progress dialog.
 *
 * Subscribes to the evaluate_dataset GraphQL subscription on the local
 * SDK server. Displays a progress bar, per-metric statistics, and
 * individual result cards as they stream in.
 */
export function EvaluationDialog({
  open,
  onClose,
  datasetId,
  metrics = [],
}: EvaluationDialogProps) {
  const [results, setResults] = useState<EvaluationResultItem[]>([]);
  const [status, setStatus] = useState<string>("loading");
  const [message, setMessage] = useState("Starting evaluation...");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setResults([]);
      setStatus("loading");
      setMessage("Starting evaluation...");
      setProgress(0);
      setTotal(0);
      setCompleted(0);
      setShowDetails(false);
    }
  }, [open]);

  // Subscribe to evaluation updates
  // EVALUATE_DATASET is typed as `unknown` until `pnpm codegen` is re-run
  // against a running SDK server that exposes the new subscription.
  const { error: subscriptionError } = useSubscription(
    EVALUATE_DATASET,
    {
      client: sdkClient,
      variables: { datasetId },
      skip: !open || !datasetId,
      onData: ({ data: subData }) => {
        const update = subData?.data?.evaluateDataset;
        if (!update) return;

        setStatus(update.status);
        setMessage(update.message);
        setProgress(update.progress * 100);
        if (update.total) setTotal(update.total);
        if (update.completed != null) setCompleted(update.completed);

        // Accumulate results from each batch
        if (update.results && update.results.length > 0) {
          setResults((prev) => [
            ...prev,
            ...update.results!.map(
              (r) => ({
                entryId: r.entryId,
                output: (typeof r.output === "object" && r.output !== null
                  ? r.output
                  : {}) as Record<string, unknown>,
                error: r.error,
              }),
            ),
          ]);
        }
      },
    },
  );

  // Compute per-metric statistics from accumulated results
  const metricStats = useMemo(() => {
    const stats: Record<string, MetricStats> = {};

    for (const result of results) {
      if (result.error) continue;
      for (const [key, value] of Object.entries(result.output)) {
        if (!stats[key]) {
          stats[key] = { count: 0, sum: 0, values: [] };
        }
        stats[key].count += 1;
        stats[key].values.push(value);
        if (typeof value === "number") {
          stats[key].sum += value;
        }
      }
    }

    return stats;
  }, [results]);

  const isRunning =
    status === "loading" || status === "evaluating" || status === "saving";
  const isComplete = status === "complete";
  const isError = status === "error";
  const successCount = results.filter((r) => !r.error).length;
  const errorCount = results.filter((r) => r.error).length;

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
          <Typography variant="h6" component="span">
            AI Evaluation
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

        {/* Summary stats */}
        {results.length > 0 && (
          <Stack direction="row" spacing={3} sx={{ mb: 3 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Evaluated
              </Typography>
              <Typography variant="h6">{results.length}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Successful
              </Typography>
              <Typography variant="h6" color="success.main">
                {successCount}
              </Typography>
            </Box>
            {errorCount > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Errors
                </Typography>
                <Typography variant="h6" color="error.main">
                  {errorCount}
                </Typography>
              </Box>
            )}
          </Stack>
        )}

        {/* Per-metric statistics */}
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Metrics Statistics
          </Typography>
          {Object.keys(metricStats).length > 0 ? (
            Object.entries(metricStats).map(([metricName, stats]) => {
              const metricInfo = metrics.find((m) => m.name === metricName);
              const displayName = metricInfo?.name ?? metricName;
              const avg = stats.count > 0 ? stats.sum / stats.count : 0;
              const isNumeric = stats.values.every(
                (v) => typeof v === "number",
              );

              // Compute std dev for numeric metrics
              let stdDev = 0;
              if (isNumeric && stats.count > 1) {
                const mean = stats.sum / stats.count;
                const variance =
                  (stats.values as number[]).reduce(
                    (acc, v) => acc + (v - mean) ** 2,
                    0,
                  ) / stats.count;
                stdDev = Math.sqrt(variance);
              }

              // Category distribution
              const categoryDist: Record<string, number> = {};
              if (!isNumeric) {
                for (const v of stats.values) {
                  const key = String(v);
                  categoryDist[key] = (categoryDist[key] ?? 0) + 1;
                }
              }

              return (
                <Paper
                  key={metricName}
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2 }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {displayName}
                  </Typography>
                  <Stack direction="row" spacing={4} sx={{ mt: 1 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Evaluated
                      </Typography>
                      <Typography variant="h6">{stats.count}</Typography>
                    </Box>
                    {isNumeric ? (
                      <>
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Avg Score
                          </Typography>
                          <Typography variant="h6">
                            {avg.toFixed(2)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Std Dev
                          </Typography>
                          <Typography variant="h6">
                            {stdDev.toFixed(2)}
                          </Typography>
                        </Box>
                      </>
                    ) : (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Distribution
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          flexWrap="wrap"
                          useFlexGap
                          sx={{ mt: 0.5 }}
                        >
                          {Object.entries(categoryDist).map(([cat, count]) => (
                            <Chip
                              key={cat}
                              label={`${cat}: ${count}`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              );
            })
          ) : (
            <Typography variant="body2" color="text.secondary">
              {isRunning
                ? "Waiting for results..."
                : "No metrics data available"}
            </Typography>
          )}
        </Stack>

        {/* Expandable result details */}
        {results.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ cursor: "pointer" }}
              onClick={() => setShowDetails((prev) => !prev)}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Individual Results ({results.length})
              </Typography>
              <Tooltip title={showDetails ? "Collapse" : "Expand"}>
                <IconButton size="small">
                  {showDetails ? (
                    <ExpandLessRoundedIcon fontSize="small" />
                  ) : (
                    <ExpandMoreRoundedIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </Stack>
            <Collapse in={showDetails}>
              <Stack
                spacing={1}
                sx={{ mt: 1, maxHeight: 300, overflowY: "auto" }}
              >
                {results.map((result, idx) => (
                  <Paper
                    key={`${result.entryId}-${idx}`}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      borderColor: result.error ? "error.main" : "divider",
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="caption" color="text.secondary">
                        Entry: {result.entryId.slice(0, 8)}...
                      </Typography>
                      {result.error ? (
                        <Chip label="Error" color="error" size="small" />
                      ) : (
                        <Chip label="OK" color="success" size="small" />
                      )}
                    </Stack>
                    {result.error ? (
                      <Typography
                        variant="body2"
                        color="error.main"
                        sx={{ mt: 0.5 }}
                      >
                        {result.error}
                      </Typography>
                    ) : (
                      <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                        {Object.entries(result.output).map(([key, val]) => (
                          <Box key={key}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {key}
                            </Typography>
                            <Typography variant="body2">
                              {typeof val === "object"
                                ? JSON.stringify(val)
                                : String(val ?? "-")}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                ))}
              </Stack>
            </Collapse>
          </Box>
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

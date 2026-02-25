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
} from "@mui/material";

interface EvaluationDialogProps {
  open: boolean;
  onClose: () => void;
  /** Metrics to show statistics for. */
  metrics?: Array<{ id: string; name: string }>;
}

/**
 * AI Evaluation progress dialog.
 *
 * Shows updating statistics per metric and a linear progress bar.
 * For now the server endpoint doesn't exist, so this renders the
 * shell UI without live data or progress updates.
 */
export function EvaluationDialog({
  open,
  onClose,
  metrics = [],
}: EvaluationDialogProps) {
  // TODO: Connect to real evaluation progress endpoint
  const progress = 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>AI Evaluation</DialogTitle>
      <DialogContent>
        {/* Progress bar */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Evaluation progress
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.5, display: "block" }}
          >
            {progress}% complete
          </Typography>
        </Box>

        {/* Per-metric statistics */}
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Metrics Statistics
          </Typography>
          {metrics.length > 0 ? (
            metrics.map((metric) => (
              <Paper
                key={metric.id}
                variant="outlined"
                sx={{ p: 2, borderRadius: 2 }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {metric.name}
                </Typography>
                <Stack direction="row" spacing={4} sx={{ mt: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Evaluated
                    </Typography>
                    <Typography variant="h6">-</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Avg Score
                    </Typography>
                    <Typography variant="h6">-</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Std Dev
                    </Typography>
                    <Typography variant="h6">-</Typography>
                  </Box>
                </Stack>
              </Paper>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No metrics configured
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" color="error" onClick={onClose}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}

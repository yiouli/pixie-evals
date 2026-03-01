import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  TextField,
  Typography,
  Slider,
  Stack,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import { SDK_BASE_URL } from "../lib/env";
import { useAuthStore } from "../lib/store";

interface ManualLabelingDialogProps {
  open: boolean;
  onClose: () => void;
  /** Remote test case UUID to render in the labeling iframe. */
  testCaseId?: string;
  /** Metrics configured for the test suite. */
  metrics?: Array<{ id: string; name: string }>;
  /** Called when user saves ratings. */
  onSave?: (ratings: Record<string, number>, notes: string) => void;
  /** Called when user skips the current candidate. */
  onSkip?: () => void;
}

/**
 * Manual labeling dialog.
 *
 * Fetches the labeling HTML from the SDK server using the standard
 * Authorization header and renders it via iframe srcdoc. Below the
 * iframe, displays one rating slider per metric, an optional notes
 * field, and Save/Skip buttons.
 */
export function ManualLabelingDialog({
  open,
  onClose,
  testCaseId,
  metrics = [],
  onSave,
  onSkip,
}: ManualLabelingDialogProps) {
  const token = useAuthStore((state) => state.token);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");

  // Fetch labeling HTML from SDK server with Authorization header
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!testCaseId || !open) {
      setHtmlContent(null);
      setFetchError(null);
      return;
    }

    setFetchLoading(true);
    setFetchError(null);

    fetch(`${SDK_BASE_URL}/labeling/${testCaseId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res
            .json()
            .catch(() => ({ detail: res.statusText }));
          throw new Error(body.detail || res.statusText);
        }
        return res.text();
      })
      .then((html) => {
        setHtmlContent(html);
        setFetchLoading(false);
      })
      .catch((err: Error) => {
        setFetchError(err.message);
        setFetchLoading(false);
      });
  }, [testCaseId, token, open]);

  const handleRatingChange = (metricId: string, value: number) => {
    setRatings((prev) => ({ ...prev, [metricId]: value }));
  };

  const handleSave = () => {
    onSave?.(ratings, notes);
    resetForm();
  };

  const handleSkip = () => {
    onSkip?.();
    resetForm();
  };

  const resetForm = () => {
    setRatings({});
    setNotes("");
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Manual Labeling</DialogTitle>
      <DialogContent>
        {/* SDK labeling iframe */}
        {testCaseId ? (
          <Box sx={{ mb: 3 }}>
            {fetchLoading ? (
              <Box
                sx={{
                  width: "100%",
                  height: "400px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CircularProgress size={32} />
              </Box>
            ) : fetchError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {fetchError}
              </Alert>
            ) : htmlContent ? (
              <iframe
                srcDoc={htmlContent}
                title="Labeling UI"
                style={{
                  width: "100%",
                  height: "400px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                }}
              />
            ) : null}
          </Box>
        ) : (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              No candidate available for labeling
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Per-metric rating UI */}
        {metrics.length > 0 ? (
          <Stack spacing={3}>
            {metrics.map((metric) => (
              <Box key={metric.id}>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, fontWeight: 600 }}
                >
                  {metric.name}
                </Typography>
                <Slider
                  value={ratings[metric.id] ?? 5}
                  onChange={(_, value) =>
                    handleRatingChange(metric.id, value as number)
                  }
                  min={0}
                  max={10}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No metrics configured for this evaluation
          </Typography>
        )}

        {/* Notes */}
        <TextField
          fullWidth
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          rows={2}
          margin="normal"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="outlined"
          startIcon={<SkipNextRoundedIcon />}
          onClick={handleSkip}
        >
          Skip
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveRoundedIcon />}
          onClick={handleSave}
          disabled={!testCaseId}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import { useState } from "react";
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
} from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import { SDK_BASE_URL } from "../lib/env";

interface ManualLabelingDialogProps {
  open: boolean;
  onClose: () => void;
  /** UUID of the data entry to render in the SDK labeling iframe. */
  entryId?: string;
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
 * Renders the next recommended candidate via the SDK server's labeling
 * UI in an iframe. Below the iframe, displays one rating slider per
 * metric, an optional notes field, and Save/Skip buttons.
 */
export function ManualLabelingDialog({
  open,
  onClose,
  entryId,
  metrics = [],
  onSave,
  onSkip,
}: ManualLabelingDialogProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");

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
        {entryId ? (
          <Box sx={{ mb: 3 }}>
            <iframe
              src={`${SDK_BASE_URL}/labeling-ui/${entryId}`}
              title="Labeling UI"
              style={{
                width: "100%",
                height: "400px",
                border: "1px solid #ddd",
                borderRadius: "8px",
              }}
            />
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
            No metrics configured for this test suite
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
          disabled={!entryId}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

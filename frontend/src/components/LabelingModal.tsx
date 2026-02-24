import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Slider,
} from "@mui/material";

/**
 * Labeling modal for manual test case evaluation.
 *
 * Displays the labeling UI (rendered by the SDK server via Jinja2)
 * inside an iframe, alongside controls for assigning metric values
 * and optional notes.
 */

interface LabelingModalProps {
  open: boolean;
  onClose: () => void;
  /** UUID of the test case to label. */
  testCaseId?: string;
  /** UUID of the data entry (for rendering in iframe). */
  entryId?: string;
  /** Metrics configured for the test suite. */
  metrics?: Array<{
    id: string;
    name: string;
    config: unknown;
  }>;
}

export function LabelingModal({
  open,
  onClose,
  testCaseId,
  entryId,
  metrics = [],
}: LabelingModalProps) {
  const [score, setScore] = useState(5);
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    // TODO: Call mutation to save label
    console.log("Saving label:", { testCaseId, score, notes });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Label Test Case</DialogTitle>
      <DialogContent>
        {entryId && (
          <Box sx={{ mb: 3 }}>
            <iframe
              src={`http://localhost:8100/labeling-ui/${entryId}`}
              title="Test Case Display"
              style={{
                width: "100%",
                height: "400px",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            />
          </Box>
        )}

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Score
          </Typography>
          <Slider
            value={score}
            onChange={(_, value) => setScore(value as number)}
            min={0}
            max={10}
            marks
            valueLabelDisplay="on"
          />
        </Box>

        <TextField
          fullWidth
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          rows={3}
          margin="normal"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          Save Label
        </Button>
      </DialogActions>
    </Dialog>
  );
}

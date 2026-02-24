import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

/**
 * Modal for creating a new metric.
 *
 * Opened from the TestSuiteCreation view when the user
 * wants to define a new metric rather than select an existing one.
 *
 * Calls the remote server's createMetric mutation.
 */

interface MetricCreationModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (metricId: string) => void;
}

export function MetricCreationModal({
  open,
  onClose,
  onCreated,
}: MetricCreationModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"scale" | "category">("scale");
  const [minValue, setMinValue] = useState(0);
  const [maxValue, setMaxValue] = useState(10);

  const handleSubmit = () => {
    // TODO: Call remote server createMetric mutation
    const mockMetricId = `metric-${Date.now()}`;
    console.log("Creating metric:", { name, description, type });
    onCreated?.(mockMetricId);
    handleClose();
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setType("scale");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Metric</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Metric Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          margin="normal"
          required
        />

        <TextField
          fullWidth
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          margin="normal"
          multiline
          rows={2}
        />

        <FormControl fullWidth margin="normal">
          <InputLabel>Type</InputLabel>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as "scale" | "category")}
            label="Type"
          >
            <MenuItem value="scale">Scale (Numeric)</MenuItem>
            <MenuItem value="category">Category</MenuItem>
          </Select>
        </FormControl>

        {type === "scale" && (
          <>
            <TextField
              fullWidth
              label="Min Value"
              type="number"
              value={minValue}
              onChange={(e) => setMinValue(Number(e.target.value))}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Max Value"
              type="number"
              value={maxValue}
              onChange={(e) => setMaxValue(Number(e.target.value))}
              margin="normal"
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!name}>
          Create Metric
        </Button>
      </DialogActions>
    </Dialog>
  );
}

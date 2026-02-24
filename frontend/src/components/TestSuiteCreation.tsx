import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from "@mui/material";
import { useDatasetStore } from "../lib/store";

/**
 * Test suite creation view.
 *
 * Gathers configuration for creating a test suite on the remote server:
 * - Name (defaulting to uploaded file name)
 * - Description (optional)
 * - Metrics selection (with "create new" modal)
 * - Input schema (from inferred row schema)
 *
 * On submit, subscribes to the SDK server's createTestSuiteProgress
 * subscription for real-time status updates.
 */
export function TestSuiteCreation() {
  const [name, setName] = useState("My Test Suite");
  const [description, setDescription] = useState("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [showProgress, setShowProgress] = useState(false);

  const navigate = useNavigate();
  const currentDatasetId = useDatasetStore((state) => state.currentDatasetId);

  const handleSubmit = async () => {
    if (!currentDatasetId) {
      alert("No dataset selected");
      return;
    }

    setCreating(true);
    setShowProgress(true);
    setProgress(0);
    setProgressMessage("Starting test suite creation...");

    try {
      // TODO: Subscribe to SDK createTestSuiteProgress subscription
      // For now, simulate progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setProgress(i);
        setProgressMessage(
          i === 100
            ? "Test suite created successfully!"
            : `Creating test suite... ${i}%`
        );
      }

      // Navigate to evaluation view
      setTimeout(() => {
        navigate(`/evaluation/mock-test-suite-id`);
      }, 1000);
    } catch (error) {
      alert("Failed to create test suite");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Create Test Suite
          </Typography>

          <TextField
            fullWidth
            label="Test Suite Name"
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
            rows={3}
          />

          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Metrics
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
              {selectedMetrics.map((metric) => (
                <Chip key={metric} label={metric} onDelete={() => {}} />
              ))}
            </Box>
            <Button variant="outlined" size="small">
              Add Metric
            </Button>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Input Schema
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Schema will be inferred from uploaded dataset
            </Typography>
          </Box>

          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            disabled={creating || !name}
            sx={{ mt: 4 }}
          >
            Create Test Suite
          </Button>
        </Paper>
      </Box>

      <Dialog open={showProgress} maxWidth="sm" fullWidth>
        <DialogTitle>Creating Test Suite</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            {progressMessage}
          </Typography>
          <LinearProgress variant="determinate" value={progress} sx={{ mt: 2 }} />
        </DialogContent>
        {progress === 100 && (
          <DialogActions>
            <Button onClick={() => setShowProgress(false)}>Close</Button>
          </DialogActions>
        )}
      </Dialog>
    </Container>
  );
}

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { useTestSuites } from "../hooks/useTestSuites";

interface LinkTestSuiteDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Called when the dialog should close. */
  onClose: () => void;
  /** Called when a test suite is selected to link. */
  onLink: (testSuiteId: string) => void;
}

/**
 * Dialog for linking a dataset to an existing test suite.
 *
 * Shows a dropdown of available test suites from the remote server.
 * The user selects one and clicks "Link" to associate it with the dataset.
 */
export function LinkTestSuiteDialog({
  open,
  onClose,
  onLink,
}: LinkTestSuiteDialogProps) {
  const [selectedId, setSelectedId] = useState<string>("");
  const { testSuites, loading } = useTestSuites();

  const handleLink = () => {
    if (selectedId) {
      onLink(selectedId);
      setSelectedId("");
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedId("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Link to Test Suite</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select an existing test suite to link with this dataset.
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : testSuites.length === 0 ? (
          <Typography color="text.secondary">
            No test suites available. Create one first.
          </Typography>
        ) : (
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Test Suite</InputLabel>
            <Select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              label="Test Suite"
            >
              {testSuites.map((ts) => (
                <MenuItem key={ts.id as string} value={ts.id as string}>
                  {ts.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleLink}
          disabled={!selectedId}
        >
          Link
        </Button>
      </DialogActions>
    </Dialog>
  );
}

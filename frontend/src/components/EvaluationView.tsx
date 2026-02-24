import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Card,
  CardContent,
} from "@mui/material";
import { LabelingModal } from "./LabelingModal";
import { TestCaseDataGrid } from "./TestCaseDataGrid";

/**
 * Evaluation view for a test suite.
 *
 * Shows:
 * 1. Test suite title
 * 2. Action buttons: Manual Review, Train Evaluator (no-op), Run Evaluation (no-op)
 * 3. Key metrics summary of latest evaluation results
 * 4. Paginated data grid of all test cases with labels and actions
 */
export function EvaluationView() {
  const { testSuiteId } = useParams<{ testSuiteId: string }>();
  const [labelingOpen, setLabelingOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const handleManualReview = () => {
    // TODO: Get first unlabeled test case
    setSelectedEntryId("mock-entry-id");
    setLabelingOpen(true);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Test Suite Evaluation
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Test Suite ID: {testSuiteId}
        </Typography>

        <Box sx={{ display: "flex", gap: 2, my: 3 }}>
          <Button variant="contained" onClick={handleManualReview}>
            Manual Review
          </Button>
          <Button variant="outlined" disabled>
            Train Evaluator
          </Button>
          <Button variant="outlined" disabled>
            Run Evaluation
          </Button>
        </Box>

        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Evaluation Summary
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Test Cases
                </Typography>
                <Typography variant="h4">0</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Labeled
                </Typography>
                <Typography variant="h4">0</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Avg Score
                </Typography>
                <Typography variant="h4">-</Typography>
              </CardContent>
            </Card>
          </Box>
        </Paper>

        <TestCaseDataGrid testSuiteId={testSuiteId || ""} />
      </Box>

      <LabelingModal
        open={labelingOpen}
        onClose={() => setLabelingOpen(false)}
        entryId={selectedEntryId || undefined}
      />
    </Container>
  );
}

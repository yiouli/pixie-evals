import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Chip,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LabelRoundedIcon from "@mui/icons-material/LabelRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { EditableText } from "./EditableText";
import { TestCaseDataGrid } from "./TestCaseDataGrid";
import { ManualLabelingDialog } from "./ManualLabelingDialog";
import { EvaluationDialog } from "./EvaluationDialog";

// Mock data — remote server operations not yet implemented
const MOCK_METRICS = [
  { id: "m1", name: "Accuracy" },
  { id: "m2", name: "Relevance" },
  { id: "m3", name: "Helpfulness" },
];

const MOCK_TEST_CASES: Array<Record<string, unknown> & { id: string }> = [
  {
    id: "tc1",
    input: "What is AI?",
    expected_output: "Artificial Intelligence is...",
    label: null,
  },
  {
    id: "tc2",
    input: "Explain ML",
    expected_output: "Machine Learning is...",
    label: 8,
  },
  {
    id: "tc3",
    input: "What is NLP?",
    expected_output: "Natural Language Processing...",
    label: null,
  },
];

/**
 * Test suite detail view.
 *
 * Shows test suite name (click to edit), evaluation metrics, action
 * buttons (manual label, AI evaluate, import test cases, delete),
 * description (click to edit), readonly metrics list, readonly input
 * schema, and paginated test cases with per-row action buttons.
 */
export function TestSuiteView() {
  const { testSuiteId } = useParams<{ testSuiteId: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("My Test Suite");
  const [description, setDescription] = useState("");
  const [labelingOpen, setLabelingOpen] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | undefined>();

  // TODO: Fetch real data from remote server using testSuiteId

  const handleManualLabel = () => {
    // TODO: Get next recommended candidate from server
    setSelectedEntryId("mock-entry-id");
    setLabelingOpen(true);
  };

  const handleLabelRow = (id: string) => {
    setSelectedEntryId(id);
    setLabelingOpen(true);
  };

  const handleDeleteRow = (id: string) => {
    // TODO: Call delete mutation
    console.log("Delete test case:", id);
  };

  return (
    <Box sx={{ height: "100%", overflowY: "auto" }}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Tooltip title="Back to selection">
            <IconButton onClick={() => navigate("/")} size="small">
              <ArrowBackRoundedIcon />
            </IconButton>
          </Tooltip>
          <EditableText value={name} onSave={setName} variant="h4" />
        </Stack>

        {/* Test Suite ID */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, ml: 5 }}
        >
          ID: {testSuiteId}
        </Typography>

        {/* Action buttons */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<LabelRoundedIcon />}
            onClick={handleManualLabel}
          >
            Manual Label
          </Button>
          <Button
            variant="outlined"
            startIcon={<ScienceRoundedIcon />}
            onClick={() => setEvalOpen(true)}
          >
            AI Evaluate
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileUploadRoundedIcon />}
          >
            Import Test Cases
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineRoundedIcon />}
          >
            Delete
          </Button>
        </Stack>

        {/* Description */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 0.5 }}
          >
            Description
          </Typography>
          <EditableText
            value={description}
            onSave={setDescription}
            variant="body1"
            placeholder="Click to add a description..."
            multiline
          />
        </Box>

        {/* Metrics */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Evaluation Metrics
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {MOCK_METRICS.map((metric) => (
              <Chip
                key={metric.id}
                label={metric.name}
                variant="outlined"
              />
            ))}
          </Stack>
        </Box>

        {/* Input Schema */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Input Schema
          </Typography>
          <Paper
            variant="outlined"
            sx={{ p: 2, borderRadius: 2, bgcolor: "grey.50" }}
          >
            <Box
              component="pre"
              sx={{ m: 0, fontSize: "0.875rem", fontFamily: "monospace" }}
            >
              {JSON.stringify(
                { input: "string", expected_output: "string" },
                null,
                2,
              )}
            </Box>
          </Paper>
        </Box>

        {/* Test Cases Grid */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Test Cases
          </Typography>
          <TestCaseDataGrid
            rows={MOCK_TEST_CASES}
            showActions
            onLabel={handleLabelRow}
            onDelete={handleDeleteRow}
          />
        </Box>
      </Container>

      {/* Manual Labeling Dialog */}
      <ManualLabelingDialog
        open={labelingOpen}
        onClose={() => setLabelingOpen(false)}
        entryId={selectedEntryId}
        metrics={MOCK_METRICS}
        onSave={(ratings, notes) => {
          console.log("Save label:", { ratings, notes });
          setLabelingOpen(false);
        }}
        onSkip={() => {
          console.log("Skip");
        }}
      />

      {/* AI Evaluation Dialog */}
      <EvaluationDialog
        open={evalOpen}
        onClose={() => setEvalOpen(false)}
        metrics={MOCK_METRICS}
      />
    </Box>
  );
}

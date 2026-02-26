import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { useTestSuites, type TestSuite } from "../hooks/useTestSuites";
import { useMetrics } from "../hooks/useMetrics";
import {
  parseMetricConfig,
  getMetricKind,
  getMetricKindLabel,
} from "../lib/metricUtils";

/** Sentinel value for the "Create new" option in the dropdown. */
const CREATE_NEW_VALUE = "__create_new__";

interface EvaluationCardProps {
  /** ID of the currently linked test suite, or null if none. */
  testSuiteId: string | null;
  /** Called when the user wants to create a new evaluation. */
  onCreateEvaluation: () => void;
  /** Called when the user selects a different evaluation from the dropdown. */
  onLinkChange: (testSuiteId: string) => void;
  /** Called when the user clicks the Evaluate button. */
  onEvaluate: () => void;
}

/**
 * Card displaying the linked evaluation (test suite) for a dataset.
 *
 * When linked, shows:
 * - A dropdown select in the title area to switch evaluations (with a "Create new" option)
 * - Metrics chips
 * - Description text
 * - An "Evaluate" action button
 *
 * When unlinked (or the linked ID doesn't match any remote evaluation):
 * - Shows a prompt with a "Create Evaluation" button.
 */
export function EvaluationCard({
  testSuiteId,
  onCreateEvaluation,
  onLinkChange,
  onEvaluate,
}: EvaluationCardProps) {
  const { testSuites, loading } = useTestSuites();
  const { metrics } = useMetrics();

  const linkedSuite: TestSuite | undefined = testSuiteId
    ? testSuites.find((ts) => (ts.id as string) === testSuiteId)
    : undefined;

  const isUnlinked = !testSuiteId || (!loading && !linkedSuite);

  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    if (value === CREATE_NEW_VALUE) {
      onCreateEvaluation();
      return;
    }
    if (value && value !== testSuiteId) {
      onLinkChange(value);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent
          sx={{ display: "flex", justifyContent: "center", py: 4 }}
        >
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  // Unlinked state — show creation prompt
  if (isUnlinked) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1 }}
          >
            Evaluation
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 3,
              gap: 1.5,
            }}
          >
            <Typography color="text.secondary" variant="body2">
              No evaluation linked to this dataset.
            </Typography>
            <Button
              variant="contained"
              startIcon={<ScienceRoundedIcon />}
              onClick={onCreateEvaluation}
            >
              Create Evaluation
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Linked state — show full card
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        {/* Title row with dropdown select */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1.5 }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Evaluation
            </Typography>
          </Stack>
          <Button
            variant="contained"
            size="small"
            startIcon={<PlayArrowRoundedIcon />}
            onClick={onEvaluate}
          >
            Evaluate
          </Button>
        </Stack>

        <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
          <Select
            value={testSuiteId ?? ""}
            onChange={handleSelectChange}
            displayEmpty
            renderValue={(selected) => {
              if (!selected) return "Select evaluation...";
              const suite = testSuites.find(
                (ts) => (ts.id as string) === selected,
              );
              return suite?.name ?? selected;
            }}
          >
            {testSuites.map((ts) => (
              <MenuItem key={ts.id as string} value={ts.id as string}>
                {ts.name}
              </MenuItem>
            ))}
            <Divider />
            <MenuItem value={CREATE_NEW_VALUE}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <AddRoundedIcon fontSize="small" color="primary" />
                <Typography color="primary" variant="body2">
                  Create new evaluation...
                </Typography>
              </Stack>
            </MenuItem>
          </Select>
        </FormControl>

        {/* Description */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {linkedSuite?.description || "No description."}
        </Typography>

        {/* Metrics chips */}
        {metrics.length > 0 && (
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 0.5, display: "block" }}
            >
              Metrics
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {metrics.map((m) => {
                const config = parseMetricConfig(m.config);
                const kind = getMetricKind(config);
                return (
                  <Chip
                    key={m.id as string}
                    label={m.name}
                    size="small"
                    title={`${m.name} (${getMetricKindLabel(kind)})`}
                    variant="outlined"
                  />
                );
              })}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

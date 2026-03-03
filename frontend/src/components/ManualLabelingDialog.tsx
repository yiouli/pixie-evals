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
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useLazyQuery } from "@apollo/client";
import JsonView from "react18-json-view";
import "react18-json-view/src/style.css";
import { GET_LABELING_HTML } from "../graphql/sdk/query";
import { sdkClient } from "../lib/apolloClient";
import { SDK_BASE_URL } from "../lib/env";
import {
  parseMetricConfig,
  getMetricKind,
  type MetricKind,
} from "../lib/metricUtils";

/** Metric with config for the labeling dialog. */
export interface LabelingMetric {
  id: string;
  name: string;
  /** Raw config JSON from the GraphQL schema. */
  config: unknown;
}

interface ManualLabelingDialogProps {
  open: boolean;
  onClose: () => void;
  /** Remote test case UUID to render in the labeling iframe. */
  testCaseId?: string;
  /** Metrics configured for the test suite (with config for kind detection). */
  metrics?: LabelingMetric[];
  /** Called when user saves ratings. */
  onSave?: (ratings: Record<string, number | string>, notes: string) => void;
  /** Called when user skips the current candidate. */
  onSkip?: () => void;
}

/**
 * Manual labeling dialog.
 *
 * Fetches the labeling HTML from the SDK server via the
 * ``getLabelingHtml`` GraphQL query and renders it via iframe srcdoc.
 * When no custom labeling HTML exists (query returns null), fetches
 * the raw input data from the SDK REST API and renders it with a
 * JSON viewer.
 *
 * Below the display area, renders metric-specific rating inputs:
 * - Binary (scaling=1): cross/check icon buttons
 * - Scale (scaling>=2): sliding scale
 * - Category: toggle button group
 */
export function ManualLabelingDialog({
  open,
  onClose,
  testCaseId,
  metrics = [],
  onSave,
  onSkip,
}: ManualLabelingDialogProps) {
  const [ratings, setRatings] = useState<Record<string, number | string>>({});
  const [notes, setNotes] = useState("");
  const [rawInputData, setRawInputData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [rawInputLoading, setRawInputLoading] = useState(false);
  const [rawInputError, setRawInputError] = useState<string | null>(null);

  // Fetch labeling HTML via GraphQL query
  const [
    fetchLabelingHtml,
    { loading: fetchLoading, data: fetchData, error: fetchQueryError },
  ] = useLazyQuery(GET_LABELING_HTML, {
    client: sdkClient,
    fetchPolicy: "no-cache",
  });

  const htmlContent = fetchData?.getLabelingHtml ?? null;
  const fetchError = fetchQueryError?.message ?? null;

  // True when query completed and returned null (no custom HTML)
  const noCustomHtml = fetchData !== undefined && htmlContent === null;

  useEffect(() => {
    if (!testCaseId || !open) {
      return;
    }
    setRawInputData(null);
    setRawInputError(null);
    fetchLabelingHtml({ variables: { testCaseId } });
  }, [testCaseId, open, fetchLabelingHtml]);

  // When no custom HTML, fetch raw input data from REST endpoint
  useEffect(() => {
    if (!noCustomHtml || !testCaseId) return;

    setRawInputLoading(true);
    fetch(`${SDK_BASE_URL}/api/inputs/${testCaseId}`)
      .then((res) => {
        if (!res.ok)
          throw new Error(`Failed to load input data (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setRawInputData(data as Record<string, unknown>);
        setRawInputLoading(false);
      })
      .catch((err: Error) => {
        setRawInputError(err.message);
        setRawInputLoading(false);
      });
  }, [noCustomHtml, testCaseId]);

  const handleRatingChange = (metricId: string, value: number | string) => {
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
        {/* SDK labeling display */}
        {testCaseId ? (
          <Box sx={{ mb: 3 }}>
            {fetchLoading || rawInputLoading ? (
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
            ) : rawInputError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {rawInputError}
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
            ) : rawInputData ? (
              <Box
                sx={{
                  maxHeight: "400px",
                  overflow: "auto",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 2,
                }}
              >
                <JsonView src={rawInputData} collapsed={2} />
              </Box>
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
            {metrics.map((metric) => {
              const config = parseMetricConfig(metric.config);
              const kind = getMetricKind(config);
              return (
                <Box key={metric.id}>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, fontWeight: 600 }}
                  >
                    {metric.name}
                  </Typography>
                  <MetricRatingInput
                    kind={kind}
                    config={config}
                    value={ratings[metric.id]}
                    onChange={(val) => handleRatingChange(metric.id, val)}
                  />
                </Box>
              );
            })}
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

// ---------------------------------------------------------------------------
// Metric-specific rating inputs
// ---------------------------------------------------------------------------

interface MetricRatingInputProps {
  kind: MetricKind;
  config: Record<string, unknown>;
  value: number | string | undefined;
  onChange: (value: number | string) => void;
}

/**
 * Renders the appropriate rating input based on metric kind:
 * - binary: cross/check icon buttons for 0/1
 * - scale: slider with correct range (1 to scaling)
 * - category: toggle button group
 */
function MetricRatingInput({
  kind,
  config,
  value,
  onChange,
}: MetricRatingInputProps) {
  if (kind === "binary") {
    const numValue = typeof value === "number" ? value : undefined;
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <IconButton
          onClick={() => onChange(0)}
          color={numValue === 0 ? "error" : "default"}
          aria-label="reject"
          sx={{
            border: 1,
            borderColor: numValue === 0 ? "error.main" : "divider",
          }}
        >
          <CloseRoundedIcon />
        </IconButton>
        <IconButton
          onClick={() => onChange(1)}
          color={numValue === 1 ? "success" : "default"}
          aria-label="approve"
          sx={{
            border: 1,
            borderColor: numValue === 1 ? "success.main" : "divider",
          }}
        >
          <CheckRoundedIcon />
        </IconButton>
      </Stack>
    );
  }

  if (kind === "category") {
    const categories = Array.isArray(config.categories)
      ? (config.categories as string[])
      : [];
    return (
      <ToggleButtonGroup
        value={typeof value === "string" ? value : null}
        exclusive
        onChange={(_, newVal: string | null) => {
          if (newVal !== null) onChange(newVal);
        }}
        size="small"
      >
        {categories.map((cat) => (
          <ToggleButton key={cat} value={cat}>
            {cat}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    );
  }

  // Scale metric
  const scaling = typeof config.scaling === "number" ? config.scaling : 10;
  return (
    <Slider
      value={typeof value === "number" ? value : Math.ceil(scaling / 2)}
      onChange={(_, v) => onChange(v as number)}
      min={1}
      max={scaling}
      marks
      valueLabelDisplay="auto"
    />
  );
}

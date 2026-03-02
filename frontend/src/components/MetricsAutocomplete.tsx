import { useState, useEffect } from "react";
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { MetricChip } from "./MetricChip";
import { MetricDialog } from "./MetricDialog";
import { useMetrics } from "../hooks/useMetrics";
import { getMetricKindLabel, getMetricKind, parseMetricConfig, type Metric } from "../lib/metricUtils";

/**
 * Extended metric option type that includes a sentinel for "Create new".
 * The `__isCreateNew` flag distinguishes it from real metrics.
 */
type MetricOption = Metric & { __isCreateNew?: boolean };

/** Sentinel option that triggers the create-metric dialog. */
const CREATE_NEW_OPTION: MetricOption = {
  __typename: "MetricType",
  id: "__create_new__",
  name: "Create new metric...",
  description: null,
  config: {},
  account: "",
  __isCreateNew: true,
};

interface MetricsAutocompleteProps {
  /** Currently selected metrics. */
  value: Metric[];
  /** Called when the selection changes. */
  onChange: (selected: Metric[]) => void;
}

/**
 * Autocomplete input for selecting evaluation metrics.
 *
 * Shows available metrics as options. Selected metrics are rendered as
 * color-coded MetricChip components. Includes a "Create new metric..."
 * option at the bottom that opens the MetricDialog.
 *
 * When a new metric is created, it is automatically added to the selection.
 */
export function MetricsAutocomplete({
  value,
  onChange,
}: MetricsAutocompleteProps) {
  const { metrics: allMetrics } = useMetrics();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [pendingMetricId, setPendingMetricId] = useState<string | null>(null);

  // Auto-select newly created metric once it appears in the list
  useEffect(() => {
    if (!pendingMetricId) return;
    const found = allMetrics.find(
      (m) => (m.id as string) === pendingMetricId,
    );
    if (found) {
      if (!value.some((m) => (m.id as string) === pendingMetricId)) {
        onChange([...value, found]);
      }
      setPendingMetricId(null);
    }
  }, [pendingMetricId, allMetrics, value, onChange]);

  const options: MetricOption[] = [...allMetrics, CREATE_NEW_OPTION];
  const selectedIds = new Set(value.map((m) => m.id as string));

  return (
    <>
      <Autocomplete<MetricOption, true, false, false>
        multiple
        value={value as MetricOption[]}
        onChange={(_, newValue) => {
          // Intercept "Create new" selection
          if (newValue.some((v) => v.__isCreateNew)) {
            setCreateDialogOpen(true);
            return;
          }
          onChange(newValue as Metric[]);
        }}
        options={options}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, val) => {
          if (option.__isCreateNew || val.__isCreateNew) return false;
          return (option.id as string) === (val.id as string);
        }}
        filterOptions={(opts, { inputValue }) =>
          opts.filter((opt) => {
            if (opt.__isCreateNew) return true;
            if (selectedIds.has(opt.id as string)) return false;
            if (!inputValue) return true;
            return opt.name.toLowerCase().includes(inputValue.toLowerCase());
          })
        }
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => {
            if (option.__isCreateNew) return null;
            const tagProps = getTagProps({ index });
            return (
              <MetricChip
                key={tagProps.key}
                metric={option as Metric}
                size="small"
                onDelete={() => tagProps.onDelete(null)}
              />
            );
          })
        }
        renderOption={(props, option) => {
          if (option.__isCreateNew) {
            const { key, ...rest } = props;
            return (
              <Box
                component="li"
                key="__create_new__"
                {...rest}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  color: "primary.main",
                }}
              >
                <AddRoundedIcon fontSize="small" />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, fontStyle: "italic" }}
                >
                  Create new metric...
                </Typography>
              </Box>
            );
          }
          const metric = option as Metric;
          const config = parseMetricConfig(metric.config);
          const kind = getMetricKind(config);
          const { key, ...rest } = props;
          return (
            <Box component="li" key={metric.id as string} {...rest}>
              <Typography variant="body2">{metric.name}</Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 1 }}
              >
                ({getMetricKindLabel(kind)})
              </Typography>
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={value.length === 0 ? "Select metrics..." : ""}
            size="small"
          />
        )}
      />

      <MetricDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={(metricId) => {
          setCreateDialogOpen(false);
          setPendingMetricId(metricId);
        }}
      />
    </>
  );
}

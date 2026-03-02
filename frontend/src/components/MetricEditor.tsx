import { useId, useCallback } from "react";
import {
  Box,
  TextField,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { ArrayEditor, type ArrayItemRendererProps } from "./ArrayEditor";

/** Type of metric — numeric scale or categorical. */
export type MetricType = "scale" | "category";

/** A single metric definition for a test suite. */
export interface MetricConfig {
  /** Unique client-side key for stable React keys. */
  key: string;
  /** User-facing metric name. */
  name: string;
  /** Whether this is a scale (numeric) or category metric. */
  type: MetricType;
  /** For scale: max score value (1–100). */
  scaleMax: number;
  /** For category: list of category labels. */
  categories: string[];
}

/** Create a blank metric config with a unique key. */
export function createEmptyMetric(): MetricConfig {
  return {
    key: crypto.randomUUID(),
    name: "",
    type: "scale",
    scaleMax: 10,
    categories: [],
  };
}

interface MetricEditorProps {
  /** Current list of metrics (controlled). */
  value: MetricConfig[];
  /** Called whenever the metrics list changes. */
  onChange: (next: MetricConfig[]) => void;
}

/**
 * Editor for a list of evaluation metrics.
 *
 * Uses ArrayEditor for add/remove/reorder. Each metric row allows:
 * - Name (text input)
 * - Type toggle (Scale / Category)
 * - For Scale: a slider to set the max score
 * - For Category: an editable list of category labels
 */
export function MetricEditor({ value, onChange }: MetricEditorProps) {
  const renderMetricItem = useCallback(
    (props: ArrayItemRendererProps<MetricConfig>) => (
      <MetricItemEditor {...props} />
    ),
    [],
  );

  return (
    <ArrayEditor<MetricConfig>
      value={value}
      onChange={onChange}
      renderItem={renderMetricItem}
      createItem={createEmptyMetric}
      getItemId={(item) => item.key}
      addLabel="Add metric"
    />
  );
}

// ---- Internal: single metric row ----

function MetricItemEditor({
  value,
  onChange,
}: ArrayItemRendererProps<MetricConfig>) {
  return (
    <Stack spacing={1.5}>
      {/* Name + Type toggle */}
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          size="small"
          placeholder="Metric name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          sx={{ flex: 1 }}
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={value.type}
          onChange={(_, newType: MetricType | null) => {
            if (newType) onChange({ ...value, type: newType });
          }}
        >
          <ToggleButton value="scale">Scale</ToggleButton>
          <ToggleButton value="category">Category</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Type-specific controls */}
      {value.type === "scale" ? (
        <ScaleConfig
          scaleMax={value.scaleMax}
          onChange={(scaleMax) => onChange({ ...value, scaleMax })}
        />
      ) : (
        <CategoryConfig
          categories={value.categories}
          onChange={(categories) => onChange({ ...value, categories })}
        />
      )}
    </Stack>
  );
}

// ---- Scale sub-editor ----

function ScaleConfig({
  scaleMax,
  onChange,
}: {
  scaleMax: number;
  onChange: (v: number) => void;
}) {
  return (
    <Box sx={{ px: 1 }}>
      <Typography variant="caption" color="text.secondary">
        Scale: 1 – {scaleMax}
      </Typography>
      <Slider
        value={scaleMax}
        onChange={(_, v) => onChange(v as number)}
        min={2}
        max={100}
        marks={[
          { value: 5, label: "5" },
          { value: 10, label: "10" },
          { value: 50, label: "50" },
          { value: 100, label: "100" },
        ]}
        valueLabelDisplay="auto"
        size="small"
      />
    </Box>
  );
}

// ---- Category sub-editor (editable list) ----

function CategoryConfig({
  categories,
  onChange,
}: {
  categories: string[];
  onChange: (v: string[]) => void;
}) {
  const inputId = useId();

  const handleAdd = () => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    const val = input?.value.trim();
    if (val && !categories.includes(val)) {
      onChange([...categories, val]);
      if (input) input.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleDelete = (label: string) => {
    onChange(categories.filter((c) => c !== label));
  };

  return (
    <Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
        {categories.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            size="small"
            onDelete={() => handleDelete(cat)}
          />
        ))}
      </Box>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          id={inputId}
          size="small"
          placeholder="Add category..."
          onKeyDown={handleKeyDown}
          sx={{ flex: 1 }}
        />
        <Tooltip title="Add category">
          <IconButton size="small" onClick={handleAdd}>
            <AddRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}

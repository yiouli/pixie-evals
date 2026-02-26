import { useState, useEffect, useId, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ToggleOffRoundedIcon from "@mui/icons-material/ToggleOffRounded";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import { useMetrics } from "../hooks/useMetrics";
import type { CreateMetricInput } from "../hooks/useMetrics";
import { getMetricKind, parseMetricConfig, type Metric } from "../lib/metricUtils";

/** The UX-facing metric type options. */
type MetricTypeOption = "binary" | "scale" | "category";

/** Style config for type pill in edit mode. */
const TYPE_PILL_STYLE: Record<
  MetricTypeOption,
  { color: string; bgcolor: string; icon: React.ReactElement }
> = {
  binary: {
    color: "#2E7D32",
    bgcolor: "#E8F5E9",
    icon: <ToggleOffRoundedIcon fontSize="small" />,
  },
  scale: {
    color: "#1565C0",
    bgcolor: "#E3F2FD",
    icon: <LinearScaleIcon fontSize="small" />,
  },
  category: {
    color: "#6A1B9A",
    bgcolor: "#F3E5F5",
    icon: <CategoryRoundedIcon fontSize="small" />,
  },
};

/** Human label for the type pill. */
function getTypePillLabel(
  metricType: MetricTypeOption,
  scaling: number,
): string {
  switch (metricType) {
    case "binary":
      return "Binary";
    case "scale":
      return `Scale 1\u2013${scaling}`;
    case "category":
      return "Category";
  }
}

interface MetricDialogProps {
  open: boolean;
  onClose: () => void;
  /** Existing metric for edit mode. When set, the dialog is read-only. */
  metric?: Metric | null;
  /** Called after a new metric is created successfully. */
  onCreated?: (metricId: string) => void;
}

/**
 * Dialog for creating or viewing a metric.
 *
 * **Create mode** (no metric prop):
 * - Text input for metric name
 * - Toggle group: binary / scale / category
 * - Type-specific config (slider 2–10 for scale, editable list for category)
 * - Optional description
 * - Cancel / Create buttons
 *
 * **Edit/view mode** (metric prop is set):
 * - Metric name as title
 * - Type pill (icon + label, colored)
 * - Category list with "|" dividers (if category type)
 * - Description as plain text, or italic "No description"
 * - Close button only
 */
export function MetricDialog({
  open,
  onClose,
  metric,
  onCreated,
}: MetricDialogProps) {
  const isEdit = Boolean(metric?.id);
  const { createMetric } = useMetrics();

  const [name, setName] = useState("");
  const [metricType, setMetricType] = useState<MetricTypeOption>("binary");
  const [scaling, setScaling] = useState(5);
  const [categories, setCategories] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Initialize from existing metric when editing
  useEffect(() => {
    if (metric) {
      setName(metric.name);
      setDescription(metric.description ?? "");
      const config = parseMetricConfig(metric.config);
      const kind = getMetricKind(config);
      setMetricType(kind);
      if (kind === "scale" && typeof config.scaling === "number") {
        setScaling(config.scaling);
      }
      if (kind === "category" && Array.isArray(config.categories)) {
        setCategories(config.categories as string[]);
      }
    } else {
      resetForm();
    }
  }, [metric]);

  const resetForm = () => {
    setName("");
    setMetricType("binary");
    setScaling(5);
    setCategories([]);
    setDescription("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const config: CreateMetricInput["config"] = {
        type: metricType === "binary" ? "scale" : metricType,
        scaling:
          metricType === "binary"
            ? 1
            : metricType === "scale"
              ? scaling
              : undefined,
        categories: metricType === "category" ? categories : undefined,
      };
      const id = await createMetric({
        name: name.trim(),
        description: description.trim() || undefined,
        config,
      });
      onCreated?.(id);
      handleClose();
    } finally {
      setCreating(false);
    }
  };

  const canCreate =
    !isEdit &&
    name.trim().length > 0 &&
    (metricType !== "category" || categories.length > 0);

  // ---- Edit / view mode ----
  if (isEdit) {
    const pillStyle = TYPE_PILL_STYLE[metricType];
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        {/* Title: metric name */}
        <Box sx={{ px: 3, pt: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {metric!.name}
          </Typography>
        </Box>

        <DialogContent sx={{ pt: 2 }}>
          {/* Type pill */}
          <Box sx={{ mb: 2 }}>
            <Chip
              icon={pillStyle.icon}
              label={getTypePillLabel(metricType, scaling)}
              sx={{
                color: pillStyle.color,
                bgcolor: pillStyle.bgcolor,
                fontWeight: 500,
                "& .MuiChip-icon": { color: pillStyle.color },
              }}
            />
          </Box>

          {/* Category list with "|" dividers */}
          {metricType === "category" && categories.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ flexWrap: "wrap" }}
                divider={
                  <Divider orientation="vertical" flexItem />
                }
              >
                {categories.map((cat) => (
                  <Typography key={cat} variant="body2">
                    {cat}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}

          {/* Description */}
          {description ? (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          ) : (
            <Typography
              variant="body2"
              color="text.disabled"
              sx={{ fontStyle: "italic" }}
            >
              No description
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ---- Create mode ----
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      {/* Title / name input */}
      <Box sx={{ px: 3, pt: 3 }}>
        <TextField
          fullWidth
          placeholder="Metric name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          variant="standard"
          slotProps={{
            input: {
              sx: { fontSize: "1.25rem", fontWeight: 600 },
            },
          }}
        />
      </Box>

      <DialogContent sx={{ pt: 2 }}>
        {/* Type toggle */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1 }}
          >
            Type
          </Typography>
          <ToggleButtonGroup
            value={metricType}
            exclusive
            onChange={(_, v: MetricTypeOption | null) => {
              if (v) setMetricType(v);
            }}
            size="small"
            fullWidth
          >
            <ToggleButton value="binary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <ToggleOffRoundedIcon fontSize="small" />
              Binary
            </ToggleButton>
            <ToggleButton value="scale" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <LinearScaleIcon fontSize="small" />
              Scale
            </ToggleButton>
            <ToggleButton value="category" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <CategoryRoundedIcon fontSize="small" />
              Category
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Type-specific configuration */}
        {metricType === "scale" && (
          <Box sx={{ mb: 3, px: 1 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              Scale range: 1 &ndash; {scaling}
            </Typography>
            <Slider
              value={scaling}
              onChange={(_, v) => setScaling(v as number)}
              min={2}
              max={10}
              marks
              valueLabelDisplay="auto"
              size="small"
            />
          </Box>
        )}

        {metricType === "category" && (
          <CategoryEditor
            categories={categories}
            onChange={setCategories}
          />
        )}

        {/* Description */}
        <TextField
          fullWidth
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={2}
          margin="normal"
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!canCreate || creating}
        >
          {creating ? "Creating..." : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---- Category editor (internal) ----

function CategoryEditor({
  categories,
  onChange,
}: {
  categories: string[];
  onChange: (v: string[]) => void;
}) {
  const inputId = useId();

  const handleAdd = useCallback(() => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    const val = input?.value.trim();
    if (val && !categories.includes(val)) {
      onChange([...categories, val]);
      if (input) input.value = "";
    }
  }, [categories, onChange, inputId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Categories
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
        {categories.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            size="small"
            onDelete={() => onChange(categories.filter((c) => c !== cat))}
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

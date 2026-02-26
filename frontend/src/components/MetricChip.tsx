import { useState, type MouseEvent } from "react";
import {
  Chip,
  Popover,
  Box,
  Typography,
  Stack,
} from "@mui/material";
import ToggleOffRoundedIcon from "@mui/icons-material/ToggleOffRounded";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import {
  getMetricKind,
  getMetricKindLabel,
  parseMetricConfig,
  type Metric,
  type MetricKind,
} from "../lib/metricUtils";

/** Visual configuration per metric kind. */
const METRIC_KIND_STYLE: Record<
  MetricKind,
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

interface MetricChipProps {
  /** The metric to display. */
  metric: Metric;
  /** Chip size. */
  size?: "small" | "medium";
  /** Called when the chip is clicked. */
  onClick?: () => void;
  /** Called when the delete icon is clicked. */
  onDelete?: () => void;
}

/**
 * A color-coded chip representing a metric.
 *
 * Shows the metric name with a type-specific icon and color.
 * Hovering shows a popover with metric details (type, description, config).
 *
 * Color coding:
 * - binary (scale with scaling=1): green with ToggleOffRounded icon
 * - scale (scaling ≥ 2): blue with LinearScale icon
 * - category: purple with CategoryRounded icon
 */
export function MetricChip({
  metric,
  size,
  onClick,
  onDelete,
}: MetricChipProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const config = parseMetricConfig(metric.config);
  const kind = getMetricKind(config);
  const style = METRIC_KIND_STYLE[kind];

  const handleMouseEnter = (e: MouseEvent<HTMLDivElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleMouseLeave = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Chip
        label={metric.name}
        icon={style.icon}
        size={size}
        onClick={onClick}
        onDelete={onDelete}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{
          color: style.color,
          bgcolor: style.bgcolor,
          fontWeight: 500,
          "& .MuiChip-icon": { color: style.color },
          "& .MuiChip-deleteIcon": {
            color: style.color,
            "&:hover": { color: style.color, opacity: 0.7 },
          },
        }}
      />
      <Popover
        sx={{ pointerEvents: "none" }}
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={handleMouseLeave}
        disableRestoreFocus
      >
        <Box sx={{ p: 2, maxWidth: 300 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {metric.name}
          </Typography>
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              Type: {getMetricKindLabel(kind)}
              {kind === "scale" && config.scaling
                ? ` (1\u2013${config.scaling})`
                : ""}
            </Typography>
            {kind === "category" && Array.isArray(config.categories) && (
              <Typography variant="body2" color="text.secondary">
                Categories: {(config.categories as string[]).join(", ")}
              </Typography>
            )}
            {metric.description && (
              <Typography variant="body2" color="text.secondary">
                {metric.description}
              </Typography>
            )}
          </Stack>
        </Box>
      </Popover>
    </>
  );
}

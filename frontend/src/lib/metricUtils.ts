import type { ListMetricsQuery } from "../generated/remote/graphql";

/** A metric as returned by the ListMetrics query. */
export type Metric = ListMetricsQuery["listMetrics"][number];

/** Derived metric kind for display purposes. */
export type MetricKind = "binary" | "scale" | "category";

/**
 * Safely parse a metric config value into a plain object.
 *
 * The GraphQL JSON scalar may arrive as:
 * - A parsed JS object (normal Apollo behaviour)
 * - A JSON string (if the server double-serialises or the DB driver
 *   returns a string for the JSONB column)
 * - `null` / `undefined`
 *
 * This helper normalises all variants into `Record<string, unknown>`.
 */
export function parseMetricConfig(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

/**
 * Derive the display kind from a metric's config JSON.
 *
 * - `config.type === "category"` → category
 * - `config.type === "scale"` with `scaling === 1` → binary
 * - `config.type === "scale"` with `scaling >= 2` → scale
 */
export function getMetricKind(config: Record<string, unknown>): MetricKind {
  if (config.type === "category") return "category";
  if (config.type === "scale" && (config.scaling as number) === 1)
    return "binary";
  return "scale";
}

/** Human-readable label for each metric kind. */
export function getMetricKindLabel(kind: MetricKind): string {
  switch (kind) {
    case "binary":
      return "Binary";
    case "scale":
      return "Scale";
    case "category":
      return "Category";
  }
}

/**
 * Generate a human-readable description for a metric.
 * Uses the metric's description if available, otherwise derives from config.
 */
export function getMetricDescription(
  description: string | null | undefined,
  config: Record<string, unknown>,
): string {
  if (description) return description;
  const kind = getMetricKind(config);
  switch (kind) {
    case "binary":
      return "Binary (yes/no)";
    case "scale":
      return `Scale (1\u2013${config.scaling ?? "?"})`;
    case "category": {
      const cats = Array.isArray(config.categories)
        ? (config.categories as string[])
        : [];
      return cats.length > 0
        ? `Categories: ${cats.join(", ")}`
        : "Category metric";
    }
  }
}

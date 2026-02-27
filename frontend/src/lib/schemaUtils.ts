/**
 * JSON Schema utility functions for data adaptor operations.
 *
 * Provides helpers to extract JSONPaths from a JSON Schema,
 * retrieve sub-schemas at a given path, compute output schemas
 * from adaptor field mappings, and apply data transformations.
 */

/** A single field mapping in a data adaptor. */
export interface AdaptorField {
  /** JSONPath expression pointing into the input schema (e.g. "$.a.b"). */
  schemaPath: string;
  /** Output field name. Defaults to the leaf property name from the path. */
  name: string;
  /** Optional description override for the output field. */
  description?: string;
}

/** Represents a selectable JSONPath option derived from a JSON schema. */
export interface JsonPathOption {
  /** The JSONPath expression (e.g. "$.foo.bar"). */
  path: string;
  /** The property name at this path. */
  name: string;
  /** Description from the schema, if any. */
  description?: string;
  /** The sub-schema at this path. */
  schema: Record<string, unknown>;
}

/**
 * Extract all leaf-level JSONPath options from a JSON Schema.
 *
 * Walks the schema's `properties` recursively and returns an option
 * for every property that is either a leaf (no nested properties)
 * or an intermediate node. This gives the user both leaf and
 * intermediate paths to choose from.
 *
 * @param schema - A JSON Schema object with `properties`.
 * @param prefix - Current path prefix (used in recursion).
 * @returns Array of JSONPath options.
 */
export function extractJsonPaths(
  schema: Record<string, unknown>,
  prefix = "$",
): JsonPathOption[] {
  const results: JsonPathOption[] = [];
  const properties = schema.properties as
    | Record<string, Record<string, unknown>>
    | undefined;

  if (!properties || typeof properties !== "object") {
    return results;
  }

  for (const [key, propSchema] of Object.entries(properties)) {
    const path = `${prefix}.${key}`;
    const option: JsonPathOption = {
      path,
      name: key,
      description: (propSchema.description as string | undefined) ?? undefined,
      schema: propSchema,
    };
    results.push(option);

    // Recurse into nested object properties
    if (
      propSchema.type === "object" &&
      propSchema.properties &&
      typeof propSchema.properties === "object"
    ) {
      const nested = extractJsonPaths(propSchema, path);
      results.push(...nested);
    }
  }

  return results;
}

/**
 * Get the sub-schema at a given JSONPath within a JSON Schema.
 *
 * @param schema - Root JSON Schema.
 * @param path - JSONPath expression (e.g. "$.a.b").
 * @returns The sub-schema at the path, or null if not found.
 */
export function getSubSchemaAtPath(
  schema: Record<string, unknown>,
  path: string,
): Record<string, unknown> | null {
  const parts = path.replace(/^\$\.?/, "").split(".");
  if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) {
    return schema;
  }

  let current: Record<string, unknown> = schema;
  for (const part of parts) {
    const properties = current.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (!properties || !(part in properties)) {
      return null;
    }
    // Safe: we verified `part in properties` above
    current = properties[part]!;
  }
  return current;
}

/**
 * Compute the output JSON Schema from an input schema and adaptor fields.
 *
 * Each adaptor field selects a sub-schema from the input and maps it
 * to a new property name in the output schema.
 *
 * @param inputSchema - The original input JSON Schema.
 * @param fields - Data adaptor field mappings.
 * @returns A new JSON Schema representing the transformed output.
 */
export function computeOutputSchema(
  inputSchema: Record<string, unknown>,
  fields: AdaptorField[],
): Record<string, unknown> {
  const outputProperties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];

  for (const field of fields) {
    const subSchema = getSubSchemaAtPath(inputSchema, field.schemaPath);
    if (!subSchema) continue;

    const outputField: Record<string, unknown> = { ...subSchema };
    if (field.description !== undefined) {
      outputField.description = field.description;
    }

    outputProperties[field.name] = outputField;
    required.push(field.name);
  }

  return {
    type: "object",
    properties: outputProperties,
    ...(required.length > 0 ? { required } : {}),
  };
}

/**
 * Apply a data adaptor transformation to a data object.
 *
 * Extracts values from the input object using the adaptor field paths
 * and maps them to the output field names.
 *
 * @param data - The input data object.
 * @param fields - Data adaptor field mappings.
 * @returns A new object with the transformed data.
 */
export function applyDataAdaptor(
  data: Record<string, unknown>,
  fields: AdaptorField[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of fields) {
    const value = getValueAtPath(data, field.schemaPath);
    if (value !== undefined) {
      result[field.name] = value;
    }
  }

  return result;
}

/**
 * Get a value from a nested object using a JSONPath expression.
 *
 * @param obj - The object to extract from.
 * @param path - JSONPath expression (e.g. "$.a.b").
 * @returns The value at the path, or undefined if not found.
 */
export function getValueAtPath(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  const parts = path.replace(/^\$\.?/, "").split(".");
  if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) {
    return obj;
  }

  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Check whether two JSON Schemas are structurally compatible.
 *
 * Two schemas are compatible if the first schema's required properties
 * are all present in the second schema with matching types.
 * This is a shallow check (one level of properties).
 *
 * @param datasetSchema - The dataset's row schema.
 * @param testSuiteSchema - The test suite's input schema.
 * @returns true if the dataset can be used directly without an adaptor.
 */
export function areSchemasCompatible(
  datasetSchema: Record<string, unknown>,
  testSuiteSchema: Record<string, unknown>,
): boolean {
  const tsProps = testSuiteSchema.properties as
    | Record<string, Record<string, unknown>>
    | undefined;
  const dsProps = datasetSchema.properties as
    | Record<string, Record<string, unknown>>
    | undefined;

  if (!tsProps) return true; // No requirements = always compatible
  if (!dsProps) return Object.keys(tsProps).length === 0;

  const requiredFields =
    (testSuiteSchema.required as string[] | undefined) ??
    Object.keys(tsProps);

  for (const field of requiredFields) {
    if (!(field in dsProps)) return false;
    // Check type compatibility if both specify a type
    const tsType = tsProps[field]?.type;
    const dsType = dsProps[field]?.type;
    if (tsType && dsType && tsType !== dsType) return false;
  }

  return true;
}

/**
 * Get the leaf name from a JSONPath expression.
 *
 * @param path - JSONPath expression (e.g. "$.a.b.c").
 * @returns The last segment (e.g. "c").
 */
export function getPathLeafName(path: string): string {
  const parts = path.replace(/^\$\.?/, "").split(".");
  return parts[parts.length - 1] ?? "";
}

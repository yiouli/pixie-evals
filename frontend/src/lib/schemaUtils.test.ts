import { describe, it, expect } from "vitest";
import {
  extractJsonPaths,
  getSubSchemaAtPath,
  computeOutputSchema,
  applyDataAdaptor,
  getValueAtPath,
  areSchemasCompatible,
  getPathLeafName,
} from "./schemaUtils";
import type { AdaptorField } from "./schemaUtils";

const sampleSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    a: { type: "integer", description: "Field A" },
    b: {
      type: "object",
      description: "Nested object B",
      properties: {
        b1: { type: "string", description: "Sub-field B1" },
        b2: { type: "boolean" },
      },
    },
    c: { type: "string" },
  },
};

describe("extractJsonPaths", () => {
  it("should extract all paths including nested", () => {
    const paths = extractJsonPaths(sampleSchema);
    const pathStrings = paths.map((p) => p.path);
    expect(pathStrings).toContain("$.a");
    expect(pathStrings).toContain("$.b");
    expect(pathStrings).toContain("$.b.b1");
    expect(pathStrings).toContain("$.b.b2");
    expect(pathStrings).toContain("$.c");
  });

  it("should include name and description from schema", () => {
    const paths = extractJsonPaths(sampleSchema);
    const fieldA = paths.find((p) => p.path === "$.a");
    expect(fieldA).toBeDefined();
    expect(fieldA!.name).toBe("a");
    expect(fieldA!.description).toBe("Field A");
  });

  it("should return sub-schema for each path", () => {
    const paths = extractJsonPaths(sampleSchema);
    const b1 = paths.find((p) => p.path === "$.b.b1");
    expect(b1).toBeDefined();
    expect(b1!.schema).toEqual({ type: "string", description: "Sub-field B1" });
  });

  it("should return empty array for schema without properties", () => {
    const paths = extractJsonPaths({ type: "string" });
    expect(paths).toEqual([]);
  });

  it("should return empty array for empty object", () => {
    const paths = extractJsonPaths({});
    expect(paths).toEqual([]);
  });
});

describe("getSubSchemaAtPath", () => {
  it("should return top-level property schema", () => {
    const sub = getSubSchemaAtPath(sampleSchema, "$.a");
    expect(sub).toEqual({ type: "integer", description: "Field A" });
  });

  it("should return nested property schema", () => {
    const sub = getSubSchemaAtPath(sampleSchema, "$.b.b1");
    expect(sub).toEqual({ type: "string", description: "Sub-field B1" });
  });

  it("should return null for non-existent path", () => {
    const sub = getSubSchemaAtPath(sampleSchema, "$.x.y");
    expect(sub).toBeNull();
  });

  it("should return the root schema for path '$'", () => {
    const sub = getSubSchemaAtPath(sampleSchema, "$");
    expect(sub).toBe(sampleSchema);
  });
});

describe("computeOutputSchema", () => {
  it("should build output schema from adaptor fields", () => {
    const fields: AdaptorField[] = [
      { schemaPath: "$.a", name: "a", description: "Field A" },
      { schemaPath: "$.b.b1", name: "c", description: "Renamed B1" },
    ];
    const output = computeOutputSchema(sampleSchema, fields);
    expect(output).toEqual({
      type: "object",
      properties: {
        a: { type: "integer", description: "Field A" },
        c: { type: "string", description: "Renamed B1" },
      },
      required: ["a", "c"],
    });
  });

  it("should skip fields with invalid paths", () => {
    const fields: AdaptorField[] = [
      { schemaPath: "$.nonexistent", name: "x" },
    ];
    const output = computeOutputSchema(sampleSchema, fields);
    expect(output).toEqual({ type: "object", properties: {} });
  });

  it("should handle empty fields array", () => {
    const output = computeOutputSchema(sampleSchema, []);
    expect(output).toEqual({ type: "object", properties: {} });
  });
});

describe("applyDataAdaptor", () => {
  const data = { a: 1, b: { b1: "hello", b2: false } };

  it("should extract and rename fields", () => {
    const fields: AdaptorField[] = [
      { schemaPath: "$.a", name: "a" },
      { schemaPath: "$.b.b1", name: "c" },
    ];
    const result = applyDataAdaptor(data, fields);
    expect(result).toEqual({ a: 1, c: "hello" });
  });

  it("should skip fields with missing paths", () => {
    const fields: AdaptorField[] = [
      { schemaPath: "$.a", name: "a" },
      { schemaPath: "$.x", name: "x" },
    ];
    const result = applyDataAdaptor(data, fields);
    expect(result).toEqual({ a: 1 });
  });
});

describe("getValueAtPath", () => {
  it("should get top-level value", () => {
    expect(getValueAtPath({ x: 42 }, "$.x")).toBe(42);
  });

  it("should get nested value", () => {
    expect(getValueAtPath({ a: { b: "deep" } }, "$.a.b")).toBe("deep");
  });

  it("should return undefined for missing path", () => {
    expect(getValueAtPath({ a: 1 }, "$.b")).toBeUndefined();
  });

  it("should return the whole object for '$' path", () => {
    const obj = { a: 1 };
    expect(getValueAtPath(obj, "$")).toBe(obj);
  });
});

describe("areSchemasCompatible", () => {
  it("should return true when schemas match", () => {
    const ds = {
      type: "object",
      properties: { a: { type: "string" }, b: { type: "number" } },
    };
    const ts = {
      type: "object",
      properties: { a: { type: "string" } },
      required: ["a"],
    };
    expect(areSchemasCompatible(ds, ts)).toBe(true);
  });

  it("should return false when required field is missing", () => {
    const ds = {
      type: "object",
      properties: { b: { type: "number" } },
    };
    const ts = {
      type: "object",
      properties: { a: { type: "string" } },
      required: ["a"],
    };
    expect(areSchemasCompatible(ds, ts)).toBe(false);
  });

  it("should return false when types don't match", () => {
    const ds = {
      type: "object",
      properties: { a: { type: "number" } },
    };
    const ts = {
      type: "object",
      properties: { a: { type: "string" } },
      required: ["a"],
    };
    expect(areSchemasCompatible(ds, ts)).toBe(false);
  });

  it("should return true when test suite has no properties", () => {
    expect(areSchemasCompatible(sampleSchema, { type: "object" })).toBe(true);
  });
});

describe("getPathLeafName", () => {
  it("should return leaf from multi-segment path", () => {
    expect(getPathLeafName("$.a.b.c")).toBe("c");
  });

  it("should return leaf from single-segment path", () => {
    expect(getPathLeafName("$.x")).toBe("x");
  });
});

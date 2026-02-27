import { describe, it, expect } from "vitest";
import {
  parseAdaptorConfig,
  findAdaptorForDataset,
  type DataAdaptor,
} from "./useDataAdaptors";

describe("parseAdaptorConfig", () => {
  it("should parse a valid config", () => {
    const raw = {
      input_schema: {
        type: "object",
        properties: { a: { type: "string" } },
      },
      fields: [
        { name: "a", schema_path: "$.a", description: "Field A" },
        { name: "b", schema_path: "$.b.c" },
      ],
      metadata: { dataset_id: "ds-123" },
    };

    const result = parseAdaptorConfig(raw);
    expect(result).not.toBeNull();
    expect(result!.inputSchema).toEqual(raw.input_schema);
    expect(result!.fields).toHaveLength(2);
    expect(result!.fields[0]).toEqual({
      schemaPath: "$.a",
      name: "a",
      description: "Field A",
    });
    expect(result!.fields[1]).toEqual({
      schemaPath: "$.b.c",
      name: "b",
      description: undefined,
    });
    expect(result!.metadata).toEqual({ dataset_id: "ds-123" });
  });

  it("should return null for null input", () => {
    expect(parseAdaptorConfig(null)).toBeNull();
  });

  it("should return null for non-object input", () => {
    expect(parseAdaptorConfig("string")).toBeNull();
  });

  it("should handle config without metadata", () => {
    const raw = {
      input_schema: {},
      fields: [],
    };
    const result = parseAdaptorConfig(raw);
    expect(result).not.toBeNull();
    expect(result!.metadata).toBeUndefined();
  });
});

describe("findAdaptorForDataset", () => {
  const makeAdaptor = (
    id: string,
    datasetId: string | undefined,
  ): DataAdaptor =>
    ({
      id,
      name: `adaptor-${id}`,
      description: null,
      config: {
        input_schema: {},
        fields: [],
        ...(datasetId ? { metadata: { dataset_id: datasetId } } : {}),
      },
      testSuite: "ts-1",
    }) as unknown as DataAdaptor;

  it("should find adaptor matching dataset ID", () => {
    const adaptors = [
      makeAdaptor("a1", "ds-1"),
      makeAdaptor("a2", "ds-2"),
    ];
    const result = findAdaptorForDataset(adaptors, "ds-2");
    expect(result).toBeDefined();
    expect(result!.id).toBe("a2");
  });

  it("should return undefined when no match", () => {
    const adaptors = [makeAdaptor("a1", "ds-1")];
    const result = findAdaptorForDataset(adaptors, "ds-999");
    expect(result).toBeUndefined();
  });

  it("should handle adaptors without metadata", () => {
    const adaptors = [makeAdaptor("a1", undefined)];
    const result = findAdaptorForDataset(adaptors, "ds-1");
    expect(result).toBeUndefined();
  });
});

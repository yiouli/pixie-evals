import { describe, it, expect } from "vitest";
import {
  getMetricKind,
  getMetricKindLabel,
  getMetricDescription,
  parseMetricConfig,
} from "./metricUtils";

describe("parseMetricConfig", () => {
  it("returns the object as-is when config is a plain object", () => {
    const obj = { type: "scale", scaling: 5 };
    expect(parseMetricConfig(obj)).toEqual(obj);
  });

  it("parses a JSON string into an object", () => {
    const str = '{"type":"category","categories":["Good","Bad"]}';
    expect(parseMetricConfig(str)).toEqual({
      type: "category",
      categories: ["Good", "Bad"],
    });
  });

  it("parses a binary config from JSON string", () => {
    const str = '{"type":"scale","scaling":1}';
    expect(parseMetricConfig(str)).toEqual({ type: "scale", scaling: 1 });
  });

  it("returns empty object for null", () => {
    expect(parseMetricConfig(null)).toEqual({});
  });

  it("returns empty object for undefined", () => {
    expect(parseMetricConfig(undefined)).toEqual({});
  });

  it("returns empty object for invalid JSON string", () => {
    expect(parseMetricConfig("not json")).toEqual({});
  });

  it("returns empty object for a JSON string that parses to a non-object", () => {
    expect(parseMetricConfig('"just a string"')).toEqual({});
    expect(parseMetricConfig("42")).toEqual({});
    expect(parseMetricConfig("[1,2,3]")).toEqual({});
  });

  it("returns empty object for an array value", () => {
    expect(parseMetricConfig([1, 2, 3])).toEqual({});
  });

  it("returns empty object for a number", () => {
    expect(parseMetricConfig(42)).toEqual({});
  });
});

describe("getMetricKind", () => {
  describe("with pre-parsed objects", () => {
    it("returns 'category' for category type", () => {
      expect(
        getMetricKind({ type: "category", categories: ["a", "b"] }),
      ).toBe("category");
    });

    it("returns 'binary' for scale type with scaling=1", () => {
      expect(getMetricKind({ type: "scale", scaling: 1 })).toBe("binary");
    });

    it("returns 'scale' for scale type with scaling>=2", () => {
      expect(getMetricKind({ type: "scale", scaling: 5 })).toBe("scale");
      expect(getMetricKind({ type: "scale", scaling: 10 })).toBe("scale");
    });

    it("returns 'scale' for scale type with no scaling set", () => {
      expect(getMetricKind({ type: "scale" })).toBe("scale");
    });

    it("returns 'scale' as default for unknown type", () => {
      expect(getMetricKind({ type: "unknown" })).toBe("scale");
    });
  });

  describe("with parseMetricConfig round-trip (simulating JSON string from server)", () => {
    it("correctly identifies binary from JSON string config", () => {
      const config = parseMetricConfig('{"type":"scale","scaling":1}');
      expect(getMetricKind(config)).toBe("binary");
    });

    it("correctly identifies scale from JSON string config", () => {
      const config = parseMetricConfig('{"type":"scale","scaling":7}');
      expect(getMetricKind(config)).toBe("scale");
    });

    it("correctly identifies category from JSON string config", () => {
      const config = parseMetricConfig(
        '{"type":"category","categories":["Good","Bad"]}',
      );
      expect(getMetricKind(config)).toBe("category");
    });

    it("defaults to 'scale' for null/empty config", () => {
      expect(getMetricKind(parseMetricConfig(null))).toBe("scale");
      expect(getMetricKind(parseMetricConfig(undefined))).toBe("scale");
    });
  });
});

describe("getMetricKindLabel", () => {
  it("returns correct labels", () => {
    expect(getMetricKindLabel("binary")).toBe("Binary");
    expect(getMetricKindLabel("scale")).toBe("Scale");
    expect(getMetricKindLabel("category")).toBe("Category");
  });
});

describe("getMetricDescription", () => {
  it("returns provided description if available", () => {
    expect(
      getMetricDescription("Custom desc", { type: "scale", scaling: 5 }),
    ).toBe("Custom desc");
  });

  it("returns binary description for binary metrics", () => {
    expect(getMetricDescription(null, { type: "scale", scaling: 1 })).toBe(
      "Binary (yes/no)",
    );
  });

  it("returns scale description with range", () => {
    expect(getMetricDescription(null, { type: "scale", scaling: 5 })).toBe(
      "Scale (1\u20135)",
    );
  });

  it("returns category description with labels", () => {
    expect(
      getMetricDescription(null, {
        type: "category",
        categories: ["Good", "Bad"],
      }),
    ).toBe("Categories: Good, Bad");
  });

  it("returns fallback for category without labels", () => {
    expect(getMetricDescription(null, { type: "category" })).toBe(
      "Category metric",
    );
  });
});

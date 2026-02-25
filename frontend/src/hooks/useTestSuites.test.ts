/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTestSuites } from "./useTestSuites";
import { useTestSuiteStore } from "../lib/store";

describe("useTestSuites", () => {
  beforeEach(() => {
    useTestSuiteStore.setState({ testSuites: [] });
  });

  it("should start with empty test suites", () => {
    const { result } = renderHook(() => useTestSuites());
    expect(result.current.testSuites).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should create a test suite and add it to the store", async () => {
    const { result } = renderHook(() => useTestSuites());

    let id: string = "";
    await act(async () => {
      id = await result.current.createTestSuite({
        name: "My Suite",
        description: "Description",
        metrics: [
          {
            key: "k1",
            name: "Accuracy",
            type: "scale",
            scaleMax: 10,
            categories: [],
          },
        ],
        datasetId: "ds-1",
      });
    });

    expect(id).toBeTruthy();
    expect(result.current.testSuites).toHaveLength(1);
    expect(result.current.testSuites[0]?.name).toBe("My Suite");
    expect(result.current.testSuites[0]?.datasetId).toBe("ds-1");
  });

  it("should reflect store changes from multiple creates", async () => {
    const { result } = renderHook(() => useTestSuites());

    await act(async () => {
      await result.current.createTestSuite({
        name: "Suite A",
        description: "",
        metrics: [],
        datasetId: "ds-1",
      });
    });

    await act(async () => {
      await result.current.createTestSuite({
        name: "Suite B",
        description: "",
        metrics: [],
        datasetId: "ds-2",
      });
    });

    expect(result.current.testSuites).toHaveLength(2);
    expect(result.current.testSuites[0]?.name).toBe("Suite A");
    expect(result.current.testSuites[1]?.name).toBe("Suite B");
  });
});

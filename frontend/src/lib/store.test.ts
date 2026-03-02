/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore, useDatasetStore, useTestSuiteStore } from "./store";
import type { MetricConfig } from "../components/MetricEditor";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

function makeMetric(overrides: Partial<MetricConfig> = {}): MetricConfig {
  return {
    key: "test-key",
    name: "Accuracy",
    type: "scale",
    scaleMax: 10,
    categories: [],
    ...overrides,
  };
}

describe("useAuthStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    useAuthStore.setState({ isAuthenticated: false, token: null, username: null });
  });

  it("should start unauthenticated when no persisted token exists", () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.username).toBeNull();
  });

  it("should login and persist token and username", () => {
    useAuthStore.getState().login("my-jwt-token", "alice");
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe("my-jwt-token");
    expect(state.username).toBe("alice");
    expect(localStorageMock.getItem("pixie-evals-auth-token")).toBe(
      "my-jwt-token",
    );
    expect(localStorageMock.getItem("pixie-evals-auth-username")).toBe(
      "alice",
    );
  });

  it("should logout and clear persisted token and username", () => {
    useAuthStore.getState().login("my-jwt-token", "alice");
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.username).toBeNull();
    expect(localStorageMock.getItem("pixie-evals-auth-token")).toBeNull();
    expect(localStorageMock.getItem("pixie-evals-auth-username")).toBeNull();
  });
});

describe("useDatasetStore", () => {
  beforeEach(() => {
    useDatasetStore.setState({ currentDatasetId: null });
  });

  it("should start with no current dataset", () => {
    expect(useDatasetStore.getState().currentDatasetId).toBeNull();
  });

  it("should set current dataset", () => {
    useDatasetStore.getState().setCurrentDataset("dataset-123");
    expect(useDatasetStore.getState().currentDatasetId).toBe("dataset-123");
  });

  it("should clear current dataset", () => {
    useDatasetStore.getState().setCurrentDataset("dataset-123");
    useDatasetStore.getState().clearCurrentDataset();
    expect(useDatasetStore.getState().currentDatasetId).toBeNull();
  });
});

describe("useTestSuiteStore", () => {
  beforeEach(() => {
    useTestSuiteStore.setState({ testSuites: [] });
  });

  it("should start with empty test suites", () => {
    expect(useTestSuiteStore.getState().testSuites).toEqual([]);
  });

  it("should add a test suite", () => {
    const suite = {
      id: "ts-1",
      name: "My Suite",
      description: "A test suite",
      metrics: [makeMetric()],
      datasetId: "ds-1",
      createdAt: "2025-01-01T00:00:00Z",
    };
    useTestSuiteStore.getState().addTestSuite(suite);
    expect(useTestSuiteStore.getState().testSuites).toHaveLength(1);
    expect(useTestSuiteStore.getState().testSuites[0]).toEqual(suite);
  });

  it("should remove a test suite by id", () => {
    const suite1 = {
      id: "ts-1",
      name: "Suite 1",
      description: "",
      metrics: [],
      datasetId: "ds-1",
      createdAt: "2025-01-01T00:00:00Z",
    };
    const suite2 = {
      id: "ts-2",
      name: "Suite 2",
      description: "",
      metrics: [],
      datasetId: "ds-2",
      createdAt: "2025-01-02T00:00:00Z",
    };
    useTestSuiteStore.getState().addTestSuite(suite1);
    useTestSuiteStore.getState().addTestSuite(suite2);
    useTestSuiteStore.getState().removeTestSuite("ts-1");
    const remaining = useTestSuiteStore.getState().testSuites;
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.id).toBe("ts-2");
  });

  it("should find a test suite by id", () => {
    const suite = {
      id: "ts-1",
      name: "Suite 1",
      description: "",
      metrics: [],
      datasetId: "ds-1",
      createdAt: "2025-01-01T00:00:00Z",
    };
    useTestSuiteStore.getState().addTestSuite(suite);
    expect(useTestSuiteStore.getState().getTestSuite("ts-1")).toEqual(suite);
    expect(useTestSuiteStore.getState().getTestSuite("missing")).toBeUndefined();
  });
});

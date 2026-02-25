/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTestSuites } from "./useTestSuites";

// Mock Apollo Client
const mockQuery = vi.fn();
const mockMutate = vi.fn();

vi.mock("@apollo/client", async () => {
  const actual = await vi.importActual("@apollo/client");
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockQuery(...args),
  };
});

vi.mock("../lib/apolloClient", () => ({
  remoteClient: {
    mutate: (...args: unknown[]) => mockMutate(...args),
  },
}));

describe("useTestSuites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReturnValue({
      data: { listTestSuites: [] },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });
  });

  it("should start with empty test suites when query returns empty", () => {
    const { result } = renderHook(() => useTestSuites());
    expect(result.current.testSuites).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should return test suites from the server query", () => {
    mockQuery.mockReturnValue({
      data: {
        listTestSuites: [
          { id: "ts-1", name: "Suite A", description: "Desc A" },
          { id: "ts-2", name: "Suite B", description: null },
        ],
      },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useTestSuites());
    expect(result.current.testSuites).toHaveLength(2);
    expect(result.current.testSuites[0]?.name).toBe("Suite A");
    expect(result.current.testSuites[1]?.name).toBe("Suite B");
  });

  it("should create a test suite via remote mutation", async () => {
    const refetch = vi.fn();
    mockQuery.mockReturnValue({
      data: { listTestSuites: [] },
      loading: false,
      error: undefined,
      refetch,
    });
    mockMutate.mockResolvedValue({
      data: { createTestSuite: "new-ts-id" },
    });

    const { result } = renderHook(() => useTestSuites());

    let id: string = "";
    await act(async () => {
      id = await result.current.createTestSuite({
        name: "My Suite",
        description: "Description",
        metrics: [],
        metricIds: ["m-1"],
        datasetId: "ds-1",
        inputSchema: { type: "object" },
      });
    });

    expect(id).toBe("new-ts-id");
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(refetch).toHaveBeenCalled();
  });

  it("should report loading state", () => {
    mockQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useTestSuites());
    expect(result.current.loading).toBe(true);
    expect(result.current.testSuites).toEqual([]);
  });
});

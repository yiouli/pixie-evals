import { create } from "zustand";
import type { MetricConfig } from "../components/MetricEditor";

// --- Token persistence ---
const TOKEN_KEY = "pixie-evals-auth-token";

function getPersistedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function persistToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // localStorage unavailable — ignore
  }
}

const initialToken = getPersistedToken();

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!initialToken,
  token: initialToken,
  login: (token: string) => {
    persistToken(token);
    set({ isAuthenticated: true, token });
  },
  logout: () => {
    persistToken(null);
    set({ isAuthenticated: false, token: null });
  },
}));

interface DatasetState {
  currentDatasetId: string | null;
  setCurrentDataset: (id: string | null) => void;
  clearCurrentDataset: () => void;
}

export const useDatasetStore = create<DatasetState>((set) => ({
  currentDatasetId: null,
  setCurrentDataset: (id: string | null) => set({ currentDatasetId: id }),
  clearCurrentDataset: () => set({ currentDatasetId: null }),
}));

/** A locally-managed test suite (created before remote persistence is wired). */
export interface TestSuiteInfo {
  id: string;
  name: string;
  description: string;
  metrics: MetricConfig[];
  datasetId: string;
  createdAt: string;
}

interface TestSuiteState {
  testSuites: TestSuiteInfo[];
  addTestSuite: (suite: TestSuiteInfo) => void;
  removeTestSuite: (id: string) => void;
  getTestSuite: (id: string) => TestSuiteInfo | undefined;
}

export const useTestSuiteStore = create<TestSuiteState>((set, get) => ({
  testSuites: [],
  addTestSuite: (suite: TestSuiteInfo) =>
    set((state) => ({ testSuites: [...state.testSuites, suite] })),
  removeTestSuite: (id: string) =>
    set((state) => ({
      testSuites: state.testSuites.filter((s) => s.id !== id),
    })),
  getTestSuite: (id: string) => get().testSuites.find((s) => s.id === id),
}));

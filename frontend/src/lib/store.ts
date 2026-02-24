import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: null,
  login: (token: string) => set({ isAuthenticated: true, token }),
  logout: () => set({ isAuthenticated: false, token: null }),
}));

interface DatasetState {
  currentDatasetId: string | null;
  setCurrentDataset: (id: string) => void;
  clearCurrentDataset: () => void;
}

export const useDatasetStore = create<DatasetState>((set) => ({
  currentDatasetId: null,
  setCurrentDataset: (id: string) => set({ currentDatasetId: id }),
  clearCurrentDataset: () => set({ currentDatasetId: null }),
}));

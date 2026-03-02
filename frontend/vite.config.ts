import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Output directly into the SDK package so it gets bundled for PyPI
    outDir: "../sdk/pixie_sdk/dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy SDK server requests during development
      "/sdk": {
        target: "http://localhost:8100",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sdk/, ""),
      },
    },
  },
});

import { Routes, Route, Navigate } from "react-router-dom";
import { Box } from "@mui/material";

import { useAuthStore } from "./lib/store";
import { SignInModal } from "./components/SignInModal";
import { AppHeader } from "./components/AppHeader";
import { SelectionView } from "./components/SelectionView";
import { DatasetView } from "./components/DatasetView";
import { TestSuiteView } from "./components/TestSuiteView";

/**
 * Root application component with route definitions.
 *
 * The SignInModal overlays on any view when the user is not
 * authenticated. The AppHeader is always rendered at the top.
 * Navigation:
 *   /                     → Landing / selection view
 *   /dataset/:datasetId   → Dataset detail view
 *   /test-suite/:id       → Test suite detail view
 */
export function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <>
      <SignInModal open={!isAuthenticated} />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <AppHeader />
        <Box sx={{ flex: 1, overflow: "auto" }}>
          <Routes>
            <Route path="/" element={<SelectionView />} />
            <Route path="/dataset/:datasetId" element={<DatasetView />} />
            <Route
              path="/test-suite/:testSuiteId"
              element={<TestSuiteView />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </Box>
    </>
  );
}

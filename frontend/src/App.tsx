import { Routes, Route, Navigate } from "react-router-dom";

import { Login } from "./components/Login";
import { FileUpload } from "./components/FileUpload";
import { TestSuiteCreation } from "./components/TestSuiteCreation";
import { EvaluationView } from "./components/EvaluationView";

/**
 * Root application component with route definitions.
 */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/upload" element={<FileUpload />} />
      <Route path="/create" element={<TestSuiteCreation />} />
      <Route path="/evaluation/:testSuiteId" element={<EvaluationView />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

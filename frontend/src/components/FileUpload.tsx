import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from "@mui/material";
import { CloudUpload as UploadIcon } from "@mui/icons-material";
import { useDatasetStore } from "../lib/store";

/**
 * File upload component.
 *
 * Allows the user to select a data file (JSON, CSV, Parquet, etc.)
 * and upload it to the local SDK server for ingestion.
 */
export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const setCurrentDataset = useDatasetStore((state) => state.setCurrentDataset);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Upload file to SDK server
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:8100/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { file_name, file_path } = await response.json();

      // TODO: Call GraphQL mutation to ingest the file
      // For now, we'll navigate to test suite creation with mock data
      setCurrentDataset("mock-dataset-id");
      navigate("/create");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Upload Dataset
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Select a data file (JSON, JSONL, CSV, or Parquet) to create a test suite.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            border: "2px dashed #ccc",
            borderRadius: 2,
            p: 4,
            textAlign: "center",
            mb: 2,
          }}
        >
          <input
            type="file"
            accept=".json,.jsonl,.csv,.parquet"
            onChange={handleFileChange}
            style={{ display: "none" }}
            id="file-input"
          />
          <label htmlFor="file-input">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadIcon />}
            >
              Choose File
            </Button>
          </label>

          {file && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              Selected: {file.name}
            </Typography>
          )}
        </Box>

        <Button
          fullWidth
          variant="contained"
          onClick={handleUpload}
          disabled={!file || loading}
        >
          {loading ? <CircularProgress size={24} /> : "Upload and Continue"}
        </Button>
      </Paper>
    </Box>
  );
}

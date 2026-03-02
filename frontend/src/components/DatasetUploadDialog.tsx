import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  alpha,
  useTheme,
} from "@mui/material";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import { useDatasetUpload } from "../hooks/useDatasetUpload";

interface DatasetUploadDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful upload with the new dataset ID. */
  onSuccess?: (datasetId: string) => void;
}

const ACCEPTED_TYPES = ".json,.csv,.tsv";

/**
 * Dataset upload dialog with drag-and-drop support.
 *
 * Accepts JSON, CSV, and TSV files. Uploads to the local SDK server
 * via GraphQL multipart mutation.
 */
export function DatasetUploadDialog({
  open,
  onClose,
  onSuccess,
}: DatasetUploadDialogProps) {
  const theme = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, uploading, error, reset } = useDatasetUpload();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setFile(null);
      setDragActive(false);
      reset();
    }
  }, [open, reset]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const result = await uploadFile(file);
    if (result) {
      onSuccess?.(result.id);
    }
  };

  const handleClose = () => {
    setFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Dataset</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        )}

        <Box
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          sx={{
            border: `2px dashed ${dragActive ? theme.palette.primary.main : theme.palette.divider}`,
            borderRadius: 3,
            p: 6,
            textAlign: "center",
            cursor: "pointer",
            bgcolor: dragActive
              ? alpha(theme.palette.primary.main, 0.05)
              : "transparent",
            transition: "all 0.2s",
            "&:hover": {
              borderColor: theme.palette.primary.main,
              bgcolor: alpha(theme.palette.primary.main, 0.02),
            },
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {file ? (
            <Box>
              <InsertDriveFileRoundedIcon
                sx={{ fontSize: 48, color: "primary.main", mb: 1 }}
              />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {file.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {(file.size / 1024).toFixed(1)} KB
              </Typography>
            </Box>
          ) : (
            <Box>
              <CloudUploadRoundedIcon
                sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
              />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Drag &amp; drop a file here, or click to browse
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                Accepts JSON, CSV, TSV files
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!file || uploading}
          startIcon={
            uploading ? <CircularProgress size={16} /> : undefined
          }
        >
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

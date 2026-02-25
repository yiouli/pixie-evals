import { useState, useRef, useEffect } from "react";
import {
  Typography,
  TextField,
  Box,
  type TypographyProps,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";

interface EditableTextProps {
  /** Current text value. */
  value: string;
  /** Called when the user confirms a change. */
  onSave: (value: string) => void;
  /** Typography variant for display mode. */
  variant?: TypographyProps["variant"];
  /** Placeholder shown when value is empty. */
  placeholder?: string;
  /** Allow multi-line editing. */
  multiline?: boolean;
}

/**
 * Click-to-edit text component.
 *
 * Renders as Typography in display mode. On click, switches to a
 * TextField. Saves on blur or Enter (single-line). Cancels on Escape.
 */
export function EditableText({
  value,
  onSave,
  variant = "h4",
  placeholder = "Click to edit",
  multiline = false,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value) {
      onSave(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      handleSave();
    }
    if (e.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <TextField
        inputRef={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        multiline={multiline}
        rows={multiline ? 3 : 1}
        fullWidth
        variant="standard"
        placeholder={placeholder}
        sx={{ mb: 1 }}
      />
    );
  }

  const isHeading = typeof variant === "string" && variant.startsWith("h");

  return (
    <Box
      onClick={() => setEditing(true)}
      sx={{
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 1,
        "&:hover": { "& .edit-icon": { opacity: 1 } },
      }}
    >
      <Typography
        variant={variant}
        sx={{
          fontWeight: isHeading ? 600 : undefined,
          color: value ? "text.primary" : "text.secondary",
          fontStyle: value ? "normal" : "italic",
        }}
      >
        {value || placeholder}
      </Typography>
      <EditRoundedIcon
        className="edit-icon"
        fontSize="small"
        sx={{
          opacity: 0,
          transition: "opacity 0.2s",
          color: "text.secondary",
        }}
      />
    </Box>
  );
}

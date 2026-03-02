import { useState, useMemo, useCallback } from "react";
import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Autocomplete,
  Paper,
  Chip,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import {
  extractJsonPaths,
  getSubSchemaAtPath,
  type AdaptorField,
  type JsonPathOption,
} from "../lib/schemaUtils";

interface DataAdaptorEditorProps {
  /** The input JSON schema to extract paths from (dataset row schema). */
  inputSchema: Record<string, unknown>;
  /** The current list of adaptor fields. */
  fields: AdaptorField[];
  /** Called when the fields list changes. */
  onChange: (fields: AdaptorField[]) => void;
  /** Pre-filled adaptor name. */
  name: string;
  /** Called when the name changes. */
  onNameChange: (name: string) => void;
}

/**
 * Data adaptor field mapping editor.
 *
 * Displays an editable list of transformation rules. Each rule has a
 * JSONPath autocomplete (options from the input schema), plus editable
 * name and description fields that are pre-filled from the selected
 * sub-schema.
 */
export function DataAdaptorEditor({
  inputSchema,
  fields,
  onChange,
  name,
  onNameChange,
}: DataAdaptorEditorProps) {
  // Memoize the available JSONPath options from the input schema
  const pathOptions = useMemo(
    () => extractJsonPaths(inputSchema),
    [inputSchema],
  );

  const handleAddField = useCallback(() => {
    onChange([...fields, { schemaPath: "", name: "", description: "" }]);
  }, [fields, onChange]);

  const handleRemoveField = useCallback(
    (index: number) => {
      onChange(fields.filter((_, i) => i !== index));
    },
    [fields, onChange],
  );

  const handleFieldChange = useCallback(
    (index: number, update: Partial<AdaptorField>) => {
      const updated = fields.map((f, i) =>
        i === index ? { ...f, ...update } : f,
      );
      onChange(updated);
    },
    [fields, onChange],
  );

  const handlePathSelect = useCallback(
    (index: number, option: JsonPathOption | null) => {
      if (!option) {
        handleFieldChange(index, { schemaPath: "", name: "", description: "" });
        return;
      }
      handleFieldChange(index, {
        schemaPath: option.path,
        name: option.name,
        description: option.description ?? "",
      });
    },
    [handleFieldChange],
  );

  return (
    <Box>
      {/* Adaptor name */}
      <TextField
        fullWidth
        label="Data Adaptor Name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        margin="normal"
        size="small"
        required
      />

      {/* Field mappings header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mt: 2, mb: 1 }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Field Mappings
        </Typography>
        <Button
          size="small"
          startIcon={<AddRoundedIcon />}
          onClick={handleAddField}
        >
          Add Field
        </Button>
      </Stack>

      {fields.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No field mappings defined. Click "Add Field" to start.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {fields.map((field, index) => (
            <AdaptorFieldRow
              key={index}
              field={field}
              index={index}
              pathOptions={pathOptions}
              inputSchema={inputSchema}
              onChange={handleFieldChange}
              onPathSelect={handlePathSelect}
              onRemove={handleRemoveField}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

interface AdaptorFieldRowProps {
  field: AdaptorField;
  index: number;
  pathOptions: JsonPathOption[];
  inputSchema: Record<string, unknown>;
  onChange: (index: number, update: Partial<AdaptorField>) => void;
  onPathSelect: (index: number, option: JsonPathOption | null) => void;
  onRemove: (index: number) => void;
}

/**
 * A single row in the adaptor field list.
 *
 * Shows JSONPath autocomplete, and once a valid path is selected,
 * renders the sub-schema type chip plus editable name/description fields.
 */
function AdaptorFieldRow({
  field,
  index,
  pathOptions,
  inputSchema,
  onChange,
  onPathSelect,
  onRemove,
}: AdaptorFieldRowProps) {
  const [inputValue, setInputValue] = useState(field.schemaPath);

  // Look up the sub-schema to display type info
  const subSchema = useMemo(() => {
    if (!field.schemaPath) return null;
    return getSubSchemaAtPath(inputSchema, field.schemaPath);
  }, [inputSchema, field.schemaPath]);

  const selectedOption = useMemo(
    () => pathOptions.find((o) => o.path === field.schemaPath) ?? null,
    [pathOptions, field.schemaPath],
  );

  const schemaType = subSchema
    ? (subSchema.type as string) ?? "unknown"
    : null;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        {/* Row header with remove button */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Field {index + 1}
          </Typography>
          <Tooltip title="Remove field">
            <IconButton
              size="small"
              color="error"
              onClick={() => onRemove(index)}
              aria-label={`remove field ${index + 1}`}
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* JSONPath autocomplete */}
        <Autocomplete
          size="small"
          options={pathOptions}
          getOptionLabel={(option) => option.path}
          renderOption={(props, option) => {
            const { key, ...rest } = props;
            return (
              <li key={key} {...rest}>
                <Stack>
                  <Typography variant="body2">{option.path}</Typography>
                  {option.description && (
                    <Typography variant="caption" color="text.secondary">
                      {option.description}
                    </Typography>
                  )}
                </Stack>
              </li>
            );
          }}
          value={selectedOption}
          inputValue={inputValue}
          onInputChange={(_, newValue) => setInputValue(newValue)}
          onChange={(_, newValue) => onPathSelect(index, newValue)}
          isOptionEqualToValue={(opt, val) => opt.path === val.path}
          renderInput={(params) => (
            <TextField {...params} label="JSONPath" placeholder="$.field.path" />
          )}
        />

        {/* Once a valid path is selected, show type + name + description */}
        {field.schemaPath && subSchema && (
          <>
            {/* Schema type chip */}
            {schemaType && (
              <Chip
                label={`Type: ${schemaType}`}
                size="small"
                variant="outlined"
                color="info"
                sx={{ alignSelf: "flex-start" }}
              />
            )}

            {/* Name field */}
            <TextField
              size="small"
              label="Output Field Name"
              value={field.name}
              onChange={(e) => onChange(index, { name: e.target.value })}
              required
              error={!field.name.trim()}
              helperText={!field.name.trim() ? "Name is required" : ""}
            />

            {/* Description field */}
            <TextField
              size="small"
              label="Description (optional)"
              value={field.description ?? ""}
              onChange={(e) => onChange(index, { description: e.target.value })}
              multiline
              maxRows={2}
            />
          </>
        )}
      </Stack>
    </Paper>
  );
}

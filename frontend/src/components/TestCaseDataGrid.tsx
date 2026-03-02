import { useMemo } from "react";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import { Box, IconButton, Tooltip } from "@mui/material";
import LabelRoundedIcon from "@mui/icons-material/LabelRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

interface TestCaseDataGridProps {
  /** Row data — must include an `id` field. */
  rows: Array<Record<string, unknown> & { id: string }>;
  /** Whether to show the actions column. */
  showActions?: boolean;
  /** Callback when "Label" action is clicked. */
  onLabel?: (id: string) => void;
  /** Callback when "Delete" action is clicked. */
  onDelete?: (id: string) => void;
  /** Loading state. */
  loading?: boolean;
}

/**
 * Paginated data grid showing test cases with their labels.
 *
 * Columns are auto-detected from the first row. When `showActions`
 * is true, a trailing actions column renders icon buttons.
 */
export function TestCaseDataGrid({
  rows,
  showActions = false,
  onLabel,
  onDelete,
  loading = false,
}: TestCaseDataGridProps) {
  const columns = useMemo<GridColDef[]>(() => {
    // Auto-detect data columns from first row
    const firstRow = rows[0];
    const dataCols: GridColDef[] = [];

    if (firstRow) {
      for (const key of Object.keys(firstRow)) {
        if (key === "id") continue;
        dataCols.push({
          field: key,
          headerName:
            key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
          flex: 1,
          minWidth: 120,
          renderCell: (params: GridRenderCellParams) => {
            const val = params.value;
            if (val === null || val === undefined) return "-";
            if (typeof val === "object") return JSON.stringify(val);
            return String(val);
          },
        });
      }
    }

    // Optional actions column
    if (showActions) {
      dataCols.push({
        field: "actions",
        headerName: "Actions",
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams) => (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {onLabel && (
              <Tooltip title="Label">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => onLabel(String(params.id))}
                  >
                    <LabelRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Delete">
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDelete(String(params.id))}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        ),
      });
    }

    return dataCols;
  }, [rows, showActions, onLabel, onDelete]);

  return (
    <Box sx={{ height: 500, width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25 },
          },
        }}
        pageSizeOptions={[25, 50, 100]}
        disableRowSelectionOnClick
      />
    </Box>
  );
}

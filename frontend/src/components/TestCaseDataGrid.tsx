import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Box, Button, Chip } from "@mui/material";

/**
 * Paginated data grid showing test cases with their labels.
 *
 * Uses MUI X DataGrid for pagination, sorting, and action buttons
 * (delete, label, run evaluator) per row.
 */

interface TestCaseDataGridProps {
  /** Test suite ID for context. */
  testSuiteId: string;
}

export function TestCaseDataGrid({ testSuiteId }: TestCaseDataGridProps) {
  // TODO: Fetch real data from SDK/remote server
  const rows = [
    {
      id: "1",
      description: "Test case 1",
      label: null,
      labeled_at: null,
    },
    {
      id: "2",
      description: "Test case 2",
      label: 8,
      labeled_at: "2024-01-15",
    },
  ];

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 100 },
    { field: "description", headerName: "Description", flex: 1 },
    {
      field: "label",
      headerName: "Label",
      width: 120,
      renderCell: (params) =>
        params.value ? (
          <Chip label={params.value} color="primary" size="small" />
        ) : (
          <Chip label="Unlabeled" variant="outlined" size="small" />
        ),
    },
    { field: "labeled_at", headerName: "Labeled At", width: 150 },
    {
      field: "actions",
      headerName: "Actions",
      width: 250,
      renderCell: () => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button size="small" variant="outlined">
            Label
          </Button>
          <Button size="small" variant="outlined" color="error">
            Delete
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ height: 500, width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25 },
          },
        }}
        pageSizeOptions={[25, 50, 100]}
        checkboxSelection
        disableRowSelectionOnClick
      />
    </Box>
  );
}

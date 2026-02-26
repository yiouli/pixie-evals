import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  Stack,
  Chip,
  alpha,
  useTheme,
  Fade,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import { DatasetUploadDialog } from "./DatasetUploadDialog";
import { TestSuiteConfigDialog } from "./TestSuiteConfigDialog";
import { useDatasets } from "../hooks/useDatasets";
import { useTestSuites } from "../hooks/useTestSuites";

/** A single item in a collection tab. */
interface CollectionItem {
  id: string;
  title: string;
  description: string;
}

/** A tab representing a category of items (test suites or datasets). */
interface Collection {
  key: string;
  title: string;
  color: string;
  items: CollectionItem[];
  onItemClick: (id: string) => void;
}

/**
 * Landing / selection view.
 *
 * Closely resembles pixie-ui's SelectionScreen. Displays two tabs—
 * "Test Suites" and "Datasets"—each with a searchable grid of cards.
 * The "Add" button opens the appropriate dialog (upload dataset or
 * configure a test suite) instead of showing instructions.
 */
export function SelectionView() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  const { datasets } = useDatasets();
  const { testSuites } = useTestSuites();

  // Build collection definitions
  const collections = useMemo<Collection[]>(
    () => [
      {
        key: "datasets",
        title: "Datasets",
        color: theme.palette.secondary.main,
        items: datasets.map((ds) => ({
          id: ds.id,
          title: ds.fileName,
          description: `Uploaded ${new Date(ds.createdAt).toLocaleDateString()}`,
        })),
        onItemClick: (id: string) => navigate(`/dataset/${id}`),
      },
      {
        key: "test-suites",
        title: "Evaluations",
        color: theme.palette.primary.main,
        items: testSuites.map((ts) => ({
          id: ts.id as string,
          title: ts.name,
          description: ts.description || "No description",
        })),
        onItemClick: (id: string) => navigate(`/test-suite/${id}`),
      },
    ],
    [datasets, testSuites, navigate, theme],
  );

  const selectedCollection = collections[tabIndex];

  const filteredItems = useMemo(() => {
    if (!selectedCollection) return [];
    const sorted = [...selectedCollection.items].sort((a, b) =>
      a.title.localeCompare(b.title),
    );
    if (!searchQuery.trim()) return sorted;
    const query = searchQuery.toLowerCase();
    return sorted.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query),
    );
  }, [searchQuery, selectedCollection]);

  const handleAddClick = () => {
    if (tabIndex === 0) {
      setUploadDialogOpen(true);
    } else {
      setConfigDialogOpen(true);
    }
  };

  const addLabel =
    selectedCollection?.title.replace(/s$/, "") ?? "Item";

  const emptyMessage = searchQuery
    ? `No ${selectedCollection?.title.toLowerCase() ?? "items"} match your search`
    : `No ${selectedCollection?.title.toLowerCase() ?? "items"} yet`;

  return (
    <Box sx={{ height: "100%", width: "100%", overflowY: "auto", pt: 2 }}>
      <Fade in timeout={500}>
        <Container maxWidth="lg">
          {/* Search bar */}
          <TextField
            fullWidth
            placeholder={`Search ${selectedCollection?.title.toLowerCase() ?? "items"}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!selectedCollection || selectedCollection.items.length === 0}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: alpha(theme.palette.background.paper, 0.7),
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <Button
                      onClick={() => setSearchQuery("")}
                      size="small"
                      sx={{ textTransform: "none" }}
                    >
                      Clear
                    </Button>
                  </InputAdornment>
                ) : null,
              },
            }}
          />

          {/* Tabs + Add button */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mt: 1, mb: 3 }}
          >
            <Tabs
              value={tabIndex}
              onChange={(_, newIndex: number) => setTabIndex(newIndex)}
            >
              {collections.map((col, idx) => (
                <Tab
                  key={col.key}
                  label={
                    <Stack direction="row" alignItems="center" gap={1}>
                      {idx === 0 ? (
                        <ScienceRoundedIcon fontSize="small" />
                      ) : (
                        <StorageRoundedIcon fontSize="small" />
                      )}
                      <span>{col.title}</span>
                      <Chip
                        label={col.items.length}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.75rem",
                          bgcolor: alpha(col.color, 0.1),
                          color: col.color,
                          fontWeight: 600,
                        }}
                      />
                    </Stack>
                  }
                  value={idx}
                  sx={{
                    "&.Mui-selected": { color: col.color },
                  }}
                />
              ))}
            </Tabs>
            <Button
              variant="outlined"
              sx={{ borderRadius: 2, textTransform: "none" }}
              size="small"
              startIcon={<AddRoundedIcon />}
              onClick={handleAddClick}
            >
              Add {addLabel}
            </Button>
          </Stack>

          {/* Content area */}
          {filteredItems.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Typography
                variant="h6"
                color="text.secondary"
                gutterBottom
              >
                {emptyMessage}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={handleAddClick}
                sx={{ mt: 2 }}
              >
                Add {addLabel}
              </Button>
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                },
                gap: 3,
              }}
            >
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  onClick={() => selectedCollection?.onItemClick(item.id)}
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    bgcolor: "transparent",
                    boxShadow: "none",
                    border: `2px solid ${theme.palette.divider}`,
                    borderRadius: 4,
                    "&:hover": {
                      borderColor: selectedCollection?.color,
                      bgcolor: alpha(
                        selectedCollection?.color ??
                          theme.palette.primary.main,
                        0.05,
                      ),
                      "& .arrow-icon": {
                        color: selectedCollection?.color,
                      },
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        mb: 1,
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {item.title}
                      </Typography>
                      <ArrowOutwardRoundedIcon
                        className="arrow-icon"
                        sx={{
                          color: "text.secondary",
                          transition: "color 0.2s ease-in-out",
                          fontSize: 20,
                        }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        lineHeight: 1.6,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {item.description}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Container>
      </Fade>

      {/* Dialogs */}
      <DatasetUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onSuccess={(datasetId) => {
          setUploadDialogOpen(false);
          navigate(`/dataset/${datasetId}`);
        }}
      />

      <TestSuiteConfigDialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        onSuccess={(testSuiteId) => {
          setConfigDialogOpen(false);
          navigate(`/test-suite/${testSuiteId}`);
        }}
      />
    </Box>
  );
}

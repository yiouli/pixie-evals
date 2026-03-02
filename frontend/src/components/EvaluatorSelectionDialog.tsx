import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useQuery } from "@apollo/client";
import { remoteClient } from "../lib/apolloClient";
import { useAuthStore } from "../lib/store";
import { LIST_EVALUATORS } from "../graphql/remote/query";
import type { ListEvaluatorsQuery } from "../generated/remote/graphql";

/** A single evaluator item derived from the LIST_EVALUATORS query result. */
type EvaluatorItem = ListEvaluatorsQuery["listEvaluators"][number];

interface EvaluatorSelectionDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Called when the dialog should close. */
  onClose: () => void;
  /** UUID of the test suite whose evaluators to list. */
  testSuiteId: string;
  /** Called when an evaluator is selected. */
  onSelect?: (evaluatorId: string) => void;
}

/**
 * Dialog for selecting an evaluator from the list of evaluators
 * associated with a test suite.
 *
 * Lists all evaluators for the given test suite with their name,
 * description, and last updated time. Clicking an evaluator calls
 * onSelect with its ID.
 */
export function EvaluatorSelectionDialog({
  open,
  onClose,
  testSuiteId,
  onSelect,
}: EvaluatorSelectionDialogProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data, loading, error } = useQuery(LIST_EVALUATORS, {
    client: remoteClient,
    variables: { testSuiteId },
    skip: !testSuiteId || !isAuthenticated || !open,
  });

  const evaluators: EvaluatorItem[] = data?.listEvaluators ?? [];

  const handleSelect = (evaluatorId: string) => {
    onSelect?.(evaluatorId);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Select Evaluator</DialogTitle>
      <DialogContent>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load evaluators: {error.message}
          </Alert>
        )}

        {!loading && !error && evaluators.length === 0 && (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              No evaluators available for this evaluation.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Train an evaluator first to enable AI evaluation.
            </Typography>
          </Box>
        )}

        {!loading && evaluators.length > 0 && (
          <List>
            {evaluators.map((ev) => (
              <ListItemButton
                key={ev.id as string}
                onClick={() => handleSelect(ev.id as string)}
                sx={{ borderRadius: 1, mb: 1 }}
              >
                <ListItemText
                  primary={ev.name}
                  secondary={
                    <>
                      {ev.description && (
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                        >
                          {ev.description}
                        </Typography>
                      )}
                      {ev.updatedAt && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block" }}
                        >
                          Updated:{" "}
                          {new Date(ev.updatedAt as string).toLocaleString()}
                        </Typography>
                      )}
                    </>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}

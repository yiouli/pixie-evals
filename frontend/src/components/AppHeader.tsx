import {
  Avatar,
  Box,
  Button,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useAuth } from "../hooks";

/**
 * Extracts the first character of a username as an uppercase initial.
 * Falls back to "?" if the username is empty or null.
 */
function getInitial(username: string | null): string {
  if (!username || username.length === 0) return "?";
  return username.charAt(0).toUpperCase();
}

/**
 * Application header for Pixie Evals.
 *
 * Renders the Pixie logo and brand name on the left, and a
 * user avatar + sign-out button on the right when authenticated.
 * Layout and styling match the pixie-ui AppHeader.
 */
export function AppHeader() {
  const { isAuthenticated, username, logout } = useAuth();

  return (
    <Stack
      direction="row"
      width="100%"
      maxWidth="lg"
      height={64}
      justifyContent="space-between"
      alignItems="center"
      spacing={2}
      p={1}
      pr={3}
    >
      {/* Left: Logo + brand name */}
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          userSelect: "none",
          cursor: "pointer",
        }}
      >
        <Box
          component="img"
          src="/pixie.png"
          alt="Pixie Logo"
          sx={{
            width: 48,
            height: 48,
          }}
        />
        <Typography
          variant="h5"
          sx={{
            fontFamily: "monospace",
            fontWeight: 600,
          }}
        >
          Pixie
        </Typography>
      </Stack>

      {/* Right: Avatar + Sign Out */}
      {isAuthenticated && (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title={username ?? "User"}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: 14,
                bgcolor: "primary.main",
              }}
            >
              {getInitial(username)}
            </Avatar>
          </Tooltip>
          <Button
            variant="text"
            size="small"
            startIcon={<LogoutRoundedIcon />}
            onClick={logout}
            aria-label="sign out"
          >
            Sign Out
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  Link,
  Stack,
} from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import GoogleIcon from "@mui/icons-material/Google";
import { useAuth } from "../hooks";
import type { OAuthProvider } from "../hooks/useAuth";
import { GOOGLE_CLIENT_ID, GITHUB_CLIENT_ID } from "../lib/env";

interface SignInModalProps {
  /** Whether the modal is visible. */
  open: boolean;
}

/** Sign-in / sign-up mode toggle. */
type AuthMode = "signin" | "signup";

/**
 * Sign-in / sign-up modal overlay.
 *
 * Shows whenever the user is not authenticated. Supports:
 * - Email + password sign-in (existing account)
 * - Email + password sign-up (new account)
 * - Google OAuth sign-in/sign-up
 * - GitHub OAuth sign-in/sign-up
 */
export function SignInModal({ open }: SignInModalProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signUp, oAuthLogin } = useAuth();

  const isSignUp = mode === "signup";
  const showGoogle = !!GOOGLE_CLIENT_ID;
  const showGitHub = !!GITHUB_CLIENT_ID;
  const showOAuth = showGoogle || showGitHub;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    if (isSignUp) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    setError("");
    setLoading(true);
    try {
      await oAuthLogin(provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OAuth login failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(isSignUp ? "signin" : "signup");
    setError("");
    setConfirmPassword("");
  };

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      slotProps={{
        paper: { sx: { borderRadius: 3 } },
      }}
    >
      <DialogTitle sx={{ pb: 0, pt: 4 }}>
        <Typography
          component="div"
          variant="h4"
          align="center"
          sx={{ fontWeight: 700 }}
        >
          Pixie Evals
        </Typography>
        <Typography
          variant="body2"
          align="center"
          color="text.secondary"
          sx={{ mt: 0.5 }}
        >
          {isSignUp ? "Create an account" : "Sign in to continue"}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, px: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* OAuth buttons */}
          {showOAuth && (
            <Stack spacing={1.5} sx={{ mb: 2 }}>
              {showGoogle && (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<GoogleIcon />}
                  onClick={() => void handleOAuth("google")}
                  disabled={loading}
                >
                  Continue with Google
                </Button>
              )}
              {showGitHub && (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<GitHubIcon />}
                  onClick={() => void handleOAuth("github")}
                  disabled={loading}
                >
                  Continue with GitHub
                </Button>
              )}
            </Stack>
          )}

          {showOAuth && (
            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                or
              </Typography>
            </Divider>
          )}

          {/* Email/password form */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              autoFocus
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
            />

            {isSignUp && (
              <TextField
                fullWidth
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
              />
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 1, py: 1.5 }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} />
              ) : isSignUp ? (
                "Sign Up"
              ) : (
                "Sign In"
              )}
            </Button>
          </Box>

          <Typography variant="body2" align="center" sx={{ mt: 1, mb: 2 }}>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <Link
              component="button"
              variant="body2"
              onClick={toggleMode}
              sx={{ cursor: "pointer" }}
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </Link>
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

# Signup & OAuth Authentication (Frontend)

## What Changed

Added email/password signup and Google/GitHub OAuth sign-in to the frontend UI.

### SignInModal Redesign

The `SignInModal` component now supports two modes:

- **Sign In** (default) — email + password login (was "username" before, now "email")
- **Sign Up** — email + password + confirm password, with client-side validation (password ≥ 8 chars, passwords must match)

Users toggle between modes via a link at the bottom of the form.

**OAuth buttons** (Google / GitHub) appear above the email/password form when the corresponding `VITE_*_CLIENT_ID` environment variable is configured. A divider ("or") separates OAuth from the form.

### OAuth Flow

1. User clicks "Continue with Google" or "Continue with GitHub"
2. A popup opens to the provider's consent screen
3. On consent, the provider redirects to `/oauth/callback/index.html`
4. The callback page extracts the `code` param and posts it back via `postMessage`
5. The `useAuth` hook sends the code to the backend `signInWithOauth` mutation

### OAuth Reliability Fixes

- Fixed redirect URI path mismatch so the popup lands on the callback page instead of the app homepage.
- Added safer popup cleanup logic in `useAuth` to prevent repeated COOP-related `window.closed` spam and double-settlement race conditions.

### New Files

- `public/oauth/callback/index.html` — Static callback page for OAuth popup
- `src/graphql/remote/mutation.ts` — Added `SIGN_UP` and `SIGN_IN_WITH_OAUTH` mutations
- `src/generated/remote/graphql.ts` — Updated with new mutation types (manually; run `pnpm codegen` to regenerate)
- `src/generated/remote/gql.ts` — Updated with new overloads

### Modified Files

- `src/hooks/useAuth.ts` — Added `signUp()`, `oAuthLogin()`, and `openOAuthPopup()` helper. Exports `OAuthProvider` type.
- `src/components/SignInModal.tsx` — Full rewrite with sign-in/sign-up toggle, OAuth buttons, confirm password field
- `src/lib/env.ts` — Added `GOOGLE_CLIENT_ID` and `GITHUB_CLIENT_ID` env vars

### Test Updates

- `src/components/SignInModal.test.tsx` — Rewritten: 13 tests covering sign-in mode, sign-up mode (validation, toggle, errors), and OAuth button visibility
- `src/hooks/useAuth.test.ts` — Added 4 tests for `signUp`, `oAuthLogin` (success + popup failure)

### Environment Variables (frontend)

| Variable                | Purpose                               |
| ----------------------- | ------------------------------------- |
| `VITE_GOOGLE_CLIENT_ID` | Enables "Continue with Google" button |
| `VITE_GITHUB_CLIENT_ID` | Enables "Continue with GitHub" button |

Both are optional. When unset/empty, the corresponding OAuth button is hidden.

## Migration Notes

- The "Username" field was renamed to "Email" — existing users sign in with their email address
- No database changes required
- Run `pnpm codegen` (with both servers running) to properly regenerate typed GraphQL documents

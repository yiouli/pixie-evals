# F9: Frontend Auth

**Scope**: Frontend `Login.tsx`, `useAuth.ts`, `apolloClient.ts`, `store.ts`
**Phase**: 5 (no SDK dependency — talks directly to remote server)
**Tests**: Manual

## Overview

Implement login/logout flow. The frontend authenticates directly against the remote pixie-server and stores the JWT token in Zustand for subsequent requests.

## Components

### `useAuth` Hook (`src/hooks/useAuth.ts`)

```typescript
export function useAuth() {
  const { token, username, login: storeLogin, logout: storeLogout, isAuthenticated } = useAuthStore();

  const [loginMutation] = useMutation(GetAuthTokenDocument);

  const login = async (username: string, password: string) => {
    const { data } = await loginMutation({ variables: { username, password } });
    const token = data.getAuthToken.accessToken;
    storeLogin(token, username);
  };

  const logout = () => {
    storeLogout();
    remoteClient.clearStore();
  };

  return { login, logout, isAuthenticated: isAuthenticated(), username };
}
```

### Apollo Client Auth Link (`src/lib/apolloClient.ts`)

Add an auth link that injects the JWT token from Zustand into every request:

```typescript
import { setContext } from "@apollo/client/link/context";

const authLink = setContext((_, { headers }) => {
  const token = useAuthStore.getState().token;
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

export const remoteClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

**New dependency**: `@apollo/client/link/context` (already included in `@apollo/client`).

### `Login` Component (`src/components/Login.tsx`)

MUI-based login form:

1. Card centered on page
2. Username `TextField`
3. Password `TextField` (type=password)
4. Login `Button`
5. Error `Alert` (shown on failed login)
6. On success: `navigate("/create")` or dashboard

**UX states**:
- Idle: form enabled
- Loading: button disabled, circular progress
- Error: red alert with error message
- Success: redirect

### Route Guard

Add a simple auth check to protected routes. In `App.tsx`, wrap routes with:

```tsx
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

## GraphQL Operation

Uses the existing `GetAuthToken` mutation in `src/graphql/remote/operations.graphql`:

```graphql
mutation GetAuthToken($username: String!, $password: String!) {
  getAuthToken(username: $username, password: $password) {
    accessToken
    tokenType
  }
}
```

## Implementation Notes

- Token persistence: For now, store only in Zustand (in-memory). Token is lost on page refresh. Future: add `localStorage` persistence via Zustand middleware.
- The SDK server does NOT need auth — it runs locally
- Only the remote server requires the Bearer token
```

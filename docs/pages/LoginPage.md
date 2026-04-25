# LoginPage — Page Behavior Specification
`src/pages/LoginPage.jsx`

**Status: BUILT** — Login functional with ClientAdmin JWT. AuthContext 
hydrates synchronously from sessionStorage on mount. Last updated: April 2026.

**Known UX gap:** The Client ID field requires a UUID, which org admins
must obtain out-of-band. The planned improvement — an email-only login
where the API resolves `client_id` server-side — requires a new API
endpoint (`POST /auth/login` would accept email + password only and
look up the associated client). Do not build this flow in the frontend
until that endpoint exists.

Read `docs/page-design-patterns.md` before building this page.
All visual patterns referenced below by section number (e.g. §3) are
defined there. Do not re-implement them — use the patterns as specified.

---

## Purpose

Authenticate a ClientAdmin and store their JWT for use across the app.
This is the entry point for org admins managing their WarPaths account.

| User type | Access | Behavior |
|---|---|---|
| Unauthenticated | Full access | Show login form |
| Already authenticated | Redirect | Navigate to `/extract` immediately on mount |

---

## Route Configuration

`src/App.jsx` route:

```jsx
<Route path="/login" element={<LoginPage />} />
```

Public — no `ProtectedRoute` wrapper. On mount, check
`sessionStorage.warpaths_token` — if a token exists, redirect to
`/extract` immediately without rendering the form.

---

## Layout

Single-column, no sidebar. `<PageShell sidebar={false}>`.
Content centered, `max-width: 400px`.
Full viewport height — center the card vertically using flex.

---

## Visual Structure

Top to bottom within the centered column:

1. **Logo area** — SVG hex mark + WARPATHS wordmark, centered, same
   treatment as Header. `margin-bottom: 32px`.
2. **Login card** — secondary background (`var(--bg-secondary)`),
   `border: 1px solid var(--border-subtle)`, `border-radius: var(--radius)`,
   `padding: 32px`.
3. **Card title** — `"Admin Login"` — 18px, `font-weight: 600`,
   primary text, `margin-bottom: 4px`.
4. **Card subtitle** — `"Sign in to manage your organization"` —
   13px, `var(--text-secondary)`, `margin-bottom: 24px`.
5. **Form fields** — Email, Password, Client ID (see below).
6. **Submit button** — full width, `margin-top: 8px`.
7. **Error message** — below button (see Error state).

---

## Form Fields

All fields use the existing `Input` component from `src/components/ui/`.

**Email**
- Label: `"EMAIL"`
- Type: `email`
- Placeholder: `"admin@yourorg.com"`
- Required

**Password**
- Label: `"PASSWORD"`
- Type: `password`
- Placeholder: `"Your password"`
- Required

**Client ID**
- Label: `"CLIENT ID"`
- Type: `text`
- Placeholder: `"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"`
- Hint: `"Your organization's client identifier"`
- Required

---

## Submit Button

Use `Button` component, variant `primary`, full width.
- Label: `"Sign In"`
- `loading` prop: true while request is in flight
- `disabled` prop: true while loading
- On click: fire the login mutation

Do not use a `<form>` element — use `onClick` on the Button.

---

## UI States

**Idle**
Form ready. No errors shown. All fields enabled.

**Loading**
Button shows loading spinner via `loading` prop. All `Input` components
set `disabled`. Triggered immediately on button click before API response.

**Error**
Show error message below the submit button:
- `401` → `"Invalid email or password."`
- `403` → `"You don't have admin access to this organization."`
- Any other error → `"Something went wrong. Please try again."`

Error text: 13px, `var(--font-sans)`, `var(--accent-red)`,
`margin-top: 12px`. Do not clear form fields on error. Do not use Toast —
errors render inline only.

**Success**
Store token in sessionStorage. Navigate to `/extract`.

---

## Data Fetching

Login is a form submission — use `useMutation` from TanStack Query.
Do not use `useQuery` — there is no data to fetch on mount.

```javascript
const loginMutation = useMutation({
  mutationFn: ({ email, password, clientId }) =>
    loginClientAdmin(email, password, clientId),
  onSuccess: (data) => {
    sessionStorage.setItem('warpaths_token', data.access_token);
    navigate('/extract');
  },
  onError: (error) => {
    // error.response?.status drives the error message shown below the button
  }
});
```

TanStack Query key: none — mutations do not use query keys.
No query invalidation needed on login success.

---

## Key Actions

| Action | Trigger | Behavior |
|---|---|---|
| Check existing token | Page mount | Read `sessionStorage.warpaths_token` — redirect to `/extract` if present |
| Submit login | Button click | Fire `loginClientAdmin` mutation |
| Store token | Mutation success | `sessionStorage.setItem('warpaths_token', data.access_token)` |
| Redirect | Mutation success | `navigate('/extract')` |
| Show error | Mutation error | Inline error message below button |

---

## API Reference

```
POST /auth/login
  Note: no /v1/ prefix — auth routes mount at /auth/ not /v1/auth/
  Base URL: https://warpaths-api.onrender.com
  No Authorization header required
  Body: { email: string, password: string, client_id: uuid }
  Returns: { access_token: string, token_type: string, expires_in: integer }
  Errors:
    401 — invalid credentials
    403 — user exists but has no ClientAdmin record for this client
```

Implement as `loginClientAdmin(email, password, clientId)` in
`src/api/auth.js`. Use the existing axios instance from `src/api/client.js`.
The function should return `response.data` so the mutation receives the
full response object including `access_token`.

---

## Component Usage

| Component | Usage |
|---|---|
| `PageShell` | Outer wrapper, `sidebar={false}` |
| `Input` | Email, password, client ID fields |
| `Button` | Submit — variant `primary`, `loading` and `disabled` props |

No `Toast`, `Modal`, `Drawer`, or `Skeleton` needed on this page.
No `Table`, `Badge`, or `ProgressBar` needed.

---

## Constraints

- Do not use a `<form>` element — use `onClick` on the Button component
- Do not clear fields on error — preserve user input
- Do not redirect on login failure
- Do not store client_id, email, or password anywhere beyond the token
- The `/auth/login` path has no `/v1/` prefix — do not add one
- Token key in sessionStorage must be exactly `warpaths_token`
- After storing the token, navigate to `/extract` — not `/` or `/org`
- Do not hardcode any color, font, or spacing value — use tokens only
- Logo area uses the same SVG hex mark as Header.jsx — copy it exactly,
  do not recreate or approximate it
# Error Handling Conventions

Patterns extracted from current code: `src/api/client.js`, `src/context/AuthContext.jsx`, `src/pages/LoginPage.jsx`, `src/pages/ExtractionPage.jsx`. This document describes what exists — it does not prescribe new conventions.

---

## 1. Axios instance (`src/api/client.js`)

**Request interceptor** attaches `Authorization: Bearer <token>` from `sessionStorage.warpaths_token` when a token is present. No token is attached if `sessionStorage` has none (public endpoints).

**Response interceptor** — single rule:

```js
if (error.response?.status === 401 && !isAuthEndpoint) {
  sessionStorage.removeItem('warpaths_token');
  window.location.href = '/login';
}
return Promise.reject(error);
```

- The `/auth/` path segment is the sole exemption — 401s from `/auth/login` etc. are rejected to the caller (LoginPage handles them inline).
- The redirect is a hard navigation (`window.location.href`), not React Router's `navigate`. This wipes in-memory state intentionally.
- The promise is always rejected, so `useMutation.onError` / `useQuery.error` still fire.
- **Timeout: 300_000 ms** — set at the client level to accommodate slow AI calls (extraction, advisor, GameEval).

There is no global retry, no error reporting, and no non-401 status handling at the interceptor level.

---

## 2. Canonical error fields read from axios

Everywhere an axios error is inspected, the code reads:

- `error.response?.status` — the HTTP status, used for per-code branching.
- `error.response?.data?.detail` — FastAPI's default error body key, used as the fallback user-facing message.

Both are accessed with optional chaining, so network errors (no `response`) fall through to the catch-all message.

---

## 3. `LoginPage.jsx` — inline form error

Error message is computed synchronously from mutation state:

```js
const errorMessage = (() => {
  if (!mutation.isError) return null;
  const status = mutation.error?.response?.status;
  if (status === 401) return 'Invalid email or password.';
  if (status === 403) return "You don't have admin access to this organization.";
  return 'Something went wrong. Please try again.';
})();
```

Rendered as `<p className={styles.errorMessage}>{errorMessage}</p>` directly below the submit button when present. No toast, no modal.

**No `onError` handler on the mutation** — the error is surfaced by reading `mutation.isError` on every render instead.

---

## 4. `ExtractionPage.jsx` — two error paths

### 4a. Upload mutation — status-coded branching

```js
onError: (e) => {
  const s = e.response?.status;
  if (s === 413)      setErrorMsg('File exceeds the 20 MB limit.');
  else if (s === 422) setErrorMsg('The file could not be processed. Confirm it is a valid PDF.');
  else                setErrorMsg(e.response?.data?.detail || 'Extraction failed. Please try again.');
  setIsExtracting(false);
  setPanelState('error');
}
```

### 4b. Report extraction query — derived via effect

```js
} else if (reQuery.isError) {
  const s = reQuery.error?.response?.status;
  setErrorMsg(s === 404
    ? 'This extraction could not be found.'
    : reQuery.error?.response?.data?.detail || 'Failed to load extraction.');
  setPanelState('error');
}
```

Same three-state pattern: per-code override → API-provided detail → generic fallback.

### 4c. Shared error panel (`renderError`)

A single full-panel error UI is used for both cases:

- `AlertTriangle` icon in `var(--accent-red)`
- Heading: **"Extraction failed"** (hard-coded — reused even for 404 load errors, despite the wording)
- Body: `errorMsg` state (falls back to "An error occurred. Please try again.")
- **"Try Again"** button — in direct-link mode (`/extract/:id`) it calls `window.location.reload()`; in master-detail mode it transitions `panelState` back to `upload` and clears the file input.

### 4d. Silent mutations

These mutations have **no `onError` handler** — errors are swallowed with no user-visible feedback:

- `nameMutation` (PATCH display_name)
- `notesMutation` (PATCH notes)
- `deleteMutation`
- `applyTagMutation`, `removeTagMutation`
- `createTagMutation`

This is current behavior — not a recommendation. A failed notes autosave, for instance, leaves the user believing it saved.

---

## 5. Toasts (`useToast`)

Toasts are currently wired only for **informational events**, not errors:

- Duplicate ingest — `showToast('This report was already extracted…', 'info')`
- Low seed count — `showToast('Only N seeds returned — minimum is 5…', 'warning')`

No error path currently dispatches a toast. The toast context supports a `'warning'` variant but is not used for failure feedback today.

---

## 6. `AuthContext.jsx` — defensive token parsing

`userFromToken` wraps the base64/JSON decode in `try/catch` and returns `null` on any failure:

```js
function userFromToken(tokenValue) {
  try {
    const payload = JSON.parse(atob(tokenValue.split('.')[1]));
    return { id: payload.sub, client_id: payload.client_id, scope: payload.scope, role: payload.scope };
  } catch {
    return null;
  }
}
```

`readStoredToken` treats a `null` return as corrupted state and **removes the stored token** before returning `{ token: null, user: null }`. This means a malformed JWT in `sessionStorage` is silently cleared on the next page load — no error shown, the user lands unauthenticated.

No signature verification, no expiry check (`exp`) is performed client-side. The 401 interceptor is the expiry enforcer.

---

## 7. What is NOT handled

Patterns absent from the current code:

- **No React `ErrorBoundary`** — component-thrown errors surface as React's default overlay in dev and a blank screen in prod.
- **No global error reporting / telemetry** (no Sentry, no logging).
- **No retry-on-transient-failure** for any mutation or query.
- **No offline/network-down UI** — these manifest as axios errors without `response` and fall into each page's generic catch-all string.
- **No 429 handling** — if the API ever starts returning rate-limit responses, they'll hit the generic branch and show "Something went wrong." / "Extraction failed."
- **No 5xx-specific branches** — every non-matched status falls through to `error.response?.data?.detail` with a generic fallback.

---

## 8. Summary — the pattern in one shape

Every error-handling site in the current code follows the same three-step ladder:

1. **Per-code override** — `if (status === X) return "specific message for X"`.
2. **API-provided detail** — `error.response?.data?.detail`.
3. **Generic fallback** — a hard-coded English string specific to the action ("Extraction failed.", "Something went wrong.").

Display surface is one of two: inline text below the form (LoginPage) or a full panel replacement (ExtractionPage). Toasts and modals are not currently used for errors.

# WarPaths Frontend

Read this file at the start of every session alongside:
- `docs/design-tokens.md`
- `docs/components.md`
- `docs/page-design-patterns.md`

For any page being built or modified, also read its page spec doc
in `docs/pages` before touching any code.

---

## Context
WarPaths is a wargame platform — a professional analytical tool,
not a consumer product. The design system reflects this: dark,
high-contrast, utilitarian, information-dense. Every visual
decision should feel earned and purposeful.

The frontend design system and all page specs supersede the earlier
`WarPaths_Frontend_Design_Handoff` document, which predates the
current design token system and component library. Do not reference
that document for visual or structural decisions.

---

## Plan-Mode Workflow

This repo uses CC plan mode for all non-trivial work.

**Before entering plan mode**, read in this order:

1. This CLAUDE.md
2. `docs/decisions.md` — durable cross-page conventions
3. The relevant page spec in `docs/pages/<Page>.md`
4. If a feature is mid-build, the plan in `docs/plans/<FEATURE>.md`
5. Any task-specific docs (`docs/query-keys.md`, `docs/api-surface.md`,
   `docs/response-shapes.md`, `docs/components.md`,
   `docs/page-design-patterns.md`, `docs/design-tokens.md`)

**Pre-flight checks before starting any session:**

- `git status` clean on `~/dev/warpaths-frontend`
- `git log main --oneline -3` matches expected state
- On `main` branch (no worktrees — they were retired in May 2026)

**Before declaring a task complete:**

- `npm run build` passes with zero errors and zero warnings
- `npm test` passes
- Smoke test the running app (build → smoke → commit, never the reverse)
- Update `docs/api-surface.md` if `src/api/` changed
- Update `docs/query-keys.md` if new queries added
- Update `docs/response-shapes.md` with new probe stamps if any
- Update the relevant `docs/plans/<FEATURE>.md` if working on a feature

**Commit discipline:**

- Stage explicit paths only — never `git add .` or `git add -A`
- All commits land on `main`
- Stage changes for human review before committing

---

## Tech Stack
- React 18
- React Router DOM v7
- Vite build tool
- TanStack Query v5 for all server state
- CSS Modules for all component styling
- Lucide icons (line icons only — no filled icons)
- No Tailwind, Bootstrap, or any CSS utility library
- No CSS-in-JS or styled-components

---

## Repo Structure
src/
api/          # API functions — one file per domain
# Current files: auth.js, client.js, extraction.js,
#   game.js, leaderboard.js, scenario.js, user.js
assets/       # Static assets
components/
ui/         # 14 shared UI components (all spec-compliant)
game/       # Game-specific components
layout/     # PageShell, Header, Sidebar, ProtectedRoute
context/      # React contexts including ToastContext
hooks/        # Custom React hooks
pages/        # One .jsx file per page
styles/       # tokens.css, global.css
docs/
  design-tokens.md        # Color, typography, spacing tokens
  components.md           # Component library specification
  page-design-patterns.md # 21 reusable page patterns
  query-keys.md           # TanStack Query key registry
  pages/                  # One spec file per page
    AuthoringPage.md
    ExtractionPage.md
    LoginPage.md
    SignupPage.md
    GamePage.md
    OrgManagementPage.md
    LeaderboardPage.md
    AccountPage.md
  plans/                  # Per-feature in-flight plans
    AUTHORING-PAGE.md
  archive/                # Pre-plan-mode workflow artifacts (historical)
  decisions.md            # Cross-page architectural decisions

---

## Design System
All visual decisions trace back to `src/styles/tokens.css`.
Full token definitions in `docs/design-tokens.md`.

**Never hardcode a color, font, spacing, or radius value anywhere.**
Always use CSS custom properties: `var(--token-name)`.

One documented exception: `rgba(0,0,0,...)` overlay backgrounds in
`Modal.module.css` and `Drawer.module.css` — no token defined for
semi-transparent black overlays. These are intentional and must not
be changed.

Core visual rules:
- No gradients, no box shadows, no rounded corners beyond 4px
- Borders separate surfaces — never shadows
- IBM Plex Sans for all UI text and body copy
- IBM Plex Mono for all labels, metadata, identifiers, numbers
- Black Ops One for the WARPATHS wordmark only
- 8px base spacing grid — all spacing is multiples of 4px
- Lucide icons throughout — line weight, monochrome only

---

## Token Values (authoritative — do not revert)
These values were corrected in April 2026 and must not be changed:
- `--accent-red`: `#FF0000`
- `--accent-red-muted`: `#CC0000`

Tokens that do not exist and must never be added:
- `--brand-red`
- `--brand-navy`

---

## Component Library
All 14 spec components exist in `src/components/ui/` and are
fully spec-compliant. Read `docs/components.md` before building
any page.

**Never recreate a component that already exists.**
Use it as-is. If a genuinely new shared component is needed:
1. Add it to `src/components/ui/`
2. Document it in `docs/components.md`
3. Follow the same file structure: `Name.jsx` + `Name.module.css`

Local sub-components (used on one page only) live inline in the
page file — do not add them to `src/components/ui/`.

---

## Data Fetching
**All server state uses TanStack Query v5. No exceptions.**

- GET calls → `useQuery`
- POST/PATCH/DELETE calls → `useMutation`
- Never use `useEffect` + fetch/axios directly for data fetching
- On successful mutation → invalidate relevant query keys
- `isLoading: true` → show Skeleton components. Never a blank panel.
- `isError: true` → wire to existing error state patterns (§19)
- The axios response interceptor in `src/api/client.js` skips the auto-redirect for `/auth/` endpoints — do not change this behavior.

### Query Key Conventions
Keys follow this pattern: `[resource, id, ...filters]`
Examples:
- `['extractions', clientId, tagId]`
- `['client', clientId]`
- `['extraction', reId]`

All registered query keys are documented in `docs/query-keys.md`.
Update that file when adding new queries to any page.

### API Layer
One file per domain in `src/api/`. Use the existing axios instance
from `src/api/client.js` — never use fetch directly.

Naming convention (match existing files):
- GET functions: `get*` (e.g. `getClientExtractions`)
- POST functions: verb describing the action (e.g. `ingestReport`)
- PATCH functions: `patch*` or `update*`
- DELETE functions: `delete*`

API paths always use the `/v1/` prefix. Confirm exact paths from
`warpaths-api/docs/api/` before writing any new API function.

---

## API Surface Registry
`docs/api-surface.md` is the registry of every endpoint the frontend calls.
Update it in the same session as any change to `src/api/`:
- Adding a new API function → add the endpoint entry
- Changing a path, method, or field → update the relevant entry  
- A new page starts calling an existing function → add the page to that entry
- A function is removed → remove the entry

Never leave api-surface.md out of sync with src/api/.

---

## Page Patterns
All pages use `PageShell`. Two layout modes exist:
- **Single-column:** `<PageShell sidebar={false}>`
  max-width 900px (form/detail) or 1200px (data-heavy), centered
- **Master-detail:** custom two-column layout inside PageShell
  Left column 260px fixed, right column flex:1

Read `docs/page-design-patterns.md` before building any page.
All 21 patterns are defined there — reference by section number.

---

## Page Specs
Every page has a spec doc in `docs/pages/`. Read it before building
or modifying that page. File names match the page component exactly:
`docs/pages/ExtractionPage.md`, `docs/pages/GamePage.md`, etc.

Features in active build also have a plan doc in `docs/plans/`.
The plan doc tracks current state, next step, and feature-specific
known issues. Where a page spec describes the steady-state design,
the plan doc describes the in-flight state. Read both before any
plan-mode session that touches the feature.

Spec docs define:
- Purpose and user types
- Layout mode
- All UI states and transitions
- API calls with exact endpoints
- Component usage
- Constraints and edge cases

When a new page is needed that has no spec doc yet, write the
spec doc first and get approval before building. Use
`docs/pages/ExtractionPage.md` as the template format.

---

## Routing
React Router DOM v7. All routes defined in `src/App.jsx`.

Protected routes use `<ProtectedRoute>` which checks
`sessionStorage.warpaths_token`.

Public routes handle auth awareness by reading
`sessionStorage.warpaths_token` directly in the page component.

---

## Header
The Header component (`src/components/layout/Header.jsx`) renders
on every page via PageShell. It is a single shared component —
change it once and it updates everywhere.

Structure:
- Left: SVG hex mark (30×29px) + WARPATHS wordmark
  - Hex mark: polygon stroke `var(--accent-red)`, italic W fill
    `var(--accent-red)`. Never hardcode hex values in the SVG.
  - Wordmark: Black Ops One 18px weight 400 letter-spacing 0.04em
- Right: conditional org branding + user display name + dropdown
  - If `client.logo_url` is present: render org logo as `<img>`,
    max-height 28px, max-width 80px, object-fit contain
  - If no `client.logo_url`: render client display name in 12px
    secondary text
  - Org branding only shown when ClientAdmin context exists
  - Unauthenticated: right slot shows "Not signed in" in
    `var(--text-disabled)` color
  - Dropdown items: My Account, Leaderboard, Log out
  - ClientAdmins also see: Org Management in dropdown

---

## Auth Model
Three user types — read carefully before building any page:

- **Unauthenticated** — no token. Public pages only.
- **Authenticated User (no org)** — has JWT, no client context.
  Sees personal account, game history, can play games.
- **ClientAdmin** — has JWT with org/client context.
  Sees org management, extraction history, game creation.

Token stored in `sessionStorage.warpaths_token`.
On page reload, users must re-authenticate — no persistence.

**JWT TTL (as of April 2026):** Both ClientAdmin and User tokens are
24 hours. The previous values (8hr / 4hr) are no longer in effect.

**Single-org assumption:** ClientAdmin users belong to one org in
practice. The login form requires a Client ID (UUID). An email-only
login flow where the API resolves `client_id` is planned but requires
a new API endpoint — do not implement in the frontend until that
endpoint exists.

**POST /auth/set-password:** Exists at `/auth/set-password`. No auth
required. Dev/staff use only — there is no frontend UI for it and
none should be built.

**GET /v1/report-extractions/:id:** Unscoped — no tenant filter.
Any authenticated or unauthenticated caller can read an extraction
by its ID. Do not add client-based access guards in the frontend for
this endpoint.

---

## Pages in Scope
Current pages being built in this repo:

| Page | Route | Auth required | Status |
|---|---|---|---|
| Login | `/login` | No | — |
| Join | `/join` | No | — |
| Extraction | `/extract`, `/extract/:id` | Partial | Built |
| Org Management | `/org` | ClientAdmin | — |
| Game Page | `/game/:id` | User | — |
| Leaderboard | `/leaderboard` | No | — |
| Account | `/account` | User | — |

Additional pages may be added as the product evolves. Always
write a spec doc in `docs/` before building a new page.

Future pages identified but not yet designed:
- Staff admin panel (config validation, framework management)
- Self-serve org signup
- Public leaderboard profile

---

## State Persistence
- **Game state:** API is authoritative. Reconstruct from API on
  page reload. No localStorage dependency.
- **Authoring state:** All persisted to API on each save.
  No draft state in browser.
- **Session tokens:** `sessionStorage` only — never localStorage.

---

## Build Requirements
- Run `vite build` before reporting any task complete
- Build must pass with zero errors and zero warnings
- Zero hardcoded color, font, or spacing values in any `.module.css`
- All new components: `Name.jsx` + `Name.module.css` in same folder
- Never use git commit without specifying exact file paths. Always use git add [specific file] and git commit [specific file] -m 'message' to avoid accidentally committing unrelated staged changes.

---

## Do Not
- Modify anything in `warpaths-api/`
- Use localStorage for any application state
- Hardcode any color, font, spacing, or radius value
- Use Tailwind, Bootstrap, or any CSS utility library
- Use CSS-in-JS or styled-components
- Use `useEffect` + fetch/axios for data fetching
- Recreate components that exist in `src/components/ui/`
- Add page-specific sub-components to `src/components/ui/`
- Add `--brand-red` or `--brand-navy` to tokens.css
- Commit directly — stage changes for human review
- Build a page without first reading its spec doc
- Write a new API function without confirming the path from
  `warpaths-api/docs/api/`
- Use `useApi.js` — it is deprecated. Use `src/api/client.js` and
  the per-domain files in `src/api/` instead
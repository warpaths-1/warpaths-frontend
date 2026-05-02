# WarPaths Platform — Frontend Design Handoff
## Updated April 2026 — Reflects React/CC build, LoginPage + ExtractionPage + AuthoringPage Sessions 1–4 completion, auth fixes, API audit findings

---

## How to Read This Document

This document describes every page of the WarPaths frontend, organized by audience
and purpose. For each page it covers:
- Who sees it and under what conditions
- What the page must do (capabilities)
- What data it reads and writes (API endpoints)
- Key UI states and transitions
- Design notes and constraints

All business logic lives in the API. The frontend never generates IDs, never
enforces business rules, and never calls one API endpoint on behalf of another. It
makes API calls and renders the responses.

**Frontend stack:** React 18, React Router DOM v7, Vite, TanStack Query v5,
CSS Modules. All pages are built in this React codebase.

**Auth model:**
- ClientAdmins authenticate via `POST /auth/login` → ClientAdmin JWT
- Players get a session token from `POST /v1/users` at account creation
- Player login endpoint (`POST /auth/player-login`) does not yet exist — future
- Tokens stored in `sessionStorage.warpaths_token` — not localStorage
- AuthContext hydrates synchronously from sessionStorage on first render —
  no loading flash, no useEffect delay
- On page reload, users must re-authenticate — no persistence

---

## Design System — Authoritative Sources

The design system is fully implemented. These files are authoritative for all
visual and component decisions. Do not use this handoff document for visual
specifics — use the implemented design system files instead.

| File | Purpose |
|---|---|
| `src/styles/tokens.css` | All CSS custom properties — the single source of truth for every color, font, spacing, and radius value |
| `docs/design-tokens.md` | Design token documentation with usage rules |
| `docs/components.md` | Component library specification — all 14 components |
| `docs/page-design-patterns.md` | 21 reusable page patterns referenced by section number |

**Never hardcode a color, font, spacing, or radius value anywhere.**
Always use `var(--token-name)`.

---

## Tech Stack

- **React 18** — component framework
- **React Router DOM v7** — routing
- **Vite** — build tool
- **TanStack Query v5** — all server state (GET → useQuery, mutations → useMutation)
- **CSS Modules** — all component styling
- **Lucide** — line icons throughout (monochrome, no filled icons)
- No Tailwind, Bootstrap, or any CSS utility library
- No CSS-in-JS or styled-components

**Data fetching rule:** All server state uses TanStack Query v5. Never use
useEffect + fetch/axios directly for data fetching.

---

## Color System (Corrected April 2026)

These are the authoritative token values. Earlier versions of this document
listed different red values — those are superseded.

### Backgrounds
| Token | Value | Use |
|---|---|---|
| `--bg-primary` | `#0A0C0F` | Page background, Header, Sidebar |
| `--bg-secondary` | `#12161C` | Cards, panels, input backgrounds |
| `--bg-elevated` | `#1A2030` | Modals, dropdowns, hover states |

### Accents
| Token | Value | Use |
|---|---|---|
| `--accent-red` | `#FF0000` | Primary CTA, active state left border, active tab underline, WARPATHS wordmark |
| `--accent-red-muted` | `#CC0000` | Destructive button border |
| `--accent-teal` | `#1A9B8A` | Success, completion, stable indicators, toggle-on |
| `--accent-teal-bright` | `#22C4B0` | Completion text, teal accent text |
| `--accent-amber` | `#D48B2A` | Warnings only — quota alerts, retry actions |

### Text
| Token | Value | Use |
|---|---|---|
| `--text-primary` | `#E8EDF2` | All primary content |
| `--text-secondary` | `#8A9BB0` | Labels, metadata, supporting text |
| `--text-disabled` | `#4A5568` | Disabled states, placeholder hints |

### Borders
| Token | Value | Use |
|---|---|---|
| `--border-subtle` | `#1E2A3A` | Default dividers, card borders |
| `--border-active` | `#2A3F5A` | Input borders, editable field signals |

**Tokens that do not exist and must never be added:** `--brand-red`, `--brand-navy`

---

## Typography

### Fonts
- **Black Ops One** (400) — WARPATHS wordmark only (both in Header and on LoginPage)
- **IBM Plex Sans** (400, 500, 600) — all prose, UI text, buttons, labels
- **IBM Plex Mono** (400, 500) — all identifiers, metadata, badges, section labels,
  numeric values

### Scale
| Token | Size | Use |
|---|---|---|
| `--text-xs` | 11px | Mono metadata, badges, chips, status indicators |
| `--text-sm` | 12px | Field labels (uppercase tracked), secondary detail |
| `--text-base` | 14px | Default body text |
| `--text-md` | 15px | Slightly larger body, emphasis text |
| `--text-lg` | 18px | h4 headings |
| `--text-xl` | 24px | h3 headings |
| `--text-2xl` | 28px | h2 headings |
| `--text-3xl` | 32px | h1 headings |

---

## Component Library

All 14 components are built, spec-compliant, and live in `src/components/ui/`.
Read `docs/components.md` for full props, variants, and usage rules.

| Component | File | Notes |
|---|---|---|
| Button | Button.jsx | 5 variants: primary, secondary, ghost, destructive, icon |
| Badge | Badge.jsx | Status-driven: draft, pending, active, complete, approved, rejected, failed, locked, validated |
| Input | Input.jsx | Label, error, hint support |
| Textarea | Textarea.jsx | Auto-save pattern in Patterns §17 |
| Select | Select.jsx | Custom-styled, not browser default |
| Toggle | Toggle.jsx | Teal on-state |
| Card | Card.jsx | 4 variants: default, active, warning, stat |
| Table | Table.jsx | Clickable rows, action cells on hover |
| Modal | Modal.jsx | fade + scale animation, Escape closes |
| Drawer | Drawer.jsx | Slides from right, 480px or 640px |
| Toast / ToastContext | Toast.jsx | useToast() hook, auto-dismiss 5s |
| Skeleton | Skeleton.jsx | text, rect, circle variants |
| ProgressBar | ProgressBar.jsx | For AI calls (extraction, advisor, eval) |
| StepIndicator | StepIndicator.jsx | For authoring flow |

**Never recreate a component that already exists.**
Local sub-components (one page only) stay inline in the page file.

---

## API Client — Key Behaviors

`src/api/client.js` — axios instance with two interceptors:

**Request interceptor:** attaches `Authorization: Bearer <token>` from
`sessionStorage.warpaths_token` on every request if token is present.

**Response interceptor:** on 401, clears sessionStorage and redirects to
`/login` via `window.location.href`. Exception: `/auth/` endpoints are
excluded from this auto-redirect so login failures surface as inline errors
rather than causing a page reload.

**Do not modify the `/auth/` exclusion** — it is required for the login
error state to work correctly.

All API functions live in `src/api/` one file per domain. Use the axios
instance — never use fetch directly.

---

## Auth — Settled Decisions

**ClientAdmin login flow (implemented):**
1. `POST /auth/login` with `{ email, password, client_id }` — note: no `/v1/` prefix
2. Decode JWT payload: `JSON.parse(atob(token.split('.')[1]))`
3. Write token to sessionStorage before any subsequent API calls
4. Call `contextLogin(token, minimalUser)` from AuthContext — handles sessionStorage
   write and state update
5. Navigate to `/extract`

**Single-org assumption (decided, not yet implemented in login UX):**
In practice, ClientAdmin users will only ever belong to one org. The login
form currently requires manual `client_id` entry (UUID). This is a known UX
problem — future improvement is an email-only flow where the API resolves
`client_id` server-side from the user's ClientAdmin record. Requires a new
API endpoint. Do not implement in frontend until API endpoint exists.

**getUser limitation:**
`GET /v1/users/:id` requires user scope or staff scope. ClientAdmin tokens
cannot call this endpoint — it returns 404. AuthContext populates the user
object from the JWT payload directly (id, client_id, scope) rather than
fetching user data. `display_name` and `email` are not available in the JWT
and will be null until a richer hydration strategy is implemented.

**AuthContext (src/context/AuthContext.jsx):**
Synchronous lazy initialization — token and user are read from sessionStorage
on the very first render. No loading state, no useEffect hydration delay.
Bad/corrupt tokens are purged inside the lazy initializer before first render.
Context value shape: `{ user, setUser, token, login, logout }`.

**ProtectedRoute:**
Reads sessionStorage directly — does not use AuthContext. Simple: if no token,
redirect to `/login`. If token present, render children.

**`src/hooks/useApi.js`:**
Deprecated — do not use. Superseded by TanStack Query. File retained only
in case anything currently depends on it. `useAuth.js` is still active.

---

## Header

The Header component (`src/components/layout/Header.jsx`) renders on every page.
Change it once and it updates everywhere.

- **Left:** SVG hex mark (30×29px, polygon stroke `var(--accent-red)`, italic W
  fill `var(--accent-red)`) + WARPATHS wordmark in Black Ops One 18px,
  color `var(--accent-red)` — red on all pages including header bar
- **Right (ClientAdmin):** `client.logo_url` as `<img>` (max-height 28px,
  max-width 80px, object-fit contain) if present, else client display name
  in 12px secondary text
- **Right (unauthenticated):** "Not signed in" in `var(--text-disabled)`
- **Dropdown:** My Account, Leaderboard, Log out. ClientAdmins also see Org Management.

Note: the logo field on the client object is `client.logo_url`, not `org.logo_url`.
Note: wordmark color is `var(--accent-red)` — red, not `var(--text-primary)`.
This was a deliberate design decision made April 2026.

---

## Layout Principles

- **Never center content with `text-align: center`** except within buttons or
  empty-state panels
- **Sidebar is 220px** — reserved for admin/authoring pages
- **Master-detail left column is 260px** — extraction list, game list
- **Max-width: 900px** for form/detail single-column pages
- **Max-width: 1200px** for data-heavy single-column pages
- **Header is always 56px**, sticky, present on all pages including public ones
- **No box shadows** — use borders to separate surfaces
- **No gradients, no rounded corners beyond 4px**

---

## Page Index

| Page | File | Route | Auth | Status |
|---|---|---|---|---|
| Login | LoginPage.jsx | `/login` | None | **BUILT** |
| Signup | SignupPage.jsx | `/signup` | None | Scaffold only |
| Extraction | ExtractionPage.jsx | `/extract`, `/extract/:id` | Partial | **BUILT** |
| Authoring | AuthoringPage.jsx | `/author`, `/author/new`, `/author/:id` | ClientAdmin | **PARTIAL** — Sessions 1–4 done (Steps 1–3), Sessions 5a–8 pending audit revision |
| Org Management | OrgManagementPage.jsx | `/org` | ClientAdmin | Scaffold only |
| Game | GamePage.jsx | `/game/:id` | User | Scaffold only |
| Leaderboard | LeaderboardPage.jsx | `/leaderboard` | None | Scaffold only |
| Account | AccountPage.jsx | `/account` | User | Scaffold only |

Future pages not yet designed: staff admin panel, self-serve org signup,
public leaderboard profile page.

---

## Login Page — BUILT

**Route:** `/login` — public, no ProtectedRoute

**Purpose:** Authenticate a ClientAdmin and store their JWT.

**Auth endpoint:** `POST /auth/login` — note no `/v1/` prefix. Auth routes
mount at `/auth/` directly, not `/v1/auth/`.

**Request:** `{ email, password, client_id }` (client_id is a UUID)
**Returns:** `{ access_token, token_type, expires_in }`

**Flow on success:**
1. Decode JWT payload to get `sub` (user_id)
2. Write token to sessionStorage immediately (before any other API call)
3. Call `contextLogin(token, { id: payload.sub, client_id: payload.client_id, scope: payload.scope })`
4. Navigate to `/extract`

**Error handling:**
- 401 → "Invalid email or password." (inline below button)
- 403 → "You don't have admin access to this organization." (inline)
- Other → "Something went wrong. Please try again." (inline)
- Fields are preserved on error — do not clear
- No Toast — errors are inline only

**On mount:** if `sessionStorage.warpaths_token` exists, redirect to `/extract`
immediately without rendering the form.

**Additional API endpoints added to support login:**
- `POST /auth/set-password` — sets bcrypt password hash on a User record.
  No auth required. Added April 2026. Staff/dev use only — no frontend UI.
  Future: needs auth gate before production exposure.

**Known UX issue:** Client ID field requires a UUID — not user-friendly.
Planned improvement: email-only login where API resolves client_id server-side.
Requires new API endpoint. Do not implement in frontend until API is ready.

---

## Page 1 — Game Invite Signup Page

### Who sees it
Anyone who receives a game invite link from an org. The URL contains a
`game_invite_id` parameter that identifies the specific game and org.

### Purpose
Create a thin player account and register the player for a specific game.

### URL pattern
`/signup?invite=:game_invite_id`

On load, read `game_invite_id` from URL and call:
`GET /v1/game-invites/:id` — returns invite details including scenario title,
narrative, org name, game mode, and validity status.

If the invite is invalid or expired, show an error state. Do not show the signup form.

### Capabilities

**Signup form fields:**
- Email (required)
- Display name (required)
- First name (optional)
- Last name (optional)
- Profession (optional)
- Sector (optional)

On submit: `POST /v1/users` with form data
Returns: User record + session_token (JWT stored in sessionStorage for game access)

After account creation, immediately accept the invite:
`POST /v1/game-invites/:id/accept` with the user's session token

**If the user already has an account:**
Show "I already have an account" option with email + password login flow.
On login: `POST /auth/login` → receive JWT → accept invite.

### UI states
- Loading (fetching invite details) — Skeleton
- Valid invite — game preview + signup form
- Already registered — confirmation, link to game
- Invite invalid / expired — error state
- Signup success — confirmation with "You're registered" message

### Design notes
- Show org name and scenario title prominently
- Keep form minimal — only email and display name are truly required
- Mobile-first — these links will be opened on phones from email
- Single-column layout, max-width 560px, centered

### Endpoints used
- `GET /v1/game-invites/:id`
- `POST /v1/users`
- `POST /auth/login` (existing user path)
- `POST /v1/game-invites/:id/accept`

---

## Page 2 — Player Game Page

### Who sees it
Authenticated players (user JWT required). Single-page experience — all game
phases render on the same page with dynamic state transitions.

### Purpose
The complete player-facing game experience: read scenario, play through turns,
interact with advisors, draft and submit responses, receive GameEval.

### Page structure (single page, dynamic sections)

**Section A — Scenario Overview (Turn 0)**
Client-side rendering only — no Game record created until player commits.

Data to load on entry:
- `GET /v1/scenarios/:id`
- `GET /v1/scenarios/:id/actors`
- `GET /v1/scenario-configs/:id`
- `GET /v1/scenario-configs/:id/player-perspective`
- `GET /v1/analytical-frameworks/:id`

Displays: scenario narrative, player perspective, actor list, framework
description, "Start Game" commit button.

On "Start Game": `POST /v1/games` with `scenario_config_id` and `mode: async`
Returns: game record with game_id

**Section B — Active Turn**
On turn start: `POST /v1/games/:id/turns`

Turn package:
- `GET /v1/games/:id/turns/:turn_number`
- `GET /v1/turns/:id/dimension-snapshots`
- `GET /v1/turns/:id/content-items`
- `GET /v1/scenario-configs/:id/turn-questions`

Displays: turn number, DimensionSnapshot board, ContentItems, TurnQuestions,
Advisor panel, Scaffolding assistant, response draft area, Submit button.

**Advisor panel:**
- `GET /v1/scenario-configs/:id/advisors`
- `POST /v1/turns/:id/advisor-inputs` (ask advisor)
- `POST /v1/advisor-inputs/:id/message` (follow-up)
- Show exchange count remaining

**Scaffolding assistant:**
- `POST /v1/turns/:id/player-response/scaffolding-message`
- Visually distinct from advisors — teal accent, labeled "Drafting Assistant"

**Response submission:**
- `POST /v1/turns/:id/player-response`
- Triggers async: next turn generation, DimensionSnapshot update

**Section C — Turn History**
Accessible at any time during the game. Read-only.

**Section D — GameEval**
After `POST /v1/games/:id/end`:
- `GET /v1/games/:id/eval`
- `GET /v1/games/:id/eval/highlights`
- `PATCH /v1/games/:id/eval/highlights/:highlight_id`

Displays: overall score (20–100), criteria scores, executive summary, private
feedback, player highlights with is_featured toggle.

### Design notes
- Browser back button should prompt "Are you sure you want to leave your game?"
- DimensionSnapshot board is the most visually prominent element
- Build DimensionBoard components (`src/components/game/`) as a separate CC
  session before building the GamePage — they are complex and visually distinctive
- ContentItems styled by type: intel reports (monospace, INTEL badge), media
  reports (headline treatment), scenario updates (amber full-width banner)
- Advisor panel feels like encrypted messaging — exchange count as small counter
- Scaffolding assistant is teal, not red, clearly labeled as a drafting tool
- GameEval feels like a mission debrief

### Build order (follow strictly)
1. Turn 0 display
2. Game creation + Turn 1 display
3. Turn package display (board, content items, questions)
4. Scaffolding assistant
5. Advisor interaction
6. Response submission + next turn
7. Turn 2+ generation and display
8. GameEval display
9. Highlights management

### Endpoints used
- `GET /v1/scenarios/:id`
- `GET /v1/scenarios/:id/actors`
- `GET /v1/scenario-configs/:id`
- `GET /v1/scenario-configs/:id/player-perspective`
- `GET /v1/scenario-configs/:id/advisors`
- `GET /v1/scenario-configs/:id/turn-questions`
- `GET /v1/analytical-frameworks/:id`
- `POST /v1/games`
- `GET /v1/games/:id`
- `POST /v1/games/:id/turns`
- `GET /v1/games/:id/turns`
- `GET /v1/games/:id/turns/:turn_number`
- `GET /v1/turns/:id/dimension-snapshots`
- `GET /v1/turns/:id/content-items`
- `GET /v1/turns/:id/advisor-inputs`
- `POST /v1/turns/:id/advisor-inputs`
- `POST /v1/advisor-inputs/:id/message`
- `GET /v1/turns/:id/player-response`
- `POST /v1/turns/:id/player-response`
- `POST /v1/turns/:id/player-response/scaffolding-message`
- `POST /v1/games/:id/end`
- `GET /v1/games/:id/eval`
- `GET /v1/games/:id/eval/highlights`
- `PATCH /v1/games/:id/eval/highlights/:highlight_id`

---

## Page 3 — Report Extraction Interface

**Status: BUILT** — `ExtractionPage.jsx` is complete with TanStack Query.
The detailed spec lives in `docs/pages/ExtractionPage.md` which is the
authoritative reference for this page. This section provides a summary only.

### Who sees it
- **ClientAdmin (org)** at `/extract` — full master-detail layout with extraction history
- **ClientAdmin (org)** at `/extract/:id` — same, pre-selects matching record
- **Authenticated user (no org)** at `/extract/:id` — full content, no list, org upgrade CTA
- **Unauthenticated** at `/extract/:id` — Game Brief tab visible, other tabs disabled,
  auth gate card above tabs, no ADMIN NOTES tab shown

### Layout
- ClientAdmin: master-detail (260px list left, flex right)
- All others: single-column, max-width 700px, centered

### Right panel states
EMPTY → UPLOAD → LOADING → RESULT → ERROR

### Upload field name
The multipart form field name is `file` — not `pdf`. This matches the API.

### RESULT state tabs
- **GAME BRIEF** (default) — WHY THIS GAME, SCENARIO NARRATIVE, STRATEGIC DOMAIN TAGS,
  SUGGESTED TURN COUNT, SUGGESTED ACTORS table
- **SOURCE REPORT** — report title, publication, SUMMARY, INJECT SEEDS seed cards
- **ADMIN NOTES** (ClientAdmin only) — auto-save notes textarea
- **EXTRACTION DETAILS** — confidence meter, extraction notes, stat grid

### Public view (unauthenticated at `/extract/:id`)
- Report title + publication heading
- Auth Gate Card above tab row
- Three tabs: GAME BRIEF (active), SOURCE REPORT (disabled), EXTRACTION DETAILS (disabled)
- No ADMIN NOTES tab
- Full Game Brief content visible — no clipping or fade

### Key API paths (all prefixed `/v1/`)
- `POST /v1/report-extractions/ingest` — upload and extract (field name: `file`)
- `GET /v1/report-extractions/:id` — no auth required
- `GET /v1/clients/:id/extractions` — history list
- `GET /v1/clients/:id/extractions/:id` — single record
- `PATCH /v1/clients/:id/extractions/:id` — display_name, notes
- `DELETE /v1/clients/:id/extractions/:id`
- `POST /v1/clients/:id/extractions/:id/tags`
- `DELETE /v1/clients/:id/extractions/:id/tags/:tag_id`
- `GET /v1/clients/:id/tags`
- `POST /v1/clients/:id/tags`

See `docs/pages/ExtractionPage.md` for the complete spec.

---

---

## AuthoringPage — PARTIAL (Sessions 1–4)

**Route:** `/author`, `/author/new`, `/author/:scenario_id` — ClientAdmin auth required (also accessible by staff via bubble token)

**Purpose:** Author and manage scenarios + scenario configs. The gate between extraction and gameplay — a ClientAdmin shapes raw extracted scenarios into game-ready configs (named "Operation X — Realism baseline" etc.).

**Status:** Phase 1 partial. Sessions 1–4 committed (`/author` landing, Steps 1–3 of the stepped flow). Sessions 5a–8 pending — each requires an audit-driven prompt revision before build (see `docs/build-plans/AuthoringPage-BuildOrder.md`).

### Layout

Single-column, max-width 900px, centered. PageShell with `sidebar={false}`. No master-detail.

### Three states

1. **Landing** — `/author` shows three tiles: Browse extractions, Start blank, Clone existing (Phase 2 disabled). Plus drawer-based extraction picker with tag filter and search.
2. **Stepped flow** — `/author/new` or `/author/:id` with StepIndicator. 11 steps. Per-step save advances forward.
3. **Tabbed editor** — same `/author/:id` URL with `?mode=tabs` (or post-validated). All steps available as tabs simultaneously. Pending Session 8.

### What's built (Sessions 1–4)

**Step 1 — Framing.** Scenario record CRUD. Form fields per `02_scenario.md`. Pre-fill from extraction. Implicit publish on advance to Step 3.

**Step 2 — Actors.** ≥3 actors required. Each actor in a Drawer-based editor with three-input goals (`label`, `description`, `priority`). Actor pre-fill from extraction's `actor_suggestion[]`.

**Step 3 — Config setup.** ScenarioConfig record CRUD via nested path `POST /v1/scenarios/:scenario_id/configs`. AnalyticalFramework picker with three conditional groupings. Auto-selected platform Realism default. Immutable `game_type` and `turn_count` after Create (rendered disabled with "Fixed at create" hint on return-visit).

**Steps 4–11.** Placeholders. Built in Sessions 5a–8.

### Mid-session fixes already landed

| Session | Purpose |
|---|---|
| 1.5 | Drawer slides from left; staff-only AI Suggestion tile |
| 2.5 | Staff-gate `tier_minimum` + `availability_window_days` |
| 3.5 | Actor `current_posture` enum fix |
| 3.6 | UX refinements: collapsible ActorCards, resume logic |
| 3.7 | Cancel button + Modal; deferred-POST blank scenario; multi-select tag filter |
| 3.8 | Drawer date source fix (`extracted_at` → `created_at`) |
| 3.9 | Actor goals data-loss fix (`goal_items` → `goals` three-input shape) |
| 3.10 | Archive-aware resume + read-only enforcement on archived scenarios |

### Important behaviors

**Resume logic.** `listScenarios` filters out archived scenarios client-side. The product rule "one Scenario per ReportExtraction per client" means one *active* Scenario — archived doesn't count. After a user archives a draft, clicking the same extraction creates a fresh scenario.

**Archived state.** Scenarios with `status === 'archived'` render with a banner ("This scenario is archived. Unarchive to edit."), all form fields are read-only, all save buttons are disabled. Unarchive button is disabled with "Coming soon" chip — the `POST /v1/scenarios/:id/unarchive` endpoint is not yet implemented.

**Framework picker.** `GET /v1/analytical-frameworks` envelope is `{items: [...]}`. Server auto-scopes by caller. Three groupings render conditionally: Platform frameworks, Your org's frameworks, Other organizations — only the groupings with matching items render. As of April 2026, only one platform framework exists in dev DB ("Smoke Test Realism" — should be renamed pre-demo).

**Framework-in-use 409 fallback.** The catalogue's proactive check `GET /v1/scenario-configs?analytical_framework_id=` returns 404 (endpoint not implemented). Frontend instead relies on 409-on-PATCH-time when assigning a framework that's in use.

**Silent-drop awareness.** All POST/PATCH bodies use field names from OpenAPI's request schemas (`CreateScenarioConfigRequest`, etc.). Wrong field names would return 201 with data silently dropped — pydantic `extra="ignore"` is the platform default.

### Key API paths

```
GET  /v1/scenarios?source_extraction_id=:id  # resume lookup; client-side filters archived
GET  /v1/scenarios/:id                       # scenario record + inlined actors
POST /v1/scenarios                           # create blank or from extraction
PATCH /v1/scenarios/:id                       # update fields
POST /v1/scenarios/:id/archive               # archive (the only cleanup; no DELETE)

GET  /v1/scenarios/:id/configs               # list configs (envelope: {items})
POST /v1/scenarios/:scenario_id/configs      # create config (nested path; flat returns 404)
GET  /v1/scenario-configs/:id                # config record
PATCH /v1/scenario-configs/:id                # update config (omits game_type, turn_count)
POST /v1/scenario-configs/:id/submit-for-review  # transition to in_review (no server-side readiness gate)
POST /v1/scenario-configs/:id/approve        # transition to validated
POST /v1/scenario-configs/:id/reject         # back to draft

GET  /v1/analytical-frameworks               # framework list (envelope: {items}; server auto-scopes)
GET  /v1/analytical-frameworks/:id           # single framework
POST /v1/analytical-frameworks/:id/clone     # staff-only Phase 2

# DELETE endpoints documented but unimplemented:
# DELETE /v1/scenarios/:id (returns 405 — use archive instead)
# DELETE /v1/analytical-frameworks/:id (not in OpenAPI)

# AI generation endpoints documented but unimplemented:
# POST /v1/scenario-configs/:id/turn-questions/generate (Phase 2)
# POST /v1/scenario-configs/:id/turn1-template/generate (Phase 2)
```

### Pending sessions

| Session | Step(s) | Audit revision scope |
|---|---|---|
| 5a | Step 4 Tension | Standard |
| 5b | Step 5 Dimensions | **Significant** — original "exactly 5 with weights summing to 1.0" invalidated; real schema has no weight field on DimensionDefinition |
| 5c | Step 6 Scoring | Standard + add `meta.weight_sum` envelope handling |
| 5d | Step 7 Perspective | Standard |
| 6 | Steps 8–9 (Advisors + TurnQuestions) | Standard; no AI generation in Phase 1 (endpoints don't exist) |
| 7 | Step 10 Turn1Template | **Significant** — direct POST instead of /generate; content_items write-once until API ships PATCH support |
| 8 | Step 11 Review + Tabbed editor | **Significant** — readiness gate is client-side only; corrected requirements list; archive-only (no DELETE); verify config lock enforcement |

See `docs/build-plans/AuthoringPage-BuildOrder.md` for full detail.

### Key documentation

- `docs/pages/AuthoringPage.md` — page spec (1300+ lines, includes API Behavior Notes)
- `docs/build-plans/AuthoringPage-BuildOrder.md` — session sequence + audit revision notes
- `BACKLOG.md` — deferred items
- `docs/response-shapes.md` — verified live response shapes with `Last probed:` stamps
- `~/dev/api-audit/` — historical audit reference (April 2026)

---

## Page 4 — Org Game Management Page

### Who sees it
ClientAdmins authenticated with a ClientAdmin JWT.

React page (`OrgManagementPage.jsx`) with multiple internal sections navigated
via left sidebar. Sections: Dashboard, Scenarios, Games, Team, Settings.

### Section A — Dashboard
- `GET /v1/games` (client-scoped)
- `GET /v1/clients/:id/engagement-summary`

### Section B — Scenarios
Stepped authoring flow using StepIndicator component. Full flow documented in
`docs/pages/OrgManagementPage.md` (to be written).

### Section C — Games
Game creation, invite management, game monitoring, synchronous turn release.

### Section D — Team
ClientAdmin management — add, change role, remove admins.

### Section E — Settings
Org details, `client.logo_url` upload, billing plan display.

### Design notes
- Left sidebar navigation, 220px, red left border on active section
- Dashboard: stat cards using Card variant `stat`
- Authoring flow: StepIndicator component for step sequence

---

## Page 5 — Leaderboard

### Who sees it
Public — no auth required. Authenticated players see their own rank.

### Capabilities
- `GET /v1/leaderboard` — global ranked table, top 100
- `GET /v1/leaderboard?scenario_id=:id` — scenario filter
- `GET /v1/leaderboard/me` — authenticated player's own rank
- `GET /v1/users/:id/profile` — player highlights popup on row click

### Design notes
- Top 3 ranks: subtle amber/gray/copper left border treatment
- Authenticated player's row: red left border, elevated background
- Highlights popup: modal, not tooltip

---

## Page 6 — Player Account & Performance Page

### Who sees it
Authenticated players only (user JWT). Private.

### Capabilities
- Account settings: `GET/PATCH /v1/users/:id`
- Contact preferences: phone number, SMS opt-in
- Newsletter subscriptions: `GET/PATCH /v1/users/:id/newsletter-subscriptions`
- Game history: `GET /v1/games` (user-scoped), per-game eval and turn review
- Highlights management: toggle `is_featured` per highlight
- Performance summary: leaderboard score, rank, score trend

### Design notes
- Master/detail: game list left, game detail right (same pattern as Extraction page)
- Private feedback: darker background, red left border, "visible only to you" label
- Left sidebar navigation: Account, Contact, Newsletters, Game History,
  Highlights, Performance

---

## The DimensionSnapshot Board

Unique to Game Page and Account history. Components live in
`src/components/game/` — currently empty, to be built as a dedicated CC session
before GamePage is implemented.

### TensionIndicator
- 7 horizontal segments: teal (1–2), amber (3), red (4–7)
- Full width, 48px including label

### DimensionRow
- 5-position track, filled circle marker
- Color: teal (1) → amber (3) → red (5)
- Delta indicator: ↑ teal if improving, ↓ red if worsening
- Row height: 36px

### DimensionBoard
- TensionIndicator above DimensionRow list
- Tension narrative below: italic 13px secondary, max 3 lines + expand

---

## Navigation and Flow

### User Types and Entry Points

| User type | Entry point | Primary destination |
|---|---|---|
| Org game participant (new) | Invite link → Signup Page | Game Page |
| Org game participant (returning) | No player login yet — future | Game Page |
| SAGE individual player | No player login yet — future | Game Page |
| Org admin (ClientAdmin) | `/login` | `/extract` (then `/org` when built) |
| WarPaths staff | Staff API key — no frontend login | All pages via token |

### Auth Route Prefix
Auth endpoints mount at `/auth/` — **no `/v1/` prefix**.
All other API endpoints use `/v1/` prefix.

### Page Connection Map

```
Invite Link (email)
    ↓
[Signup Page] ──────────────────────────────→ [Game Page]

[Login Page] ──→ [/extract] ──→ [/org] (when built)
             └─→ [Account Page] (when built)
             └─→ [Leaderboard] (when built)
```

---

## State Persistence

- **Game state:** API is authoritative. Reconstruct from API on page reload.
- **Authoring state:** All persisted to API on each save. No draft state in browser.
- **Session tokens:** `sessionStorage.warpaths_token` only — never localStorage.

---

## Empty States

| Page / Section | Empty state message | Primary CTA |
|---|---|---|
| Extraction list | "No extractions yet." | "Upload Report" |
| Org Dashboard | "No active games yet." | "Create your first game" |
| Scenarios list | "No scenarios yet. Start by uploading a report." | "Upload Report" |
| Games list | "No games yet. Publish a scenario to get started." | "Go to Scenarios" |
| Leaderboard | "No players yet. Be the first to complete 10 games." | — |
| Account game history | "You haven't completed any games yet." | "Find a Game" |

---

## Error States

**API error (generic):** Toast — dark surface, red left border, auto-dismisses 5s.
**404:** Full-page error, large "404" monospace, back button.
**Auth error (expired token):** Redirect to `/login`.
**Extraction failure:** Inline within upload panel per Patterns §19.
**Login failure:** Inline below button — no Toast, no page reload.
**Validation error (form):** Inline below field, red text 12px.

---

## Future / Unresolved

| Item | Status | Notes |
|---|---|---|
| Player login endpoint | Not built | `POST /auth/player-login` needed |
| Single-org login UX | Decided, not built | Email-only login, API resolves client_id |
| `client.logo_url` display | Spec written | Implement when Org Settings page is built |
| Staff admin panel | Not designed | Config validation, framework management |
| Self-serve org signup | Not designed | `POST /v1/clients` needs a full UX flow |
| Public leaderboard profile | Not designed | Modal or lightweight page |
| AI prompt quality iteration | Deferred | Step 7 after game interface complete |
| `POST /auth/set-password` auth gate | Known gap | Currently open endpoint — add auth before production |
| `POST /v1/scenarios/:id/unarchive` | Frontend ready, endpoint missing | Banner has disabled Unarchive button with "Coming soon" chip; awaits API implementation |
| `DELETE /v1/scenarios/:id` | Returns 405 | Use Archive only in Phase 1; permanent delete UI deferred to Phase 2 archive list view |
| AI generation endpoints | Documented but unimplemented | TurnQuestion + Turn1Template generate endpoints don't exist in OpenAPI; Phase 2 |
| Multi-client per-extraction Scenario UX | Pending `authored_by_client_id` storage | Currently filters archived but not by client |
| Smoke Test Realism framework rename | Pre-demo cleanup | Dev DB has placeholder framework name; rename to "Realism" via API before any external demo |

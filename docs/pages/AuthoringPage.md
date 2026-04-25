# AuthoringPage — Page Behavior Specification
`src/pages/AuthoringPage.jsx`

**Status: SPEC — not yet built.**
Last updated: April 2026 (audit-driven revision after Session 3.8).

Read `docs/page-design-patterns.md` before building this page.
All visual patterns referenced below by section number (e.g. §3) are
defined there. Do not re-implement them — use the patterns as specified.

This page is the third in the core authoring progression:
**Extraction → Authoring → Game**. Its job is to produce a Scenario plus
a ScenarioConfig that passes `POST /v1/scenario-configs/:id/submit-for-review`
and reaches `status: validated`, which is the precondition for
`POST /v1/games`.

---

## Purpose

The Authoring page serves two distinct user types via three URL patterns:

- `/author` — Landing: pick a starting point (extraction, blank, or clone)
- `/author/new` — Stepped authoring flow for a newly created Scenario that
  has not yet met submit-for-review requirements
- `/author/:scenario_id` — Tabbed editor for an existing Scenario, used for
  refinement, config variants, and publishing

| User type | URL | Picker scope | Field access |
|---|---|---|---|
| ClientAdmin | `/author` | Own extractions + own Scenarios (clone) | Authoring-only fields |
| ClientAdmin | `/author/new` | — | Authoring-only fields |
| ClientAdmin | `/author/:id` | — | Authoring-only fields; scenario-level edits blocked if a downstream config is validated/active |
| Staff (`bubble`) | `/author` | All orgs' extractions, all Scenarios, plus blank | Authoring + staff fields (schema_version, framework tier override, ConfigValidation cycle) |
| Staff | `/author/new` | — | Authoring + staff fields |
| Staff | `/author/:id` | — | Authoring + staff fields |

User-type detection is scope-based, identical to ExtractionPage:
- `isClientAdmin` — JWT `scope === 'client_admin'`
- `isStaff` — JWT `scope === 'bubble'`
- Authenticated user with neither scope is redirected to `/leaderboard`
- Unauthenticated users are redirected to `/login?redirect=/author`

---

## Route Configuration

`src/App.jsx` routes:

```jsx
<Route path="/author" element={
  <ProtectedRoute><AuthoringPage /></ProtectedRoute>
} />
<Route path="/author/new" element={
  <ProtectedRoute><AuthoringPage /></ProtectedRoute>
} />
<Route path="/author/:scenario_id" element={
  <ProtectedRoute><AuthoringPage /></ProtectedRoute>
} />
```

`AuthoringPage` inspects `scope` from the AuthContext / sessionStorage JWT
to determine the feature surface. `/author/new` is a transient route — it is
replaced with `/author/:scenario_id` as soon as `POST /v1/scenarios` returns.

---

## Flow Model (Hybrid)

**Stepped flow** — when a Scenario has been created but does not yet meet
`submit-for-review` requirements. URL: `/author/new` or `/author/:id` with
`config.status === 'draft'` and gaps in the required object set. The page
renders the StepIndicator (`src/components/ui/StepIndicator.jsx`) at the top
and shows one step body at a time, with a persistent "Save & next" footer.

**Tabbed editor** — when all `submit-for-review` requirements are met, OR
when the user explicitly chooses "Edit freely" from the stepped flow footer.
The page swaps StepIndicator for a tab row and lets the user jump to any
section. This is also the default when arriving at `/author/:id` for a
Scenario whose config is already `in_review` / `validated` / `retired`.

Both modes render the same section components — only the navigation chrome
differs. Mode is determined on every render from the loaded Scenario +
ScenarioConfig state, not from URL or local state.

---

## Layout

**Landing (`/author` with no selection):**
Single-column, max-width 900px, centered. Title + "Start a new scenario"
prompt. Three starting-point tiles (see State 1).

**Stepped flow (`/author/new` or stepped mode on `/author/:id`):**
Single-column, max-width 900px, centered. StepIndicator pinned at top.
Step body below. Footer with "Back" (ghost), primary action ("Save & next"
or "Finish"), and "Edit freely" ghost link that switches to tabs.

**Tabbed editor (`/author/:id` with complete submit-for-review requirements
OR user-elected):**
Single-column, max-width 900px, centered. Metadata bar (§6) with scenario
title + config name + status badge. Tab row (§5). Tab body below.

No left sidebar on this page — sidebar navigation is reserved for
`OrgManagementPage`. Authoring is a focused single-column task.

---

## State 1 — Starting Point Picker (`/author`, no selection)

### Layout
Centered page with a top heading and up to four tiles in a row
(depending on scope — see tile visibility). On narrow viewports,
tiles stack vertically.

### Heading block
- h2: `"Start a new scenario"`
- Body (base secondary): `"Pick a starting point. You can edit everything
  once the scenario is created."`

### Tile 1 — From an extraction

Uses Card variant `default`.

- Icon: Lucide `FileText`, 24px secondary
- Title (h4): `"From an extraction"`
- Body: `"Build a scenario from a report you've already extracted."`
- Action: `"Browse extractions"` primary button → opens an extraction
  picker Drawer (480px)

**Extraction picker Drawer:**
- Header: `"Pick an extraction"` + close X
- Search input (placeholder `"Search by title"`)
- Tag filter bar (below the search input, above the list). Only
  renders when the client has at least one tag — hidden entirely
  when `GET /v1/clients/:id/tags` returns `[]`.
  - Title row: `"FILTER BY TAG"` 10px mono uppercase secondary label
  - Chip row: one button per tag. Selected chips use
    `--accent-red` background with primary-color text. Unselected
    use `--bg-elevated` with a subtle border and secondary text.
    Client-side filter, multi-select AND semantics: an extraction
    must carry *every* selected tag to pass. Toggling a chip off is
    the clear action (no dedicated "Clear filters" button in Phase
    1). Chip state lives in a local `Set<uuid>` that resets when
    the drawer closes.
  - Empty-filter-result: when tag(s) are selected and no extraction
    matches, replace the list with a secondary `"No extractions
    match selected tags"` panel.
  - Tag data comes from `getClientTags(clientId)` under the shared
    key `['tags', clientId]` — same key ExtractionPage uses.
- List of extractions, newest first:
  - For ClientAdmin: `GET /v1/clients/:client_id/extractions`
  - For staff: `GET /v1/clients/:client_id/extractions` with a preceding
    client-picker step (see Staff Notes)
- List item: title (`display_name` fallback `report_title`),
  ClientExtraction added date (`ce.created_at`, matching
  ExtractionPage's list formatting — inline `toLocaleDateString`,
  no UTC pin), extraction status Badge (only if not `complete`),
  and tag chips (from `ce.tags`) styled to match ExtractionPage's
  `ListItemTagChip`.
- **Deliberate asymmetry vs ExtractionPage:** the drawer does NOT
  render the `"● Scenario created"` indicator that ExtractionPage
  shows for extractions with a linked Scenario. The drawer's
  resume-or-create logic (below) handles that distinction silently
  on click — showing a separate "already has scenario" affordance
  in the picker would add noise without changing behavior. Do not
  add the indicator to the drawer.
- Row is clickable only if `extraction_status === 'complete'`
- Search input filters the tag-filtered set on `title` (client-side)
- Footer: `"Cancel"` ghost. No confirm — click is the confirm.

On row click (resume-or-create):
1. `GET /v1/scenarios?source_extraction_id=:report_extraction_id` via
   `listScenarios({ source_extraction_id })`. Product rule: a
   ReportExtraction has at most one Scenario, so the result is length 0 or 1.
2. **If a Scenario exists (length >= 1):** cache-seed
   `['scenario', scenario.id]` with the returned record and navigate to
   `/author/:scenario.id` with `{ replace: true }`. No `POST` fires.
3. **If no Scenario exists (length 0):**
   a. Fetch the full ReportExtraction: `GET /v1/report-extractions/:id`
      (seed the `['extraction', id]` cache)
   b. Create Scenario from extraction (see State 2, "Scenario creation
      from extraction")
   c. Close the Drawer and navigate to `/author/:scenario_id`

Rationale: multiple analytical lenses on the same report are modeled as
multiple ScenarioConfigs on a single Scenario, never multiple Scenarios.
The blank scenario tile is exempt from this rule — every blank POSTs a
new Scenario with `source_extraction_id: null`.

### Tile 2 — Blank scenario

Uses Card variant `default`.

- Icon: Lucide `FilePlus`, 24px secondary
- Title (h4): `"Blank scenario"`
- Body: `"Start from scratch. Use this when you have a scenario in mind
  but no source report."`
- Action: `"Start blank"` primary button

On click:
1. Navigate to `/author/new`. **No `POST` fires.** The record is not
   created until the first save (see State 2, "Creation mode" below).

This defers record creation so users who open the form and then cancel
leave no orphan Scenario behind. The extraction tile flow is unchanged —
resume-or-create still runs immediately there.

### Tile 3 — AI Suggestion (Staff only, Phase 2 for wiring)

Uses Card variant `default`.

- Icon: Lucide `Sparkles`, 24px secondary
- Title (h4): `"AI Suggestion"`
- Body: `"Have an AI agent draft a scenario for you to refine."`
- Rendered as disabled with a "Coming soon" 11px mono amber chip
  in the top-right corner
- Tooltip on hover: `"AI agent integration is being designed.
  Check back soon."`
- Visibility: `scope === 'bubble'` only; hidden for ClientAdmin

Wiring deferred pending AI agent contract definition. When built
(Phase 2 or later), this tile will trigger an agent-driven draft
scenario creation flow — endpoint and payload shape TBD.

### Tile 4 — Clone existing scenario (Phase 2 — see Constraints)

Renders as a disabled card with a "Coming soon" 11px mono amber chip in
the top-right corner. Tooltip on hover:
`"Scenario clone endpoint is planned — not yet built. Use 'From an
extraction' or 'Blank' for now."`

Tile is hidden for ClientAdmin on Phase 1. Staff always sees it (disabled).

### Staff-only pre-step: Client picker

Staff caller hits `/author` without a bound `client_id`. Before the
extraction picker Drawer opens, show a Client select Drawer:

- `GET /v1/clients` (staff-only endpoint — assumed available, confirm
  at build time against `docs/curls.md`)
- List item: client display name + id (11px mono) + `"Platform"` badge
  when `client_id === null` (platform-owned resources)
- Select a client → remember it in a `useState` for this page session
  (not persisted to sessionStorage). Extraction picker then shows that
  client's extractions.

Staff can also select `"Platform / none"` — meaning the Scenario will
be created with no owning client. Authorization for this path depends on
API acceptance of `client_id: null` on the ingesting user — confirm at
build time. If rejected, surface the error inline in the Drawer.

---

## State 2 — Stepped Authoring Flow

### Creation mode (`/author/new`)

When the URL is `/author/new`, no Scenario record exists on the server
yet. Step 1 renders an empty form; form state initializes with
`toInitial(null)` — all strings empty, all enums unselected, no actors.

Creation-mode rules:

- **POST happens on first save.** Any of Save & next, Save draft & exit,
  or implicit-publish from a later step triggers
  `POST /v1/scenarios`. Minimum body:
  `{ source_extraction_id: null, title: form.title || "Untitled scenario" }`
  plus every other filled field. Save & next enforces the usual Step 1
  required-field validation (`title`, `category`, `subcategory`,
  `scenario_narrative`). Save draft & exit does not — it posts with the
  fallback title even when the form is blank.
- **On POST success:** cache-seed `['scenario', newId]`, then
  `navigate('/author/:newId', { replace: true })`. The URL swap flips
  creation mode off so subsequent saves PATCH normally, Back goes to
  `/author` (not `/author/new`), and reload resolves a real record.
- **Stepped mode is forced.** The `"Edit freely"` tab toggle is disabled
  with tooltip `"Available after first save"` — tab navigation can't
  land on Steps 2–11 before the record exists.
- **Steps 2–11 are unreachable.** StepIndicator renders all 11 steps
  with Step 1 active and the rest in `upcoming` style (default dim).
  A mono-secondary caption reading
  `"Save Step 1 to unlock later steps."` sits directly beneath the
  indicator. Save & next is the only path forward.
- **Save draft & exit in creation mode** performs the first POST and
  then navigates to `/author`. On POST error, stay on Step 1 and
  surface errors inline.
- **Cancel in creation mode** navigates to `/author` without any API
  call (see Footer → Cancel below). No Scenario record exists to
  discard.

Extraction flow is unchanged — clicking a complete extraction row still
creates-or-resumes a Scenario immediately per State 1, Tile 1. There is
no `/author/new` transition for extractions.

### Step order

The StepIndicator shows these steps in order. Each step maps to one or more
API objects. The step is "complete" when all of its required fields / child
objects pass the submit-for-review criteria from `03_scenario_config.md`.

| # | Step | Objects touched | Required to submit-for-review |
|---|---|---|---|
| 1 | Scenario framing | Scenario fields | Yes — title, narrative, category, subcategory |
| 2 | Actors | Scenario.actors[] | Yes — ≥3 actors |
| 3 | Config setup | ScenarioConfig + AnalyticalFramework link | Yes — config exists, framework assigned |
| 4 | Tension | TensionIndicator (1) | Yes |
| 5 | Dimensions | DimensionDefinition (0+) | No — DimensionDefinitions are optional |
| 6 | Scoring | EvaluationCriteria (1–5) | Yes — 1–5 criteria, weights sum to 100 |
| 7 | Player perspective | PlayerPerspective (1) | Yes |
| 8 | Advisors | Advisor (≥1 primary) | Yes — at least one with `is_primary: true` |
| 9 | Turn questions | TurnQuestion (≥1 per turn) | Yes |
| 10 | Turn 1 template | Turn1Template | Yes |
| 11 | Publish & validate | POST publish, submit-for-review, approve | Yes — terminal step |

Content seeds (pool) are not a step — they're an optional addition on
the Advisors step, Phase 2.

### Step 0 — Publish the Scenario (implicit)

The Scenario must reach `status: published` before submit-for-review is
valid. The page triggers `POST /v1/scenarios/:id/publish` automatically
when Steps 1 and 2 are complete (title + narrative + category + subcategory
+ ≥3 actors). No user action — just a silent publish call on the transition
into Step 3.

**Status line under the StepIndicator:** an 11px mono teal-bright line
right-aligned between StepIndicator and the step body reading
`"● Scenario in progress"` whenever a Scenario record is loaded (`draft`
or `published`). The label is intentionally status-agnostic — it signals
"this page is tracking a live Scenario record," not "this Scenario has
been published." Hidden entirely when `scenario.status === 'archived'`
(see Archived state below).

If publish 422s, do not advance. Show the field-level errors inline on the
corresponding step and scroll to the first error.

### Footer (every step)

- Far left: `"Save draft & exit"` ghost button. Saves current step
  (same save path as Save & next, but skips any implicit publish) and
  navigates to `/author`. On save error: stay on step, surface error,
  do not navigate. In creation mode, this button performs the first
  POST.
- `"Cancel"` ghost button with a red-tinted hover cue (discard intent
  without using the full destructive variant). Never fires an API
  call. Behavior:
  - If the current step reports itself clean via `saveRef.isDirty()`:
    navigate to `/author` immediately, no modal.
  - If dirty: open a confirmation Modal titled
    `"Discard changes and exit?"` with body
    `"Your in-progress changes will not be saved."` Buttons:
    `"Keep editing"` (ghost) closes the modal and returns to the form;
    `"Discard"` (destructive) navigates to `/author` without any
    PATCH/POST.
  - In creation mode: dirty = any field differs from the initial empty
    defaults. In edit mode: dirty = current step's form fields differ
    from the last-saved values. Step 2 always reports clean because
    actor add/edit/remove already PATCH immediately — there is no
    pending local state to discard.
- `"Back"` ghost button. Disabled on Step 1.
- Center: small 11px mono secondary — `"Step N of 11 · Saved Apr 23, 14:32"`
  (timestamp updates on each successful save)
- Right: `"Save & next"` primary button. Label becomes `"Save"` on Step 11.
  Disabled with tooltip when the step's advance gate is unmet (e.g. Step 2
  with fewer than 3 actors) or when the Scenario is `archived`.
- Far right: `"Edit freely"` ghost text link. Switches to tab mode.
  Disabled in creation mode with tooltip `"Available after first save"`.

"Save & next" behavior:
1. If current step has unsaved changes, save them (PATCH the relevant
   object). On error, stay on step and show inline error.
2. Check the step's required-field criteria. If unmet, block advance and
   show inline validation message. Exception: Step 11 is the terminal step
   and has its own semantics — see below.
3. Advance StepIndicator by one.

"Save draft & exit" behavior:
1. Call `stepSaveRef.current.save({ draft: true })`.
   - Step 1: PATCHes dirty fields identically to Save & next.
   - Step 2: actor PATCHes already fire on each add/edit/remove via
     their own mutations, so draft-save returns immediately. The
     3-actor advance gate is NOT enforced, and no implicit publish
     fires.
2. On success: navigate to `/author` (landing with starting-point tiles).
   The user can return to the in-progress Scenario by picking the same
   extraction again — the resume flow (State 1, Tile 1) will route back
   to `/author/:id` without creating a new Scenario.

### Archived state

When `scenario.status === 'archived'`:
- The teal "Scenario in progress" line is suppressed.
- A read-only banner renders above the step body: `"This scenario is
  archived. Unarchive to edit."` in base-secondary text, inside a
  bordered `--bg-secondary` panel.
- "Save & next" is disabled with tooltip `"Scenario is archived"`.
- No unarchive action is exposed in Phase 1 — unarchive UI is Phase 2.

### Step 1 — Scenario framing

**Fields** (Input / Textarea / Select components, all from existing
component library):

- `title` — Input, required
- `category` — Input, required (free text for Phase 1 — a taxonomy
  enum can be added in Phase 2)
- `subcategory` — Input, required
- `scenario_narrative` — Textarea, required, 10 rows, auto-grow
- `setting` — Textarea, 3 rows
- `time_horizon.planning_horizon` — Select, labeled `"CRISIS HORIZON"`
  in UI with helper hint `"The whole game timeframe"` below the field
  (`hours_to_days | weeks | months | years`)
- `time_horizon.incident_horizon` — Select (same enum), labeled
  `"TURN HORIZON"` in UI with helper hint
  `"How long between each turn"` below the field
- `time_horizon.notes` — Input

**Staff-only fields** (rendered only when `scope === 'bubble'`; hidden
from the DOM for ClientAdmin — existing values on the Scenario record
are preserved and round-tripped unchanged on save):

- `tier_minimum` — Select (`free | paying_standard | paying_premium` — pull
  from `docs/response-shapes.md` on build, may differ)
- `availability_window_days` — Input, number, optional

**Extraction pre-fill:** when the Scenario was created from an extraction
(`source_extraction_id` is non-null), the page first fetches
`GET /v1/report-extractions/:id` using `source_extraction_id` as the key,
then pre-fills:

| Scenario field | ReportExtraction source |
|---|---|
| `title` | `scenario_suggestion.title` |
| `category` | `scenario_suggestion.category` |
| `subcategory` | `scenario_suggestion.subcategory` |
| `scenario_narrative` | `scenario_suggestion.scenario_narrative` |
| `setting` | `scenario_suggestion.setting` |
| `time_horizon.planning_horizon` | `scenario_suggestion.time_horizon.planning_horizon` |
| `time_horizon.incident_horizon` | `scenario_suggestion.time_horizon.incident_horizon` |
| `time_horizon.notes` | `scenario_suggestion.time_horizon.notes` |

Pre-fill happens **once**, on initial scenario creation from extraction. It
is sent in the initial `POST /v1/scenarios` body. After creation, the
page reads from the Scenario record only — it does not re-seed from the
extraction.

**Save:** `PATCH /v1/scenarios/:id` with the changed subset on "Save & next".
Actors array is not included in this PATCH — that's Step 2.

### Step 2 — Actors

**List view:**
- Header row: `"ACTORS"` mono label + count chip `"{n}/3 minimum"` —
  turns teal-bright when n >= 3
- Actor cards (local sub-component), one per actor, vertical stack —
  collapsible (see below)
- Bottom: `"+ Add actor"` ghost button

**ActorCard structure (collapsible):**

Collapsed (default) shows only a header row:
- Chevron (Lucide `ChevronRight` when collapsed, `ChevronDown` when
  expanded), 16px secondary
- Name (base primary, weight 500)
- Role badge (mono, bg-elevated)
- Visible-to-player chip (teal-bright, `"● Visible to player"`) — only
  when `is_visible_to_player === true`
- `"Edit"` ghost button — opens the ActorEditor Drawer, propagation
  stopped so click does not toggle the card
- Trash2 icon button — opens Remove confirmation Modal, propagation
  stopped so click does not toggle the card

Clicking anywhere else on the header row toggles expansion. Each
card's expanded state is local React state, not persisted. All cards
start collapsed on every mount.

Expanded — a detail pane below the header row (separated by a 1px
`--border-subtle` divider) with stacked sections. Each section has a
10px mono uppercase secondary label and a base primary body. Empty
string fields render as `"Not set"` in 11px mono secondary italic.

Sections (in order):
- `GOALS` — numbered list (`<ol>`) of goals from `actor.goals[]`. Each
  entry shows the `label` (base primary, weight 500) on the first line
  with `(priority {label})` appended (display label `"High|Medium|Low"`
  in 11px mono secondary), and `description` on a secondary line beneath
  in base secondary text. Empty array renders `"Not set"`.
- `CURRENT POSTURE` — the display label for the enum value
  (e.g. `"Observing"`).
- `BEHAVIOR`, `HISTORY`, `CONSTRAINTS` — free-text fields,
  white-space preserved.
- `CAPABILITIES OVERVIEW (FROM EXTRACTION)` — text from the matching
  `actor_suggestion.capabilities_overview` on the source extraction.
  Matched by actor index. Section is omitted entirely (not rendered
  empty) when the parent Scenario has no `source_extraction_id` or
  the matched suggestion has no `capabilities_overview`.
- `RELATIONSHIPS` — the `relationships_overview` field.

The MappingCallout inside the ActorEditor Drawer stays unchanged —
capabilities is now also visible on the card, but MappingCallout
still surfaces both `capabilities_overview` and `current_posture`
narrative while the author is editing an actor.

**Actor editor:** ActorEditor Drawer (640px) opens on "Edit". The
card's expanded state is independent of the Drawer — opening the
Drawer does not collapse or expand the card.

**Editor fields** (matching the Scenario actor shape from `02_scenario.md`):

- `name` — Input, required
- `role` — Input
- `goals[]` — repeating goal block, three required fields each (per
  OpenAPI `GoalItem`: `{label, description, priority}` all required):
  - `label` — Input (short name, e.g. `"Maintain alliances"`)
  - `description` — Textarea, 2 rows (longer explanation)
  - `priority` — Select (`1 | 2 | 3`, displayed as `"High | Medium | Low"`)
  Each goal renders as a bordered card-like block (subtle
  `--border-subtle` container): `label` + remove `[×]` on the first
  line, `description` textarea on the second line, `priority` select on
  the third line. The `"+ Add goal"` ghost button sits below the list;
  no upper limit. Client-side validation: trim before checking; if any
  goal block has empty `label` or `description`, disable the editor's
  Save button and show inline error on the offending block:
  `"Label and description required"`. Empty `goals` array on save is
  allowed (API accepts `[]`).
- `behavior` — Textarea, 3 rows
- `history` — Textarea, 3 rows
- `constraints` — Textarea, 3 rows (with 11px mono secondary hint:
  `"AI-only — not shown to players"`)
- `current_posture` — Select, enum: `dormant | observing | active | escalating | de_escalating | engaged`. Display labels: Dormant, Observing, Active, Escalating, De-escalating, Engaged. Helper: "What the actor is currently doing in the scenario."
- `is_visible_to_player` — Toggle
- `relationships_overview` — Textarea, 3 rows

**Extraction pre-fill for actors:** when creating the Scenario from an
extraction, seed `actors[]` from `re.actor_suggestions[]` with this mapping:

| Scenario actor field | ReportExtraction source | Notes |
|---|---|---|
| `name` | `actor_suggestion.name` | |
| `role` | `actor_suggestion.role` | |
| `current_posture` | — | Default to `'observing'` on pre-fill. The extraction's narrative `current_posture` is NOT the Scenario enum — it's a free-text suggestion surfaced in MappingCallout, not written to the actor record directly. |
| `relationships_overview` | `actor_suggestion.relationships_overview` | |
| `is_visible_to_player` | `actor_suggestion.is_visible_to_player` | |
| `goals[]` | `actor_suggestion.objectives[]` | `actor_suggestion.objectives` is a string array (verified via console probe 2026-04-25). Map each objective string → `{ label, description, priority }`: `description` is the full objective string; `label` is a short summary derived from the description (first sentence or first 50 chars, trimmed and stripped of trailing punctuation, whichever is shorter); `priority` defaults to `2` (medium — extraction does not carry priority). Author edits any of the three. |
| `behavior` | — | Blank. Author writes. |
| `history` | — | Blank. Author writes. |
| `constraints` | — | Blank. Author writes. |

`capabilities_overview` and `current_posture` (narrative) on ReportExtraction
have no direct target on Scenario.actor. Both are surfaced via `MappingCallout`
at the top of the ActorEditor as read-only reference blocks labeled
`"FROM EXTRACTION"` with sub-labels `"CAPABILITIES OVERVIEW"` and
`"POSTURE (suggested)"`. The author reads them to decide which enum value to
pick for `current_posture` and what to write in `behavior`. The extraction's
narrative `current_posture` is a free-text string, not the enum — it is never
written to the actor record directly.

**Save:** On actor add / edit / remove, PATCH the full actors array on the
Scenario — `PATCH /v1/scenarios/:id` with `{ actors: [...] }`. Scenario PATCH
replaces actors in full, per `02_scenario.md`. Optimistically update the
`['scenario', scenarioId]` cache.

**Advance gate:** cannot advance from Step 2 until `actors.length >= 3`.
Button disabled with tooltip `"Add at least 3 actors"`.

**On advance from Step 2:** attempt Step 0 (implicit publish) if title,
narrative, category, subcategory are also set.

### Step 3 — Config setup

This is where the ScenarioConfig is created. If no config exists for this
Scenario, render a "Create config" form. If one exists in `draft`, load it.

**Create config form:**

- `name` — Input, required (placeholder `"e.g. Realism — Baseline"`)
- `description` — Textarea, 3 rows
- `game_type` — Select (`sage_individual | org_facilitated`)
- `turn_count` — Input, number, 3–10, default 5
- `max_exchanges_per_turn` — Input, number, default 3
- `minimum_runs_for_insight` — Input, number, default 15 (staff-only field;
  ClientAdmin does not see this)
- `requires_validation` — Toggle (staff-only field; ClientAdmin does not
  see this, defaults to `false` server-side for org configs)

**Framework picker:**
Section divider, then `"ANALYTICAL FRAMEWORK"` section label.

- `GET /v1/analytical-frameworks` (auto-scoped by caller's scope + client_id
  per `01_analytical_framework.md`)
- Default selection: the Realism platform framework if one exists
  (server-level config: `client_id: null`, `tier: "realism"`, lowest
  `created_at`). Surface as `"Using: Realism (platform default)"`.
- Picker: `"Change framework"` ghost button → opens Drawer (480px)
  listing all returned frameworks grouped by `client_id === null`
  ("Platform") vs client-specific. List item shows `name`, `tier` pill,
  and a truncated `framework_description`.
- On selection: update local state; the `analytical_framework_id` is sent
  in the `PATCH /v1/scenario-configs/:id` body.
- Staff-only: `"+ Create framework"` ghost button at the bottom of the
  Drawer → opens a second nested editor (Phase 2 — Phase 1 shows disabled
  with `"Coming soon"` chip).

**Framework clone guard:** if the selected framework's `id` appears on
any existing ScenarioConfig with `status` in `['validated', 'active']`
(check via `GET /v1/scenario-configs?analytical_framework_id=:id` —
confirm query-param support at build time; if not supported, skip the
guard and rely on API 409 at PATCH time), show an amber inline warning:
`"This framework is in use on validated configs. Edits to tenets will
silently change live AI behavior. Clone before editing."` + `"Clone
framework"` button → `POST /v1/analytical-frameworks/:id/clone` with
`{ name: "{original} (copy)" }` then reassigns the cloned framework.
Staff-only action.

**Save:**
- On first "Save & next" from Step 3: `POST /v1/scenarios/:id/configs`
  with the filled-in fields. Cache-seed `['config', configId]`.
- On subsequent visits: `PATCH /v1/scenario-configs/:id`

### Step 4 — Tension

`TensionIndicator` is a single object per config. The API catalogue
(`04_tension_indicator.md`) governs the exact fields — inspect at build
time. Expected fields (to be confirmed against the catalogue):

- `name` — Input
- `definition` — Textarea, 3 rows
- `starting_level` — Select (1–7)
- `rationale` — Textarea, 3 rows

**Extraction pre-fill:** if `source_extraction_id` is set on the config,
pre-fill from `re.tension_suggestion` with matching fields:

| TensionIndicator field | ReportExtraction source |
|---|---|
| `name` | `tension_suggestion.name` |
| `definition` | `tension_suggestion.definition` |
| `starting_level` | `tension_suggestion.suggested_starting_level` |
| `rationale` | `tension_suggestion.rationale` |

**Save:** POST on first save (creates the TensionIndicator), PATCH on
re-edit. API paths follow the pattern `POST /v1/scenario-configs/:id/
tension-indicator` (confirm at build time against `docs/curls.md`).

### Step 5 — Dimensions

**Constraint:** 0 or more DimensionDefinitions. **DimensionDefinition has
no `weight` field** (despite the contradictory claim in
`03_scenario_config.md`'s submit-for-review section — that's a catalogue
error). Weights live on EvaluationCriteria (Step 6), not here. Per
`05_dimension_definition.md`, DimensionDefinitions are weight-free
attributes of the world state.

**List view:**
- Header: `"DIMENSIONS"` mono label + count chip `"{n}"` (no required
  threshold)
- Rows, each editable inline. Exact field set per
  `05_dimension_definition.md` (inspect at build time). Expected:
  - `name` — Input (e.g. "Political stability")
  - `key` — Input (lowercase_snake — enforce via regex)
  - `definition` — Textarea 2 rows
  - `starting_value` — Select 1–5 (or per catalogue range)
  - `display_order` — implicit from list position
- `"+ Add dimension"` button, no upper limit
- Each row has a trash icon

**Advance gate:** none — Step 5 is optional. User may proceed with zero
DimensionDefinitions.

**AI generation (Phase 2):** a future "Generate dimensions" button that
calls an endpoint similar to `POST /v1/scenario-configs/:id/dimensions/
generate`. Not built in Phase 1 — hand-authored only.

**Save:** per-row PATCH or bulk POST depending on endpoint shape in
`05_dimension_definition.md` — inspect at build time.

### Step 6 — Scoring (EvaluationCriteria)

**Constraint:** 1–5 criteria, weights sum to 100. (Note: weights live
on EvaluationCriteria only. DimensionDefinition is weight-free — see
Step 5.)

Same pattern as Step 5:
- List of rows with `criteria_key` (lowercase_snake), `name`,
  `description`, `weight` (integer 0–100)
- Sum indicator at top: `"Weight total: {sum}/100"` — red if not 100,
  teal-bright at exactly 100. Read `sum` from
  `GET /v1/scenario-configs/:id/evaluation-criteria` response, which
  uses a non-standard envelope: `{items: [...], meta: {weight_sum: number}}`.
  No client-side recomputation needed when the response is fresh — but
  do recompute client-side after local edits before the next save round-trips.
- `"+ Add criterion"` button, disabled at 5 rows
- Inspect `05b_evaluation_criteria.md` at build time for exact field list

**Advance gate:** 1–5 rows AND weight sum = 100.

### Step 7 — Player perspective

PlayerPerspective is a single object per config. Fields per
`09_player_perspective.md` (inspect at build time). Expected:

- `role_description` — Textarea
- `objectives` — Textarea
- `constraints` — Textarea
- `information_access` — Textarea

No extraction pre-fill (PlayerPerspective is config-specific, not
extracted).

### Step 8 — Advisors

**Constraint:** ≥1 advisor with `is_primary: true`.

**List view:**
- Header: `"ADVISORS"` mono label + count chip `"{n} · {primary_count}
  primary"` — turns teal-bright at `primary_count >= 1`
- Rows, inline editable or Drawer:
  - `name` — Input
  - `role` — Input (e.g. "Chief Intelligence Officer")
  - `persona` — Textarea
  - `knowledge_domain` — Textarea
  - `is_primary` — Toggle. Only one can be primary — selecting marks
    others as `false`
  - Inspect `08_advisor.md` at build time for full field list
- `"+ Add advisor"` button, no upper limit

**Advance gate:** ≥1 row AND exactly 1 `is_primary: true`.

### Step 9 — Turn questions

**Constraint:** ≥1 TurnQuestion per turn number (1..`turn_count`).

**Layout:**
- One collapsible section per turn number, labeled `"TURN 1"`, `"TURN 2"`,
  etc. Section header shows question count on the right:
  `"3 questions"` (teal-bright if ≥1, secondary if 0)
- Inside each section: list of TurnQuestion rows with `question_text`,
  `evaluation_tags[]` (chips picked from the EvaluationCriteria set defined
  in Step 6 — `criteria_key` values), `question_order`
- `"+ Add question"` button per turn section
- AI generation deferred to Phase 2. No `"Generate draft"` button in
  Phase 1.
  - The endpoint `POST /v1/scenario-configs/:id/turn-questions/generate`
    is documented in `00_overview.md` but does not exist in OpenAPI as
    of 2026-04-24. Phase 1 ships hand-authored questions only.

**Advance gate:** every turn from 1 to `turn_count` has ≥1 question.

### Step 10 — Turn 1 template

Turn1Template is the canonical Turn 1 package. Per OpenAPI's
`CreateTurn1TemplateRequest`:
- `dimension_snapshot` — initial DimensionSnapshot values (optional)
- `advisor_stubs[]` — initial advisor messages (optional, one per
  advisor — exact shape per OpenAPI)
- `content_items[]` — seed ContentItems for Turn 1 (optional, exact
  shape per `ContentItemInput` in OpenAPI: `{type, title, body,
  source_seed_id?, image_url?, video_url?}`)

`turn_questions` are NOT part of Turn1Template — they live on the
config and reference is by `turn_number`, not copied.

**API path:** `POST /v1/scenario-configs/:id/turn1-template` is the
direct create endpoint — accepts the full body shape above.
**Not** `POST /v1/scenario-configs/:id/turn1-template/generate` — that
endpoint does not exist in OpenAPI. Any prior reference to a `/generate`
path was aspirational catalogue content.

**Top of step:**
- `"Start blank"` primary button — calls `POST .../turn1-template` with
  an empty body `{}` (all fields optional on Create). Then enables the
  form for hand-authoring.
- AI generation deferred to Phase 2. No `"Generate draft"` button in
  Phase 1.

**Form:** detailed editors for each sub-piece (`dimension_snapshot`,
`advisor_stubs[]`, `content_items[]`). Exact UI depends on the live
record shape — inspect after first POST returns.

**PATCH and `content_items` — known asymmetry:**
The current `PatchTurn1TemplateRequest` schema does NOT accept
`content_items`. PATCH requests with `content_items` are silently
dropped (verified C8 probe, 2026-04-24). Per architectural decision,
the API team will extend `PatchTurn1TemplateRequest` to accept
`content_items` as a full-array replacement. Until that ships, Phase 1
treats `content_items` as **write-once on Create**:

- The form lets the user populate `content_items` BEFORE the first
  PATCH on Turn1Template.
- Once the record exists, the `content_items` UI shows an edit-disabled
  state with helper text:
  `"Content items are write-once until the API supports PATCH. Coming soon."`
- `dimension_snapshot` and `advisor_stubs[]` ARE patchable and remain
  editable.

When the API ships the PATCH update, this section unblocks (no spec
change needed; the disabled state is gated on a feature flag or just
removed).

**Completeness note:** `03_scenario_config.md` says Turn1Template
"completeness is determined by reviewer, not schema" — so the advance
gate is only "Turn1Template record exists." The approve/reject step does
the final judgment.

### Step 11 — Publish & validate

This is the terminal step. No form fields — just status display and
action buttons.

**Readiness checklist block:**

> **Important:** This checklist is **client-side UX validation only**.
> The `POST /v1/scenario-configs/:id/submit-for-review` endpoint
> does NOT enforce these rules server-side — verified D4 probe
> 2026-04-24, the endpoint accepts an empty config and transitions
> `draft → in_review` with no validation. The checklist exists to
> guide authors and gate the Submit button on the frontend, not as
> an API contract. The real readiness gate may live at a later
> lifecycle stage (e.g. `/approve`, `/publish`) — TBD.

Each requirement rendered as a row with a check icon (teal-bright
Lucide `CheckCircle2` 16px) if met, or an X (red Lucide `XCircle`
16px) if not. Rows clickable — click jumps to the relevant step.

- Scenario is `published`
- ≥3 actors
- `analytical_framework_id` assigned on the config
- 1 TensionIndicator
- 0 or more DimensionDefinitions (no minimum required)
- 1+ TurnQuestion per turn number (1..`turn_count`)
- 1+ Advisor with `is_primary: true`
- 1–5 EvaluationCriteria with weights summing to 100
- 1 PlayerPerspective
- 1 Turn1Template

**Actions:**
- Primary: `"Submit for review"` →
  `POST /v1/scenario-configs/:id/submit-for-review`. Disabled until all
  checklist rows pass.
  - On 200: config transitions to `in_review`. Re-render enables the
    approve / reject actions below.
  - On 422 (unlikely given current server behavior accepts empty):
    surface field-level errors inline with a Toast `"Some requirements
    are not met."` and scroll to the first failing checklist row.
  - On 200 with empty/incomplete config: server has accepted but the
    config is not actually game-ready. Frontend's checklist is the
    only safeguard — keep the Submit button disabled until the
    checklist passes, even though the server would accept the call.
- `"Approve"` primary (teal) → `POST /v1/scenario-configs/:id/approve`.
  Visible only when `status === 'in_review'`. On success: config →
  `validated`. Page transitions to the post-validation state.
- `"Reject / Return to draft"` destructive ghost →
  `POST /v1/scenario-configs/:id/reject`. Visible only when
  `status === 'in_review'`.
- Staff-only: `"Start ConfigValidation cycle"` →
  `POST /v1/scenario-configs/:config_id/config-validations`. Phase 2
  scope. Hidden in Phase 1 for all scopes.

**Post-validation state:**
When `config.status === 'validated'`, render a success block:
- Lucide `CheckCircle2` 40px teal-bright
- Heading: `"Scenario ready for play"`
- Body: `"Players can now create games against this config."`
- Primary: `"Create a game"` → navigates to `/org/games/new?
  scenario_config_id=:id` (scaffold route — OrgManagementPage will handle
  this in Phase 2)
- Secondary: `"Clone config for a new lens"` ghost (Phase 2 — disabled
  until clone endpoint is built)

---

## State 3 — Tabbed Editor Mode

Activated when: user clicks `"Edit freely"` in the stepped flow footer,
OR the Scenario loads at `/author/:id` with an `in_review` / `validated`
/ `retired` config.

### Metadata bar (§6)

- Left: inline-editable Scenario `title` (§18) —
  `PATCH /v1/scenarios/:id` with `{ title }`. Blocked when
  `scenario_narrative` and `actors` are also locked (published Scenario
  + validated/active downstream config, per `02_scenario.md`).
- Inline-editable ScenarioConfig `name` —
  `PATCH /v1/scenario-configs/:id`. Blocked when config is `validated` or
  `retired`.
- Applied tags: not used on this page — tags live on ClientExtraction.
- Right: config status Badge (`draft`, `in_review`, `validated`, `retired`)
- (No Delete icon in Phase 1.) `DELETE /v1/scenarios/:id` returns 405 —
  the endpoint is not implemented. Use Archive (the `Archive` icon
  button below) instead. When/if the API ships hard delete, restore
  the Trash icon and the modal pattern.
- Archive: `Archive` icon button (Lucide). Opens confirmation Modal:
  `"Archive scenario '{title}'? You can unarchive later."`
  Calls `POST /v1/scenarios/:id/archive` on confirm.

### Top bar (§8)

- Left: Scenario status Badge (`draft`, `published`, `archived`)
- Right: `"Back to steps"` ghost button if applicable — switches back to
  stepped flow.

### Tabs (§5)

Full-width equal tab row. All tabs visible when tabbed editor is active.

| Tab | All users | Staff only |
|---|---|---|
| Framing | ✓ | |
| Actors | ✓ | |
| Config | ✓ | |
| Tension | ✓ | |
| Dimensions | ✓ | |
| Scoring | ✓ | |
| Perspective | ✓ | |
| Advisors | ✓ | |
| Questions | ✓ | |
| Turn 1 | ✓ | |
| Review | ✓ | |
| Validation | — | ✓ |

Default active tab: the first tab with an unmet requirement, or `Framing`
if all are met.

Tab bodies are the same section components used in the stepped flow — no
duplication.

### Lock behavior in tabbed mode

Per `02_scenario.md`: once Scenario is `published` AND any downstream
config is in `validated` or `active` status, `scenario_narrative` and
`actors` become read-only. Render those fields with a 11px mono secondary
`"LOCKED"` chip and disabled inputs. Other Scenario fields remain editable.

Per `03_scenario_config.md`: once ScenarioConfig is `validated` or
`retired`, all PATCH is blocked. Render the whole Config, Tension,
Dimensions, Scoring, Perspective, Advisors, Questions, Turn 1 tabs as
read-only with a banner at top:
`"This config is {status}. Clone to make changes."` + `"Clone config"`
button (Phase 2 — disabled until clone endpoint is built).

### Archive / Delete semantics

**Phase 1 cleanup is archive-only.** Hard delete is not supported on
the live API for either Scenario or ScenarioConfig:

- `DELETE /v1/scenarios/:id` returns 405 (endpoint not implemented).
  Catalogue describes a "blocked if configs exist" 409 constraint, but
  that's aspirational. Use `POST /v1/scenarios/:id/archive` for cleanup.
- `DELETE /v1/scenario-configs/:id` is marked planned-not-built in
  `03_scenario_config.md`. No delete affordance for configs in Phase 1.

Modal wording for scenario archive:
`"Archive scenario '{title}'? You can unarchive later."`
Confirm button variant `default` (not destructive — archive is
reversible).

When the API ships hard delete (per `API-REPO-ISSUES.md` items 4 + 5),
restore a destructive Trash icon and the original modal wording. Until
then, archive is the only path.

---

## TanStack Query Keys

```javascript
['scenarios', clientId, { status }]             // list, filtered
['scenario', scenarioId]                        // full scenario + actors
['configs', scenarioId]                         // configs for a scenario
['config', configId]                            // full scenario config
['frameworks', clientId]                        // framework picker list
['framework', frameworkId]                      // single framework
['extraction', reId]                            // shared with ExtractionPage cache
['extractions', clientId]                       // shared (picker list)
['tension', configId]                           // TensionIndicator
['dimensions', configId]                        // DimensionDefinition list
['criteria', configId]                          // EvaluationCriteria list
['perspective', configId]                       // PlayerPerspective
['advisors', configId]                          // Advisor list
['turn-questions', configId]                    // TurnQuestion list
['turn1-template', configId]                    // Turn1Template
['config-validations', configId]                // ConfigValidation cycles (staff)
```

Append to `docs/query-keys.md` on build.

---

## Key Actions

| Action | Trigger | API call |
|---|---|---|
| Land on page | Page mount, no `:id` | render picker tiles |
| Pick extraction | Drawer row click | `GET /v1/report-extractions/:id` → `POST /v1/scenarios` with source_extraction_id + pre-fill |
| Start blank | Tile button | Navigate to `/author/new` — no API call; POST defers to first save |
| First save in creation mode | Save & next / Save draft & exit on `/author/new` | `POST /v1/scenarios` (null source) with filled fields |
| Load existing scenario | URL `:id` mount | `GET /v1/scenarios/:id` → then `GET /v1/scenarios/:id/configs` |
| Edit scenario field | Blur / Save | `PATCH /v1/scenarios/:id` |
| Add/edit/remove actor | Actor editor save | `PATCH /v1/scenarios/:id` with full actors[] |
| Publish scenario | Implicit on Step 3 entry | `POST /v1/scenarios/:id/publish` |
| Create config | Step 3 first save | `POST /v1/scenarios/:scenario_id/configs` (nested — live endpoint per catalogue) |
| Edit config field | Blur / Save | `PATCH /v1/scenario-configs/:id` |
| Load framework list | Step 3 open | `GET /v1/analytical-frameworks` |
| Clone framework | Clone button | `POST /v1/analytical-frameworks/:id/clone` |
| Create TensionIndicator | Step 4 first save | `POST /v1/scenario-configs/:id/tension-indicator` (confirm path) |
| Edit TensionIndicator | Blur / Save | `PATCH ...` (confirm path) |
| Create/edit DimensionDefinitions | Step 5 save | per `05_dimension_definition.md` |
| Create/edit EvaluationCriteria | Step 6 save | per `05b_evaluation_criteria.md` |
| Create/edit PlayerPerspective | Step 7 save | per `09_player_perspective.md` |
| Create/edit Advisors | Step 8 save | per `08_advisor.md` |
| Create/edit TurnQuestions | Step 9 save | per `06_turn_question.md` |
| Create/edit Turn1Template | Step 10 save | per `10b_turn1_template.md` |
| Submit for review | Step 11 button | `POST /v1/scenario-configs/:id/submit-for-review` |
| Approve (org path) | Step 11 button | `POST /v1/scenario-configs/:id/approve` |
| Reject (org path) | Step 11 button | `POST /v1/scenario-configs/:id/reject` |
| Start validation cycle (staff) | Step 11, validation tab | `POST /v1/scenario-configs/:config_id/config-validations` |
| Approve validation (staff) | Validation tab | `POST /v1/scenario-configs/:config_id/config-validations/:id/approve` |
| Reject validation (staff) | Validation tab | `POST /v1/scenario-configs/:config_id/config-validations/:id/reject` |
| Archive scenario | Metadata bar | `POST /v1/scenarios/:id/archive` |
| Delete scenario | (unsupported by API) | — Use Archive instead. |

---

## API Reference

All paths prefixed `/v1/`.

```
# Scenario
POST   /v1/scenarios
GET    /v1/scenarios
GET    /v1/scenarios/:id
PATCH  /v1/scenarios/:id
POST   /v1/scenarios/:id/publish
POST   /v1/scenarios/:id/archive
GET    /v1/scenarios/:id/configs
POST   /v1/scenarios/:scenario_id/configs       # nested create — the live path

# ScenarioConfig
GET    /v1/scenario-configs
GET    /v1/scenario-configs/:id
PATCH  /v1/scenario-configs/:id
POST   /v1/scenario-configs/:id/submit-for-review
POST   /v1/scenario-configs/:id/approve         # org-facing
POST   /v1/scenario-configs/:id/reject          # org-facing

# AnalyticalFramework
GET    /v1/analytical-frameworks
GET    /v1/analytical-frameworks/:id
POST   /v1/analytical-frameworks/:id/clone

# ReportExtraction (read only, shared with ExtractionPage)
GET    /v1/report-extractions/:id
GET    /v1/clients/:id/extractions

# Child objects (confirm exact paths at build time against per-object catalogues)
POST/GET/PATCH /v1/scenario-configs/:id/tension-indicator
POST/GET/PATCH /v1/scenario-configs/:id/dimension-definitions
POST/GET/PATCH /v1/scenario-configs/:id/evaluation-criteria
POST/GET/PATCH /v1/scenario-configs/:id/player-perspective
POST/GET/PATCH /v1/scenario-configs/:id/advisors
POST/GET/PATCH /v1/scenario-configs/:id/turn-questions
POST/GET/PATCH /v1/scenario-configs/:id/turn1-template
# `content_items` is accepted on Create only (Phase 1).
# PatchTurn1TemplateRequest does not include content_items as of
# 2026-04-24 — pending API team adding it to the PATCH schema.
# `/turn-questions/generate` and `/turn1-template/generate` do not
# exist in OpenAPI; AI generation is Phase 2.

# ConfigValidation (staff, Phase 2)
POST   /v1/scenario-configs/:config_id/config-validations
GET    /v1/scenario-configs/:config_id/config-validations
POST   /v1/scenario-configs/:config_id/config-validations/:id/approve
POST   /v1/scenario-configs/:config_id/config-validations/:id/reject
```

All API functions live in one of:
- `src/api/scenario.js` — Scenario + actors
- `src/api/scenarioConfig.js` — ScenarioConfig + submit/approve/reject
- `src/api/framework.js` — AnalyticalFramework
- `src/api/scenarioChildren.js` — all child object CRUD, grouped by object
- `src/api/extraction.js` — already exists, reused

---

## Component Usage

| Component | Usage |
|---|---|
| `PageShell` | Outer wrapper, no sidebar |
| `Button` | All CTAs: Start blank, Save & next, Submit for review, Approve, Reject |
| `Badge` | Scenario status, ScenarioConfig status, tier pills, `is_primary` chip |
| `Input` | Inline fields throughout |
| `Textarea` | Narrative, description, goal text, behavior, history, etc. |
| `Select` | Enums: tier_minimum (3 values), game_type, time_horizon (4 values), priority (1\|2\|3), dimension starting_value, current_posture (6 values) |
| `Toggle` | `is_visible_to_player`, `is_primary`, `requires_validation` |
| `Card` | Actor cards, framework picker rows |
| `Drawer` | Extraction picker (480px), Actor editor (640px), Framework picker (480px) |
| `Modal` | Delete confirmations, archive confirmation |
| `Toast` | Generate success, save success (only on explicit save, not auto-save), errors |
| `ProgressBar` | During AI generation calls (Turn1Template, TurnQuestions) |
| `Skeleton` | Loading states per object |
| `StepIndicator` | Stepped flow navigation |

Local sub-components (inside `AuthoringPage.jsx`):
- `StartingPointTiles` — the three landing tiles
- `ExtractionPickerDrawer` — drawer body + list
- `ClientPickerDrawer` — staff-only client picker
- `FrameworkPickerDrawer` — framework list and selection
- `ActorCard` / `ActorEditor` — actor list item and editor
- `DimensionRow`, `CriteriaRow`, `AdvisorRow`, `QuestionRow` — repeating
  row editors
- `ReadinessChecklist` — Step 11 checklist component
- `StepFooter` — back / save / edit-freely footer
- `MappingCallout` — shown on Actor Step when an extraction's
  `capabilities_overview` had no target field

Do not add these to `src/components/ui/`.

---

## Constraints

### API truthfulness
Before wiring any endpoint marked with "confirm at build time" above,
check `docs/curls.md` and the corresponding per-object catalogue file
in `docs/api/`. Several endpoints in `00_overview.md` carry "Planned —
not yet built" markers. The page must not call unbuilt endpoints.

Known planned-not-built endpoints at spec write time (April 2026):
- `POST /scenario-configs` (flat path) — use nested
  `POST /scenarios/:scenario_id/configs` instead
- `POST /scenario-configs/:id/validate-override`
- `POST /scenario-configs/:id/release-turn`
- `POST /scenario-configs/:id/retire`
- `POST /scenario-configs/:id/clone`
- `DELETE /scenario-configs/:id`

Phase 1 UI treats each as a disabled affordance with a `"Coming soon"`
chip — do not silently omit. Users should see the capability is planned.

### AI generation prompt quality
The Turn1Template and TurnQuestions generate endpoints are wired to
stubbed prompts per the API handoff. Phase 1 treats generated output as
a starting draft — the author is expected to heavily edit. Do not build
prompt-tuning UI, auto-accept, or output scoring — AI prompt quality is
a Step 7 platform concern (deferred), not this page.

### Extraction pre-fill mapping is one-way and one-time
Pre-fill happens only when the Scenario is first created from an
extraction (`POST /v1/scenarios` body includes extraction-sourced fields).
After creation, the Scenario is the source of truth. Do not add a
"Refresh from extraction" button — it would overwrite author edits.

The `capabilities_overview` field on ReportExtraction actor suggestions
has no target field on Scenario.actor. The page surfaces it as a
read-only reference via `MappingCallout` — it is not written to any
field on save.

`inject_seeds` from ReportExtraction are not consumed by this page in
Phase 1. In Phase 2 they seed ContentSeed records on the config.

### Scope gates
- Platform-level AnalyticalFramework creation is staff-only in v1 per
  `01_analytical_framework.md`. ClientAdmin sees `"+ Create framework"`
  disabled with `"Staff only"` chip.
- ConfigValidation cycle endpoints are staff-only. The Validation tab
  is hidden for ClientAdmin.
- Staff may select `"Platform / none"` client in the client picker.
  ClientAdmin is always scoped to their own `client_id`.

### Lifecycle locks
- Published Scenario + validated/active config → `scenario_narrative`
  and `actors` become read-only. Rendered as disabled inputs with
  `"LOCKED"` chip.
- Validated or retired config → entire config and all children become
  read-only. Banner at top directs user to clone (when built).

### Data freshness on tab switch
When switching tabs in the tabbed editor, let TanStack Query's
`staleTime: 30000` govern refetches. Do not invalidate on every tab
switch — it would thrash the API and clobber in-flight edits.

### URL behavior
- `/author/new` is transient: redirect to `/author/:scenario_id` as soon
  as the scenario ID is known. Use `navigate(..., { replace: true })`
  so back button does not return to `/author/new`.
- `/author/:scenario_id` is shareable within the org but not public —
  `ProtectedRoute` covers the auth gate. If a ClientAdmin lands on a
  scenario owned by a different client, the API will 403/404 — show the
  same error state as an unknown ID.

### No draft state in browser
Per Frontend Handoff "State Persistence" rules: all authoring state
persists to the API on save. No localStorage. No in-browser draft recovery.
If the user closes the tab mid-step, their last saved state is what
reloads.

### Do not use localStorage for any state.
sessionStorage is reserved for `warpaths_token` only. AuthoringPage's
own UI state (which step, which tab, which picker is open) is React
state and does not persist across page reloads.

### All token values via CSS custom properties — no hardcoded hex values.

---

## API Behavior Notes

These behaviors are platform-wide on warpaths-api as of April 2026 and
shape how this page constructs requests and reads responses. They are
not per-endpoint quirks; treat as platform invariants until backend
work changes them.

### Silent-drop on unknown POST/PATCH fields

The API uses pydantic models with `extra="ignore"` (the default).
Unknown field names in a request body do NOT raise 422 — they are
silently dropped, the request returns 201/200, and the data is lost.

**Verified instances** (probe batch, 2026-04-24):
- `goal_items` on Actor POST → dropped (real field is `goals`)
- `content_items` on Turn1Template PATCH → dropped (PATCH schema lacks it)
- `authored_by_client_id` on Scenario POST → dropped

**Implication for this page:** every POST/PATCH body must use field
names exactly as declared in `openapi.json`. There is no defensive 422
to catch typos. When adding a new field to a request, verify against
OpenAPI before writing code; assume any "obvious" name not in the
schema will silently disappear.

### Response shapes mostly UNDECLARED in OpenAPI

140 of 144 success (200/201) responses in `openapi.json` have
`schema: {}` — no `response_model=...` declaration on the FastAPI
routes. OpenAPI is authoritative for request bodies but is silent on
response shapes for ~97% of endpoints.

**Implication for this page:** treat response shapes defensively. Verify
the live response shape via probe before adding code that destructures
new response fields. Document any newly-discovered response shape in
`docs/response-shapes.md` with a `Last probed:` date.

### List endpoint envelopes vary

- `{items: [...]}` — Scenario, ClientExtraction, ScenarioConfig
  list endpoints
- `{items: [...], next_cursor: "..."}` — ReportExtraction (cursor
  pagination, all list endpoints with cursor params)
- `{items: [...], meta: {weight_sum: number}}` — EvaluationCriteria
  (non-standard envelope, used for authoring-progress display)
- bare array — none confirmed; assume envelope until probe confirms

`src/api/*.js` modules unwrap the envelope inside the function and
return the consumer-friendly shape (a plain array, or in the
EvaluationCriteria case, `{items, weight_sum}`). Consumers do not
re-unwrap with `.items`.

### Scenario response shape (verified B1 probe, 2026-04-24)

The Scenario record returned by `GET /v1/scenarios/:id` includes:
- `id`, `source_extraction_id`, `origin`, `status`, `title`,
  `category`, `subcategory`, `tier_minimum`, `scenario_narrative`,
  `setting`, `time_horizon` (`{planning_horizon, incident_horizon, notes}`),
  `availability_window_days`, `actors` (inlined array of full Actor records),
  `published_at`, `created_at`, `updated_at`

It does NOT include:
- `authored_by_client_id` — referenced by `03_scenario_config.md` but
  absent from response. Question deferred to staff-JWT milestone.
  Frontend should not render or rely on this field in Phase 1.
- `schema_version` — not in response.

The `origin` field is undeclared in the catalogue corpus but observed
live. Known values: `manually_authored`, `ai_extracted` (the latter
inferred from extraction-sourced scenarios). Treat as enum; do not
expose in UI yet.

`actors` are **inlined** on Scenario GET. No separate fetch needed
for Step 2 — read `scenario.actors` directly from the loaded record.

### ScenarioConfig response shape (verified B4 probe, 2026-04-24)

The ScenarioConfig record returned by `GET /v1/scenario-configs/:id`
includes:
- `id`, `scenario_id`, `source_extraction_id`,
  `analytical_framework_id`, `name`, `description`, `status`,
  `game_type`, `turn_count`, `requires_validation`,
  `max_exchanges_per_turn`, `minimum_runs_for_insight`,
  `released_through_turn`, `created_at`, `updated_at`

It does NOT include:
- `circle_space_id` — absent. Stoplight had this field; it's wrong.
- Child objects — advisors, dimensions, evaluation_criteria,
  tension_indicator, player_perspective, turn_questions,
  content_seeds, turn1_template, config_validations are NOT inlined.
  Each child has its own sub-endpoint.

This is **different from Scenario** (which inlines actors). Steps 4
through 10 each fetch their respective child object via its
sub-endpoint — there is no single fat-fetch that loads the whole config.
Plan TanStack Query keys accordingly:

```
['config', configId]                  // ScenarioConfig record only
['tension-indicator', configId]
['dimensions', configId]
['criteria', configId]
['perspective', configId]
['advisors', configId]
['turn-questions', configId]
['turn1-template', configId]
```

### Server-side readiness gate at submit-for-review does NOT exist

Verified D4 probe 2026-04-24: `POST /v1/scenario-configs/:id/submit-for-review`
on a completely empty config returned 200 and transitioned status
`draft → in_review`. No 422, no field-level errors. The catalogue's
readiness rules are aspirational at this lifecycle stage.

This page's readiness checklist (Step 11) is therefore **client-side
UX validation only**. See Step 11 for full treatment.

### `DELETE /v1/scenarios/:id` returns 405

The catalogue documents this endpoint with a "blocked if configs exist"
constraint. The endpoint is not declared in OpenAPI and returns 405 on
the live API. Use `POST /v1/scenarios/:id/archive` for cleanup. The
frontend should not expose a "Delete scenario" action in Phase 1.

---

## Phase 1 vs Phase 2 Split

**Phase 1 (this build — ships to unblock GamePage):**
- Landing picker: Extraction + Blank tiles enabled; AI Suggestion and
  Clone tiles visible-but-disabled for staff, hidden for ClientAdmin
- Full stepped flow, Steps 1–11
- Extraction pre-fill for Scenario + Actors + TensionIndicator
- Framework picker with platform-default Realism, staff can pick/clone
- Scenario publish, ScenarioConfig submit-for-review, approve/reject
- Tabbed editor mode (all tabs, with lock behavior)
- Archive Scenario (hard Delete returns 405 from API; not in Phase 1)
- (No `"Generate draft"` buttons in Phase 1 — endpoints don't exist yet)

**Phase 2 (deferred):**
- AI Suggestion tile wiring (staff entry point to AI agent draft
  scenario creation)
- Clone tile (pending `POST /scenario-configs/:id/clone` endpoint build)
- `"+ Create framework"` staff editor
- ContentSeed pool authoring on Advisors step
- ConfigValidation cycle (staff review path, Validation tab)
- Retire config action (pending endpoint build)
- AI generation for Dimensions / Criteria / Perspective / Advisors
- AI generation for TurnQuestions (POST .../turn-questions/generate)
- AI generation for Turn1Template (POST .../turn1-template/generate)
- `inject_seeds[]` → ContentSeed pre-fill
- Richer extraction cross-reference panel during Dimensions / Criteria
  authoring (show `scenario_suggestion.escalation_dynamics`,
  `key_assumptions`, etc. as reference while author types)
- Category taxonomy enum (Phase 1 is free text)
- Scenario list view at `/author` (currently only picker tiles; list
  view belongs on OrgManagementPage when built)
- Auto-save pattern on text fields (Phase 1 is explicit save per step)
- ClientAdmin engagement duration control — needs UX design.
  `availability_window_days` currently hidden from ClientAdmin; future
  Org Management page may expose a friendlier version (e.g., "Game
  stays open for: 7 days / 14 days / 30 days / until closed").

---

## Open Questions for Build Time

1. Exact field shapes for TensionIndicator, DimensionDefinition,
   EvaluationCriteria, PlayerPerspective, Advisor, TurnQuestion,
   Turn1Template — spec references per-object catalogues; confirm each
   before wiring inputs.
2. Whether `GET /v1/scenario-configs?analytical_framework_id=:id` query
   filter is built — used for the framework-in-use warning. If not,
   rely on API 409 at PATCH time and surface as an inline error instead.
3. Whether `GET /v1/clients` is open to staff for the client picker —
   confirm against `docs/curls.md`. If not, staff must enter a client_id
   manually.
4. Exact Turn1Template schema determines Step 10 UI — defer detailed
   input design to post-generate-draft review.
5. (Resolved 2026-04-24) `POST .../turn-questions/generate` and
   `POST .../turn1-template/generate` do not exist in OpenAPI. AI
   generation is deferred to Phase 2 entirely; no UI affordance in
   Phase 1.

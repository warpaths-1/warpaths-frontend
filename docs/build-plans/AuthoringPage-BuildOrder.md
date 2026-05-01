# AuthoringPage — Build Order
## CC Session Plan

**Companion doc to:** `docs/pages/AuthoringPage.md`
**Strategy:** Walking skeleton first, then vertical slices per step group.
**Target:** A visible, navigable page after Session 1. Each subsequent
session leaves the page in a runnable state with one more step-group
fully wired.

**Last updated:** 2026-04-26 (post-Session 4 + post-API-audit).

---

## CRITICAL — Audit-driven prompt revision required for remaining sessions

Sessions 5a, 5b, 5c, 5d, 6, 7, 8 were drafted **pre-audit** (April 2026).
The API audit surfaced systemic drift: catalogue field names didn't
match live API, response envelopes weren't documented, silent-drop
behavior on unknown POST fields hides bugs, etc.

**Every remaining session prompt MUST receive an audit-aware diff pass
before its build runs.** This pattern was established in Session 4 with
13 edits across 3 sub-prompts and surfaced 2 issues during pre-build
verification that would have caused runtime bugs. Without this pass,
Sessions 5–8 will hit the same class of bugs.

**Required steps for each future session:**
1. Read the original session prompt
2. Identify drift items:
   - Silent-drop risks (unknown field names dropped silently)
   - Response shape assumptions (most endpoints have `schema: {}` in
     OpenAPI — verify via probe)
   - Query key cache partitioning (server may auto-scope; don't add
     redundant keys)
   - List endpoint envelope variants (`{items: [...]}` is dominant
     but not universal)
   - Immutable field constraints (PATCH schemas may be more
     restrictive than POST)
   - Planned-not-built endpoints (catalogue claims, OpenAPI omits)
3. Write a precise before/after diff prompt
4. Apply diff
5. Have CC re-read for inter-section contradictions
6. Apply cleanup edits if any contradictions surface
7. Run the actual session build — CC opens with pre-build verification
   probes against the live API for any new request body shapes

**Sources of audit truth:**
- `~/dev/api-audit/deliverables/DRIFT-REPORT.md` — comprehensive drift
- `~/dev/api-audit/deliverables/PROBE-RESULTS-BATCH1.md` — verified
  responses and silent-drop confirmations
- `openapi.json` from the live API — request schemas authoritative
- `docs/response-shapes.md` — frontend's documented live shapes (with
  `Last probed:` stamps; entries >90 days re-probe before relying)

Skip this pass at your peril. The audit work isn't reusable across
sessions automatically — each prompt is its own document and needs
its own update.

---

## How to Use This Document

Hand one session at a time to Claude Code. Each session section below
is self-contained.

**Two prompt formats are available:**

1. **Short prompts** — the "Prompt to CC" paragraph at the bottom of
   each session section below. Use these if you're confident CC will
   find and read the right docs on its own.
2. **Full-context prompts** — copy-paste-ready prompts at
   `docs/cc-prompts/SESSION-*.md`. These explicitly list every doc CC
   must read before writing code, with exact paths including the three
   CLAUDE.md files. They also include the process step of asking CC to
   summarize its understanding before writing code, so you can course-
   correct cheaply. **Recommended for each session.**

For Sessions 5a–8: do not use the short prompts unless the audit-driven
revision has already been applied to the corresponding full-context
prompt file. The short prompts in this doc were written pre-audit.

Each session section has:
- **Status** — Done / In progress / Pending / Pending audit revision
- **Preconditions** — what must be true before starting
- **Deliverables** — what the session ships
- **Out of scope** — what to explicitly defer
- **Acceptance** — what "done" looks like before closing the session
- **Files touched** — the expected file list
- **Prompt to CC** — short paragraph; full-context version in
  `docs/cc-prompts/`

---

## Session Map

| # | Session | Lands on page | Status |
|---|---|---|---|
| 1 | Scaffold + landing + step skeleton | Navigable dead UI | ✅ Done |
| 2 | Scenario CRUD (Step 1) | Scenario saves; actors don't yet | ✅ Done |
| 3 | Actors (Step 2) | Can publish a Scenario | ✅ Done |
| 4 | Config + framework picker (Step 3) | Config exists, children don't | ✅ Done |
| 5a | Step 4 Tension | TensionIndicator wired | ⚠️ Pending audit revision |
| 5b | Step 5 Dimensions | DimensionDefinition wired | ⚠️ Pending audit revision (significant) |
| 5c | Step 6 Scoring | EvaluationCriteria wired | ⚠️ Pending audit revision |
| 5d | Step 7 Perspective | PlayerPerspective wired | ⚠️ Pending audit revision |
| 6 | Steps 8 Advisors + 9 TurnQuestions | Collections wired | ⚠️ Pending audit revision |
| 7 | Step 10 Turn1Template | Full template editor | ⚠️ Pending audit revision (significant) |
| 8 | Step 11 Review + Tabbed editor | End-to-end to validated config | ⚠️ Pending audit revision (significant) |

**Significant audit revision** = the original prompt has been materially
invalidated by audit findings; a substantial rewrite is needed, not just
small edits.

**After Session 4 (current state):** the AuthoringPage flow can create
a Scenario from extraction, edit it, add ≥3 actors, auto-publish,
create a ScenarioConfig, and assign an AnalyticalFramework. Step 4+
are placeholders.

**After Session 8:** end-to-end Phase 1 flow works. GamePage work can
start from there.

---

## Mid-session and emergency mini-sessions

Several "mini" sessions were inserted during the build to fix issues
or add UX features. These are committed and complete:

| Session | Purpose | Status |
|---|---|---|
| 1.5 | Drawer slides from left; staff-only AI Suggestion tile | ✅ Done |
| 2.5 | Staff-gate `tier_minimum` + `availability_window_days`; label rename | ✅ Done |
| 3.5 | Actor `current_posture` enum fix (drift bug) | ✅ Done |
| 3.6 | UX refinements: "Scenario in progress" rename; collapsible ActorCards; resume logic | ✅ Done |
| 3.7 | Cancel button + Modal; blank scenarios defer POST to first save; multi-select tag filter | ✅ Done |
| 3.8 | Drawer date source fix (`extracted_at` → `created_at`); same applied to ExtractionPage | ✅ Done |
| 3.9 | Actor goals data-loss fix (`goal_items` → `goals` with three-input shape) | ✅ Done |
| 3.10 | Archive-aware resume + read-only enforcement on archived scenarios | ✅ Done |

These are documented in the chat log and commit history. No build-order
changes needed; future sessions don't depend on them in any way that
isn't already encoded in the spec or `response-shapes.md`.

---

# Session 1 — Scaffold + Landing + Step Skeleton

**Status: ✅ Done — committed as part of `feat: AuthoringPage scaffolding (Sessions 1–3.8)` (`897a8e9`).**

## Preconditions

- `warpaths-frontend` repo on main, clean working tree
- LoginPage and ExtractionPage working, tests passing
- `docs/pages/AuthoringPage.md` in the repo
- You can log in as `tom@strategyconnections.com` and see `/extract`

## Deliverables

1. Route wiring for `/author`, `/author/new`, `/author/:scenario_id`,
   all behind `ProtectedRoute`
2. `AuthoringPage.jsx` page shell — PageShell, no sidebar, max-width 900px
3. Scope-based redirect: non-admin non-staff → `/leaderboard`
4. Landing State rendered at `/author` with three starting-point tiles
   (Extraction, Blank, Clone-disabled)
5. `ExtractionPickerDrawer` as a pure UI shell — opens, closes, shows a
   hardcoded list of three fake rows; clicking a row logs to console and
   does nothing else
6. `ClientPickerDrawer` (staff only) — same, hardcoded fake list
7. StepIndicator rendered at `/author/new` and `/author/:scenario_id`
   with all 11 steps labeled, current step tracked in React state
8. One section component per step (`Step1Framing.jsx`, `Step2Actors.jsx`,
   … `Step11Review.jsx`) each returning a placeholder block
9. `StepFooter` component — Back / Save & next / Edit freely buttons
10. Tabbed editor mode — when `mode === 'tabs'`, render tab row instead
    of StepIndicator
11. No API calls except `GET /v1/scenarios/:id` via TanStack Query.

## Out of scope (defer)

- Any form fields inside any step (placeholders only)
- Any POST/PATCH calls
- Extraction pre-fill logic, framework picker, publish/submit/approve
- Validation / readiness checklist logic

## Files touched

```
src/App.jsx
src/pages/AuthoringPage.jsx
src/pages/authoring/StartingPointTiles.jsx
src/pages/authoring/ExtractionPickerDrawer.jsx
src/pages/authoring/ClientPickerDrawer.jsx
src/pages/authoring/StepFooter.jsx
src/pages/authoring/steps/Step1Framing.jsx … Step11Review.jsx
src/api/scenario.js
```

---

# Session 2 — Step 1 Scenario CRUD + Create from Blank/Extraction

**Status: ✅ Done — committed in `897a8e9`.**

## Deliverables (summary)

1. Real extraction picker with `GET /v1/clients/:client_id/extractions`
2. Blank scenario tile (deferred-POST flow per Session 3.7 update)
3. Extraction picker click creates Scenario + navigates
4. Step 1 real form with all fields per spec
5. Step 1 pre-fill from extraction
6. Step 1 PATCH with dirty subset
7. Loading/error states
8. `src/api/scenario.js` full surface

## Notable post-build changes

- Session 3.7 changed Blank tile to defer POST until first save, navigating to `/author/new` first.
- Session 3.6 changed extraction-row click to do resume-or-create via `GET /v1/scenarios?source_extraction_id=`.
- Session 3.10 added archived-status filter to `listScenarios`.

## Files touched (final state)

```
src/api/scenario.js
src/pages/authoring/ExtractionPickerDrawer.jsx
src/pages/authoring/steps/Step1Framing.jsx
src/pages/AuthoringPage.jsx
```

---

# Session 3 — Step 2 Actors + Implicit Publish

**Status: ✅ Done — committed in `897a8e9`. Goal data shape was incorrect at original build; fixed in Session 3.9 (`f3e9206`).**

## Deliverables (summary)

1. Actor list view on Step 2 with cards
2. ActorEditor in Drawer with all fields per spec
3. Actor save via PATCH on Scenario with full `actors[]` array
4. Actor pre-fill from `re.actor_suggestions[]`
5. MappingCallout sub-component
6. Advance gate: ≥3 actors
7. Implicit publish on Step 2 → Step 3 transition
8. Remove actor with confirmation Modal

## Notable post-build changes

- Session 3.5: `current_posture` is enum, not string (catalogue drift).
- Session 3.6: collapsible ActorCard with full read-only detail inline.
- Session 3.9: actor goals real shape is `goals: [{label, description, priority}]`, not `goal_items: [{goal, priority}]`. Three-input row UI. Silent data loss fix.

## Files touched (final state)

```
src/pages/authoring/steps/Step2Actors.jsx
src/pages/authoring/ActorEditor.jsx
src/pages/authoring/ActorCard.jsx
src/pages/authoring/MappingCallout.jsx
src/api/scenario.js (publishScenario)
src/pages/AuthoringPage.jsx (auto-publish hook)
```

---

# Session 4 — Step 3 Config + Framework Picker

**Status: ✅ Done — committed at `3027a5a`. Audit-driven revision applied with 13 edits across 3 sub-prompts before build.**

## Deliverables (final, post-revision)

1. Step 3 config creation form per `03_scenario_config.md`:
   - `name`, `description`, `game_type`, `turn_count`,
     `max_exchanges_per_turn` for ClientAdmin
   - `minimum_runs_for_insight`, `requires_validation` for staff
2. Config fetch via `GET /v1/scenarios/:id/configs` on mount with
   `{items: [...]}` envelope (verified probe 2026-04-26)
3. Config create via nested path
   `POST /v1/scenarios/:scenario_id/configs` (flat path returns 404,
   verified)
4. Config update via `PATCH /v1/scenario-configs/:id` with diff
5. Framework picker with auto-selected platform Realism default
   - `GET /v1/analytical-frameworks` returns `{items: [...]}` envelope
     (verified 2026-04-25); server auto-scopes by caller
6. FrameworkPickerDrawer with three conditional groupings (only
   render if items match), `+ Create framework` disabled with
   "Coming soon" chip
7. Framework-in-use warning: catalogue endpoint
   `GET /v1/scenario-configs?analytical_framework_id=` returns 404
   (probe C 2026-04-26); fallback to 409-on-PATCH-time
8. `src/api/scenarioConfig.js` and `src/api/framework.js` modules

## Audit-driven additions

- **Immutable post-create:** `game_type` and `turn_count` are NOT in
  `PatchScenarioConfigRequest` schema. UI renders them disabled with
  "Fixed at create" hint on return-visit. This is intentional API
  design.
- **Silent-drop awareness:** form sends only fields documented in
  OpenAPI's `CreateScenarioConfigRequest`; any others would be
  silently dropped.
- **Test data note:** dev DB contains exactly one framework named
  "Smoke Test Realism." Pre-demo rename to "Realism" recommended.

## Files touched (final state)

```
src/api/scenarioConfig.js (new)
src/api/framework.js (new)
src/pages/authoring/FrameworkPickerDrawer.jsx (new)
src/pages/authoring/steps/Step3ConfigSetup.jsx (full rewrite)
src/pages/AuthoringPage.jsx (Step 3 wiring + advance gate)
docs/api-surface.md, query-keys.md, response-shapes.md (registry updates)
```

---

# Session 5 — Sub-Object Steps 4, 5, 6, 7

**Status: ⚠️ Pending audit revision. Four short sub-sessions, one per step.**

**Audit revisions required for each sub-session before build runs.**
The originals are below; expected revisions are noted per sub-session.

Before starting each sub-session, the CC operator must:

1. Apply audit-aware diff pass to the session's prompt file (the
   meta-pattern documented at the top of this doc)
2. Read the per-object catalogue named in the session section
3. Run pre-build verification probes for any POST/PATCH bodies the
   session will construct

| Sub-session | Step | Catalogue to read first | Audit revision scope |
|---|---|---|---|
| 5a | Step 4 Tension | `docs/api/04_tension_indicator.md` | Standard (verify enum/required fields against OpenAPI) |
| 5b | Step 5 Dimensions | `docs/api/05_dimension_definition.md` | **Significant** — original prompt assumed "exactly 5 with weights summing to 1.0"; spec now corrected to "0+ DimensionDefinitions, no weight field on this object." Original prompt invalidated. |
| 5c | Step 6 Scoring | `docs/api/05b_evaluation_criteria.md` | Standard + add `meta.weight_sum` envelope handling per probe A4 |
| 5d | Step 7 Perspective | `docs/api/09_player_perspective.md` | Standard |

The spec at `docs/pages/AuthoringPage.md` has been updated for audit
findings. If catalogue and spec disagree, **OpenAPI wins** (per audit
process). If both disagree with live, run a probe.

## Session 5a — Step 4 Tension

**Audit revision needed:** verify enum values for any TensionIndicator
fields against OpenAPI before form code. Verify response shape after
first POST.

**Deliverables:**
- Step 4 form per `04_tension_indicator.md` field list
- Pre-fill from `re.tension_suggestion` when scenario has a
  `source_extraction_id`
- POST on first save, PATCH on re-edit
- Advance gate: TensionIndicator exists

**Acceptance:** Fill the fields, save, reload, values persist. Advancing without saving blocks.

**Files:** `src/pages/authoring/steps/Step4Tension.jsx`, addition to `src/api/scenarioChildren.js` (new file).

## Session 5b — Step 5 Dimensions

**Audit revision needed: SIGNIFICANT REWRITE.** Original prompt
assumed "exactly 5 DimensionDefinitions with weights summing to 1.0."

**Per audit + spec rewrite:**
- DimensionDefinition has NO `weight` field — that's on
  EvaluationCriteria (Step 6, Session 5c)
- Quantity is "0 or more," not "exactly 5"
- No weight-sum indicator UI in Step 5
- No advance gate (or trivial: any state is acceptable)

**Deliverables (post-revision):**
- Repeating row editor for 0+ DimensionDefinitions per
  `05_dimension_definition.md`
- Each row: `name`, `key` (lowercase_snake regex), `definition`
  (textarea), `starting_value` (per catalogue range),
  `display_order` (implicit from list position)
- "+ Add dimension" with no upper limit
- Each row has trash icon
- No weight UI

**Acceptance:** Add rows, save, reload, persist. Skip step entirely also works (advance with 0 dimensions).

**Files:** `src/pages/authoring/steps/Step5Dimensions.jsx`, addition to `src/api/scenarioChildren.js`.

## Session 5c — Step 6 Scoring

**Audit revision needed:** add `meta.weight_sum` response handling.

**Per audit:**
- `GET /v1/scenario-configs/:id/evaluation-criteria` returns
  non-standard envelope `{items: [...], meta: {weight_sum: number}}`
  (verified probe A4 2026-04-26)
- Frontend should read `weight_sum` from response, not compute
  client-side (until local edits make it stale, then recompute
  pre-save)

**Deliverables (post-revision):**
- Repeating row editor for 1–5 EvaluationCriteria per
  `05b_evaluation_criteria.md`
- Weight sum indicator at top, reads from response `meta.weight_sum`,
  red/teal-bright based on sum = 100
- `criteria_key` field with lowercase_snake regex
- Advance gate: 1–5 rows AND weight sum = 100

**Acceptance:** Add 3 criteria with weights 40/30/30, save, reload, all 3 persist and sum = 100. Weight 99 blocks advance.

**Important:** `criteria_key` values feed Step 9 (TurnQuestion's `evaluation_tags` references them). In Session 6, Step 9 will need to read this list — provide `getEvaluationCriteria(configId)` that Session 6 can import.

**Files:** `src/pages/authoring/steps/Step6Scoring.jsx`, addition to `src/api/scenarioChildren.js`.

## Session 5d — Step 7 Perspective

**Audit revision needed:** standard verify enums/required fields.

**Deliverables:**
- Step 7 form per `09_player_perspective.md` field list
- POST on first save, PATCH on re-edit
- Advance gate: PlayerPerspective exists

**Acceptance:** Fill fields, save, reload, persist. Advance works.

**Files:** `src/pages/authoring/steps/Step7Perspective.jsx`, addition to `src/api/scenarioChildren.js`.

## Prompt to CC (use at the start of each sub-session)

> Session 5{letter} per `docs/build-plans/AuthoringPage-BuildOrder.md`.
> BEFORE writing any code, read the per-object catalogue named in the
> session section. Apply audit-aware revisions per the section above
> if not already applied. If the catalogue fields differ from the
> spec's suggested fields, **OpenAPI wins**. Run pre-build verification
> probes for any new POST/PATCH bodies. Do not touch other steps.

---

# Session 6 — Steps 8 Advisors + 9 TurnQuestions

**Status: ⚠️ Pending audit revision.**

**Audit revisions required:**
- AI generation endpoint for TurnQuestions
  (`POST /v1/scenario-configs/:id/turn-questions/generate`) does NOT
  exist in OpenAPI. Removed from Phase 1 entirely. No "Generate draft"
  button — hand-authored only.
- Verify Advisor and TurnQuestion field shapes against live API before
  form code.

## Preconditions

- Session 5 complete (all sub-objects 4–7 working)
- `getEvaluationCriteria(configId)` available from 5c
- Audit-driven revision applied to this session's prompt file

## Deliverables

### Step 8 — Advisors
1. Advisor list view per spec, Drawer editor pattern (parity with Step 2 Actors)
2. Fields per `docs/api/08_advisor.md`
3. "At most one primary" enforcement (client-side)
4. Advance gate: ≥1 row AND exactly 1 primary
5. **No AI generation in Phase 1** — hand-authored only

### Step 9 — TurnQuestions
1. Collapsible section per turn number (1..`turn_count`)
2. Each section shows count chip and expand/collapse
3. Inside each section: list of TurnQuestion rows with `question_text`,
   `evaluation_tags[]` (multi-select chips from Step 6's criteria_keys),
   `question_order` (derive from array index on save)
4. Fields per `docs/api/06_turn_question.md`
5. **No "Generate draft" button in Phase 1** — generate endpoint doesn't
   exist in OpenAPI (verified audit)
6. Advance gate: every turn 1..turn_count has ≥1 question

## Out of scope

- Advisor AI generation (Phase 2)
- TurnQuestion AI generation (Phase 2 — endpoint pending API team)
- ContentSeed pool (Phase 2)

## Acceptance

- Add 2 advisors, mark one primary, save, reload, persist. Toggling primary on #2 flips #1 to false.
- Advance gate blocks until exactly one primary.
- Add 1+ TurnQuestion per turn 1..turn_count, advance works.
- `evaluation_tags` chip picker only shows the criteria_keys defined in Step 6.

## Files touched

```
src/pages/authoring/steps/Step8Advisors.jsx
src/pages/authoring/AdvisorEditor.jsx
src/pages/authoring/steps/Step9TurnQuestions.jsx
src/pages/authoring/QuestionRow.jsx
src/api/scenarioChildren.js (additions)
```

## Prompt to CC

> Session 6 per build order. Apply audit-aware revisions per this
> section if not already done. Both Advisors and TurnQuestions are
> hand-authored only in Phase 1 — generate endpoints don't exist
> per OpenAPI. Advisor `is_primary` is a client-side single-select.
> TurnQuestion `evaluation_tags` pull from Step 6's EvaluationCriteria
> criteria_keys — do not hardcode tag options.

---

# Session 7 — Step 10 Turn1Template

**Status: ⚠️ Pending audit revision (SIGNIFICANT REWRITE).**

**Audit revisions required:**
- `POST /v1/scenario-configs/:id/turn1-template/generate` does NOT
  exist in OpenAPI. Original prompt's "Generate draft" button is
  removed entirely.
- Direct create via `POST /v1/scenario-configs/:id/turn1-template`
  with `content_items` in the initial body (per probe C7 2026-04-24).
- `PatchTurn1TemplateRequest` does NOT accept `content_items` (per
  probe C8 — confirmed silent drop). Per architectural decision,
  API team will add it; until then, content_items are write-once on
  Create.
- `turn_questions` are NOT part of Turn1Template — they live on the
  config, referenced by `turn_number`.

## Preconditions

- Sessions 1–6 complete
- Read `docs/api/10b_turn1_template.md` first
- Audit-driven revision applied to this session's prompt file
- API team's PATCH update for `content_items` may or may not be
  shipped; check before build. If shipped, Phase 1 can edit
  content_items normally. If not, Phase 1 treats content_items as
  write-once.

## Deliverables (post-revision)

1. Step 10 layout with "Start blank" primary button at top (no
   "Generate draft" button)
2. "Start blank" → `POST /v1/scenario-configs/:id/turn1-template`
   with body `{}` (all fields optional). Then loads form for editing.
3. Form structure per `10b_turn1_template.md` and `CreateTurn1TemplateRequest`:
   - `dimension_snapshot` editor — one row per DimensionDefinition
     from Step 5 (or zero rows if Step 5 was skipped — supported)
   - `advisor_stubs[]` — one row per Advisor from Step 8
   - `content_items[]` — list of ContentItem rows. Type, title,
     body, optional source_seed_id, image_url, video_url. "+ Add"
     button. **Editable on Create only; disabled on return-visit
     until API ships PATCH support.**
4. Save on "Save & next":
   - First save: POST with full body
   - Subsequent: PATCH with diff (excluding content_items unless API
     supports it)
5. Advance gate: Turn1Template record exists (no field-level
   requirements per spec)

## Out of scope

- AI generation entirely (Phase 2 — endpoint doesn't exist)
- DimensionSnapshot logic beyond initial world_state values
- Anything about how Turn 2+ is generated

## Acceptance

- Start blank → empty template with advisor_stubs pre-seeded (one per advisor), empty content_items, dimension_snapshot rows for each DimensionDefinition (or empty if Step 5 was skipped)
- Add content items on first edit, save, reload, persist
- On return-visit: dimension_snapshot and advisor_stubs editable; content_items field shows disabled state with "Coming soon" chip ("Content items are write-once until the API supports PATCH")
- Advancing to Step 11 works once template exists

## Files touched

```
src/pages/authoring/steps/Step10Turn1Template.jsx
src/pages/authoring/DimensionSnapshotEditor.jsx
src/pages/authoring/ContentItemRow.jsx
src/pages/authoring/AdvisorStubRow.jsx
src/api/scenarioChildren.js (additions)
```

## Prompt to CC

> Session 7 per build order. **Apply audit-aware revisions per this
> section before build.** Direct POST creates with content_items in
> the body. PATCH does NOT accept content_items as of build time
> (verify probe before assuming). Render content_items as disabled
> on return-visit if PATCH still rejects them. AI generation is
> Phase 2 — no Generate button in Phase 1. Do not attempt to tune
> AI output.

---

# Session 8 — Step 11 Review + Tabbed Editor Mode

**Status: ⚠️ Pending audit revision (SIGNIFICANT REWRITE).**

**Audit revisions required:**
- Submit-for-review readiness gate does NOT enforce server-side
  (verified probe D4 2026-04-24 — empty config submit returned 200).
  The readiness checklist is **client-side UX validation only**.
- Original 10-row checklist contained the wrong DimensionDefinition
  rule. Per spec rewrite, real readiness list is:
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
- `DELETE /v1/scenarios/:id` returns 405 (not implemented). Replace
  with archive-only flow (per Session 3.10 work).
- Validated/retired config lock pattern: spec describes read-only
  enforcement; verify it's actually built (Session 3.10 found the
  archived banner was string-only without read-only enforcement —
  same risk applies here).

## Preconditions

- Sessions 1–7 complete; you have a config that could plausibly pass
  client-side readiness validation
- Audit-driven revision applied to this session's prompt file

## Deliverables

### Step 11 — Review + Publish

1. ReadinessChecklist component — one row per requirement (corrected
   list above)
2. Each row: CheckCircle2 teal-bright if met, XCircle red if not
3. Rows are clickable — click jumps to the relevant step
4. Compute readiness client-side by aggregating cached query data
5. **Important:** prominent warning that readiness is UX-only:
   `"This checklist is client-side guidance. The submit-for-review
   endpoint accepts empty configs. Real readiness gating happens at
   approve/publish (TBD)."` — or similar wording per spec
6. "Submit for review" primary button — disabled until all rows pass
   on the client-side check. POST → config transitions to
   `in_review`.
   - On 200 with empty/incomplete config: server has accepted but
     config is not actually game-ready. Frontend's checklist is the
     only safeguard.
7. When `config.status === 'in_review'`:
   - "Approve" primary (teal) →
     `POST /v1/scenario-configs/:id/approve`
   - "Reject / Return to draft" destructive ghost →
     `POST /v1/scenario-configs/:id/reject`
8. When `config.status === 'validated'`: post-validation success
   block (CheckCircle2, "Scenario ready for play", "Create a game"
   button → scaffold route)
9. Hidden in Phase 1: "Start ConfigValidation cycle" (staff-only,
   Phase 2)

### Tabbed Editor Mode

10. Implement tabbed editor per spec's "State 3" section
11. Metadata bar (§6) with inline-editable scenario title + config
    name + status badges
12. **No Trash icon for delete** (DELETE returns 405). Replace with
    Archive icon button (Lucide). Confirmation Modal with non-destructive
    wording: `"Archive scenario '{title}'? You can unarchive later."`
    Calls `POST /v1/scenarios/:id/archive`.
13. Top bar (§8): scenario status badge, "Back to steps" ghost
14. Tabs: Framing, Actors, Config, Tension, Dimensions, Scoring,
    Perspective, Advisors, Questions, Turn 1, Review. Staff-only
    Validation tab (placeholder Phase 2)
15. Default active tab: first tab with an unmet requirement, else Framing
16. Lock behavior:
    - Published Scenario + validated/active downstream config:
      `scenario_narrative` and `actors` fields LOCKED
    - Validated or retired config: all config-level tabs read-only
      with banner "This config is {status}. Clone to make changes."
      + disabled Clone button (Phase 2)
    - **Verify lock enforcement actually works** — same risk as
      Session 3.10 archived banner (was string-only without
      read-only enforcement underneath; ensure config-status locks
      have similar coverage)
17. Delete ScenarioConfig: disabled per Phase 1 (DELETE
    /v1/scenario-configs/:id planned-not-built) — show "Coming soon"

## Out of scope

- ConfigValidation cycle (Phase 2)
- Config clone (Phase 2 — endpoint pending)
- Config retire (Phase 2)
- ConfigValidation Validation tab content (placeholder only)

## Acceptance

- Full walk through `/author` → pick extraction → Steps 1–10 →
  Step 11: client-side readiness checklist computes correctly
- All 10 rows green → Submit for Review enabled → POST → config
  reaches `in_review`
- Approve → config reaches `validated`
- `/author/:id` for validated config: lands in tabbed editor mode,
  all tabs read-only with clone banner, Framing + Actors tabs show
  LOCKED chips, lock enforcement is actual (not just visual)
- `/author/:id` for archived scenario: read-only banner per Session
  3.10 work
- Archive a scenario: confirm → Modal → archive succeeds, redirect
  to `/author`
- Clicking a red checklist row at Step 11 jumps to that step

## Files touched

```
src/pages/authoring/steps/Step11Review.jsx
src/pages/authoring/ReadinessChecklist.jsx (new)
src/pages/AuthoringPage.jsx (mode switch logic, metadata bar)
src/pages/authoring/TabbedEditorLayout.jsx (new)
src/api/scenarioConfig.js (submit/approve/reject additions)
src/api/scenario.js (no delete; archive already wired Session 3.10)
```

## Prompt to CC

> Session 8 per build order. **Apply audit-aware revisions per this
> section before build — significant.** Readiness check is
> client-side ONLY; server doesn't enforce. Use updated requirements
> list per spec (no "exactly 5 dimensions"). DELETE returns 405 —
> use archive only. Verify config lock behavior actually enforces
> read-only, don't trust banner string presence (Session 3.10 lesson).

---

# Closeout — After Session 8

**Verify end-to-end:**
1. Log in as test account
2. `/author` → pick a real extraction → land on `/author/:id` Step 1
3. Walk through all 11 steps, saving at each — reach `validated` status
4. Hit `POST /v1/games` directly (curl) with `scenario_config_id` from Step 11 → confirm Game record creates cleanly
5. Reload `/author/:id` → tabbed editor renders with locks correctly applied
6. Archive a scenario path works for a config-less scenario

**Documentation updates:**
- Update `docs/query-keys.md` with all new query keys
- Update `docs/api-surface.md` with all new API functions
- Update `docs/pages/AuthoringPage.md` to `Status: BUILT`
- Add an entry to the frontend page index table in `Frontend_HANDOFF.md`
- Note in API_HANDOFF.md that GamePage work is unblocked

**Known deferrals to Phase 2** (do not start without explicit green light):
- Scenario clone tile on landing (needs clone endpoint built first)
- ContentSeed pool on Advisors step
- ConfigValidation cycle (staff Validation tab)
- Framework creation UI (staff)
- AI generation for Dimensions / Criteria / Perspective / Advisors / TurnQuestions / Turn1Template
- `inject_seeds[]` → ContentSeed pre-fill
- Category taxonomy enum
- Scenario list view at `/author`
- Auto-save pattern on text fields
- Permanent Delete UI (blocked on API DELETE implementation)
- Multi-client per-extraction Scenario UX (blocked on `authored_by_client_id`)
- Clone scenario/config to change immutable game_type or turn_count

---

## Session-to-Spec Mapping Cheatsheet

If something is unclear in a session, cross-reference these sections of `docs/pages/AuthoringPage.md`:

| Session | Spec sections |
|---|---|
| 1 | Purpose, Route Configuration, Layout, Flow Model, State 1 (shell only) |
| 2 | State 1 (wiring), State 2 Step 1, "Extraction pre-fill" rules in Constraints |
| 3 | State 2 Step 2, Step 0 implicit publish |
| 4 | State 2 Step 3, Framework picker notes, "Framework clone guard" |
| 5a–5d | State 2 Steps 4–7, referenced per-object catalogues |
| 6 | State 2 Steps 8–9 |
| 7 | State 2 Step 10, audit's Turn1Template content_items asymmetry note |
| 8 | State 2 Step 11, State 3 Tabbed Editor Mode, Archive/Delete semantics, Lock behavior, "API Behavior Notes" section |

---

## Audit Reference Quick Links

For Sessions 5a–8 audit-driven revisions, reference these:

- `~/dev/api-audit/deliverables/DRIFT-REPORT.md` — full audit findings
- `~/dev/api-audit/deliverables/CC-FRONTEND-FIX.md` — frontend fixes
  identified during audit (most already applied via mid-sessions)
- `~/dev/api-audit/deliverables/PROBE-RESULTS-BATCH1.md` — verified
  response shapes and silent-drop confirmations
- `~/dev/api-audit/deliverables/LIVE-PROBE-BATCH.md` — queued probes
  for unverified endpoints (use to inform Session 5–8 pre-build
  verification needs)
- `openapi.json` — live API request schema (authoritative)
- `BACKLOG.md` — running list of deferred items, including all
  audit-derived API and catalogue corrections

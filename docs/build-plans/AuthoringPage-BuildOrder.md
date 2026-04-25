# AuthoringPage — Build Order
## CC Session Plan

**Companion doc to:** `docs/pages/AuthoringPage.md`
**Strategy:** Walking skeleton first, then vertical slices per step group.
**Target:** A visible, navigable page after Session 1. Each subsequent
session leaves the page in a runnable state with one more step-group
fully wired.

---

## How to Use This Document

Hand one session at a time to Claude Code. Each session section below is
self-contained.

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

Do not skip sessions or combine them; the dependency order is intentional.

Each session section has:
- **Preconditions** — what must be true before starting
- **Deliverables** — what the session ships
- **Out of scope** — what to explicitly defer
- **Acceptance** — what "done" looks like before closing the session
- **Files touched** — the expected file list
- **Prompt to CC** — short paragraph; full-context version in
  `docs/cc-prompts/`

---

## Session Map

| # | Session | Lands on page | Runtime state |
|---|---|---|---|
| 1 | Scaffold + landing + step skeleton | Everything rendered; nothing saves | Navigable dead UI |
| 2 | Scenario CRUD (Step 1) | Create + edit Scenario | Scenario saves; actors don't yet |
| 3 | Actors (Step 2) | Full actor editor | Can publish a Scenario |
| 4 | Config + framework picker (Step 3) | ScenarioConfig created | Config exists, children don't |
| 5 | Sub-object sessions (Steps 4–7, one per step) | 4 sessions, one step each | Playable-in-parts config |
| 6 | Advisors + TurnQuestions (Steps 8–9) | Collections with generate-draft wired | Ready for Turn 1 |
| 7 | Turn1Template (Step 10) | Full template editor + AI generate | Submit-for-review passes |
| 8 | Review + approve + tabbed mode (Step 11 + editor) | End-to-end to validated config | Unblocks GamePage |

Sessions 5a–5d are separate chunks inside Session 5 — four short CC runs,
one per sub-object. Can be done in one sitting or spread out.

**After Session 4, you have a config that can reach `draft`.
After Session 8, you have a config that can reach `validated` — GamePage
work can start in parallel from that point.**

---

# Session 1 — Scaffold + Landing + Step Skeleton

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
   … `Step11Review.jsx`) each returning a placeholder block:
   `<div>Step {N} — {title} — placeholder</div>` in a Card
9. `StepFooter` component — Back / Save & next / Edit freely buttons
   wired to advance/retreat step state. "Save & next" logs to console
   and advances. "Edit freely" toggles local `mode` state.
10. Tabbed editor mode — when `mode === 'tabs'`, render tab row instead
    of StepIndicator; clicking a tab switches active step
11. No API calls except the one that loads a Scenario at
    `/author/:scenario_id`: `GET /v1/scenarios/:id` via TanStack Query.
    On 404, render "Scenario not found" with back link.

## Out of scope (defer)

- Any form fields inside any step (placeholders only)
- Any POST/PATCH calls
- Extraction pre-fill logic
- Real extraction picker data (use hardcoded fakes)
- Framework picker
- Publish / submit / approve
- Validation / readiness checklist logic
- Scope-gated staff fields beyond the Validation tab being hidden for
  ClientAdmin

## Acceptance

Run locally, log in as `tom@strategyconnections.com`, and verify:
- `/author` shows landing with three tiles
- Click "Start blank" → nothing happens yet (console log fine). This
  will be wired in Session 2.
- Click "Browse extractions" → drawer opens with fake rows; close works
- Directly navigate to `/author/new` → see StepIndicator, Step 1
  placeholder, footer. Back disabled on Step 1. Save & next advances
  to Step 2. Can walk to Step 11 and back.
- Click "Edit freely" on footer → tabs appear, can click any tab
- Directly navigate to `/author/some-fake-uuid` → shows "Scenario not
  found" error state (404 from API)
- Log out → `/author` redirects to `/login?redirect=/author`

## Files touched

```
src/App.jsx                                    # route additions
src/pages/AuthoringPage.jsx                    # new
src/pages/authoring/StartingPointTiles.jsx     # new
src/pages/authoring/ExtractionPickerDrawer.jsx # new — fake data
src/pages/authoring/ClientPickerDrawer.jsx     # new — fake data
src/pages/authoring/StepFooter.jsx             # new
src/pages/authoring/steps/Step1Framing.jsx     # new — placeholder
src/pages/authoring/steps/Step2Actors.jsx      # new — placeholder
… through Step11Review.jsx                     # new — placeholder each
src/api/scenario.js                            # new — getScenario only
```

No changes to `src/components/ui/`. If anything feels like it wants to
be added there, stop and check whether an existing component already
covers it.

## Prompt to CC

> Read `docs/pages/AuthoringPage.md` end-to-end before writing any code.
> Then build Session 1 per `docs/build-plans/AuthoringPage-BuildOrder.md`
> Session 1 section. Ship a walking skeleton only — no form fields, no
> save logic, no real API calls except `GET /v1/scenarios/:id`. Follow
> the acceptance checklist exactly. Do not add anything to
> `src/components/ui/` — use the existing library. Stop at the acceptance
> list; do not pull in Session 2 work.

---

# Session 2 — Step 1 Scenario CRUD + Create from Blank/Extraction

## Preconditions

- Session 1 merged and acceptance verified
- You can navigate the walking skeleton end-to-end

## Deliverables

1. Real extraction picker — `GET /v1/clients/:client_id/extractions`
   wired via TanStack Query, list renders real extractions, search box
   filters client-side by title/publisher
2. "Start blank" tile fully wired:
   - `POST /v1/scenarios` with `{ source_extraction_id: null, title:
     "Untitled scenario" }`
   - On 201: cache-seed `['scenario', id]`, navigate
     `/author/:scenario_id` with `replace: true`
3. Extraction picker click fully wired:
   - `GET /v1/report-extractions/:id` to fetch full extraction
   - `POST /v1/scenarios` with `source_extraction_id` + pre-filled
     Scenario fields from `re.scenario_suggestion`
   - On 201: cache-seed, navigate, close drawer
4. Step 1 real form — all fields from the spec's "Step 1 — Scenario
   framing" section rendered with real Input/Textarea/Select components,
   wired to form state via React controlled inputs
5. Step 1 pre-fill: when a Scenario loaded via `GET` has
   `source_extraction_id`, fetch the extraction once and surface its
   field values as the initial form state. Do NOT re-seed on every
   render — one-shot on initial load only.
6. Step 1 save: "Save & next" calls `PATCH /v1/scenarios/:id` with the
   dirty subset. On success, invalidate `['scenario', id]` and advance.
   On 422, show field-level errors inline.
7. Loading/error states — Skeleton while fetching Scenario; error state
   if fetch fails
8. `src/api/scenario.js` — full surface: `createScenario`, `getScenario`,
   `updateScenario`, `publishScenario`, `archiveScenario`,
   `deleteScenario`. Only the first three are called this session.

## Out of scope (defer)

- Actors (Step 2)
- Publish (Step 0 implicit) — deferred to Session 3 when actors are ready
- Extraction picker for staff (client picker pre-step) — defer; staff
  lands on `/author` and just sees their own org if they have one, or
  we fake a client_id for now. Flag as TODO in code.
- Step 2+ form fields

## Acceptance

- `/author` → "Start blank" → new Scenario created → lands on
  `/author/:id` at Step 1 with title "Untitled scenario"
- Editing title and pressing "Save & next" → PATCH succeeds, form shows
  saved timestamp, Step 2 placeholder shows
- Back button returns to Step 1 with edited values intact
- `/author` → "Browse extractions" → real list loads → click a
  complete extraction → new Scenario created with title, narrative,
  category, subcategory, setting, time_horizon pre-filled
- Refresh the page at `/author/:id` → Step 1 values re-load from API
- Form validation: empty required field at save → inline error, does
  not advance
- Navigate to `/author/:id` for a scenario from a different org →
  403/404 handled with error state

## Files touched

```
src/api/scenario.js                            # full CRUD
src/pages/authoring/ExtractionPickerDrawer.jsx # real data + wire-up
src/pages/authoring/steps/Step1Framing.jsx     # real form
src/pages/AuthoringPage.jsx                    # create-and-redirect wiring
```

## Prompt to CC

> Session 2 per `docs/build-plans/AuthoringPage-BuildOrder.md`. Extraction
> picker must use real API data via TanStack Query, not fakes. Step 1
> saves via PATCH with the dirty subset only — don't send untouched
> fields. Extraction pre-fill is one-shot on initial load, not on every
> render. Do not build Step 2 or any publish logic — those are Session 3.

---

# Session 3 — Step 2 Actors + Implicit Publish

## Preconditions

- Session 2 merged; can create and edit a Scenario end-to-end
- Test scenario with at least a title exists in your client's data

## Deliverables

1. Actor list view on Step 2 — cards per actor, count chip `{n}/3
   minimum`, "+ Add actor" button
2. `ActorEditor` component in a 640px Drawer with all fields per spec:
   name, role, goal_items[] (repeating rows with priority select),
   behavior, history, constraints (with "AI-only" hint), current_posture,
   is_visible_to_player Toggle, relationships_overview
3. Actor save: PATCH scenario with full `actors[]` array (Scenario
   replaces actors in full per API contract). Optimistic cache update.
4. Actor pre-fill on Scenario creation from extraction: map
   `re.actor_suggestions[]` to Scenario actor shape per the spec's
   mapping table. Pre-fill is part of the initial `POST /v1/scenarios`
   body, not a separate call.
5. `MappingCallout` sub-component: at the top of the actor editor when
   the actor was seeded from an extraction suggestion that had
   `capabilities_overview`, show it as a read-only reference block
   labeled "FROM EXTRACTION · capabilities overview". Author copies
   what's relevant into `behavior` or `current_posture` manually.
6. Advance gate: "Save & next" on Step 2 disabled (tooltip `"Add at
   least 3 actors"`) until `actors.length >= 3`.
7. Implicit publish on Step 2 → Step 3 transition: when advancing,
   check Scenario has title + narrative + category + subcategory + ≥3
   actors. If yes and `status === 'draft'`, silently call
   `POST /v1/scenarios/:id/publish`. On 422, stay on Step 2 and show
   the server's field-level errors inline with a scroll-to-first-error.
   On success, render "● Scenario published" 11px mono teal-bright
   line under StepIndicator.
8. Remove actor: Trash2 icon on actor card → confirm Modal → PATCH
   with filtered array

## Out of scope (defer)

- Step 3 config creation (next session)
- Lock behavior for published scenarios (defer to Session 8 when
  tabbed mode is fully wired)

## Acceptance

- Can add 3+ actors via drawer, including goal_items with priorities
- Actor list shows correct count chip, turns teal-bright at 3
- Saving an actor PATCHes the full actors array and re-renders the list
- Removing an actor works via the trash icon
- Advancing from Step 2 with <3 actors is blocked with tooltip
- Advancing with ≥3 actors + other Step 1 fields set → scenario
  auto-publishes silently; "Scenario published" line appears under
  StepIndicator
- Advancing with ≥3 actors but missing e.g. narrative → stays on Step 2
  (auto-publish 422s), inline error surfaces on the narrative field,
  page scrolls to it
- Creating a new Scenario from an extraction pre-fills actors with
  the mapped fields; goal_items come from objectives[] with priority 2
- Actors from extraction seeded with `capabilities_overview` show the
  MappingCallout at the top of their editor

## Files touched

```
src/pages/authoring/steps/Step2Actors.jsx      # full form
src/pages/authoring/ActorEditor.jsx            # new
src/pages/authoring/ActorCard.jsx              # new
src/pages/authoring/MappingCallout.jsx         # new
src/api/scenario.js                            # publishScenario call
src/pages/AuthoringPage.jsx                    # auto-publish hook on Step 3 entry
```

## Prompt to CC

> Session 3 per `docs/build-plans/AuthoringPage-BuildOrder.md`. Actors
> PATCH sends the full array every time — the API replaces in full,
> not a diff. Implicit publish fires silently on transition from Step 2
> to Step 3 when all Step 1+2 fields are complete. Do not add a manual
> "Publish" button — the transition is the trigger. Do not touch Step 3
> content.

---

# Session 4 — Step 3 Config + Framework Picker

## Preconditions

- Sessions 1–3 merged; scenarios can be created, edited, actors added,
  auto-publish working

## Deliverables

1. Step 3 config creation form — all fields per spec: name, description,
   game_type select, turn_count (3–10), max_exchanges_per_turn,
   minimum_runs_for_insight (staff-only hidden for ClientAdmin),
   requires_validation toggle (staff-only)
2. Config fetch: `GET /v1/scenarios/:id/configs` on Step 3 mount. If
   one exists in `draft` status, load into the form. If multiple exist
   (shouldn't happen in Phase 1 but possible), pick the newest draft.
   If none exist, show the creation form as blank.
3. Config create: on first "Save & next" from Step 3,
   `POST /v1/scenarios/:scenario_id/configs` (nested path — NOT the
   flat `/v1/scenario-configs`). Cache-seed `['config', configId]`,
   invalidate `['configs', scenarioId]`.
4. Config update: subsequent "Save & next" calls
   `PATCH /v1/scenario-configs/:id` with dirty subset
5. Framework picker:
   - `GET /v1/analytical-frameworks` on Step 3 mount
   - Default: platform-level Realism framework (client_id null, tier
     realism, lowest created_at). Display `"Using: Realism (platform
     default)"` read-only by default.
   - "Change framework" ghost button → FrameworkPickerDrawer (480px)
   - Drawer: grouped list (Platform / client-specific), each row shows
     name + tier pill + truncated description
   - Selecting a framework updates local state; sent on next PATCH
   - Staff-only: "+ Create framework" button at bottom of Drawer —
     render disabled with "Coming soon" chip for Phase 1
6. Framework-in-use warning: if the selected framework is assigned to
   any ScenarioConfig with status in ['validated', 'active'], show an
   amber inline warning in Step 3 body: "This framework is in use on
   validated configs. Edits to tenets will silently change live AI
   behavior. Clone before editing." + "Clone framework" button
   (`POST /v1/analytical-frameworks/:id/clone`). Staff-only action.
   - If `GET /scenario-configs?analytical_framework_id=` is not built,
     skip the proactive warning and handle the 409 at PATCH time
     instead — surface as inline error.
7. `src/api/scenarioConfig.js` and `src/api/framework.js` modules

## Out of scope (defer)

- Steps 4–11 (sub-objects)
- Framework creation (staff-only, Phase 2)
- Content seeds (Phase 2)

## Acceptance

- Land on Step 3 for a freshly published scenario → see blank config
  creation form with Realism framework selected by default
- Fill name and save → config created, PATCH path used for subsequent
  edits, no duplicate configs created
- Change framework to a non-default platform framework → PATCH sends
  analytical_framework_id → reload shows new selection persists
- Staff: "+ Create framework" button visible but disabled; ClientAdmin:
  button hidden entirely
- Selecting a framework in use on a validated config → warning appears;
  "Clone framework" button clones and reassigns to the clone
- Advance gate: cannot advance from Step 3 until config has name and
  framework assigned

## Files touched

```
src/pages/authoring/steps/Step3ConfigSetup.jsx  # full form + picker
src/pages/authoring/FrameworkPickerDrawer.jsx   # new
src/api/scenarioConfig.js                       # new
src/api/framework.js                            # new
```

## Prompt to CC

> Session 4 per `docs/build-plans/AuthoringPage-BuildOrder.md`. Create
> config via the nested path `POST /v1/scenarios/:scenario_id/configs`
> — the flat `/v1/scenario-configs` path is marked planned-not-built.
> Framework picker defaults to platform Realism. Do not build
> framework creation UI; do not touch Steps 4+.

---

# Session 5 — Sub-Object Steps 4, 5, 6, 7

**This is four short sub-sessions, one per step. Each is ~1–2 hours of
CC time. Can be done in a single sitting or across separate sittings.**

Before starting each sub-session, the CC operator must read the
corresponding per-object catalogue to lock down field shapes:

| Sub-session | Step | Catalogue to read first |
|---|---|---|
| 5a | Step 4 Tension | `docs/api/04_tension_indicator.md` |
| 5b | Step 5 Dimensions | `docs/api/05_dimension_definition.md` |
| 5c | Step 6 Scoring | `docs/api/05b_evaluation_criteria.md` |
| 5d | Step 7 Perspective | `docs/api/09_player_perspective.md` |

The spec at `docs/pages/AuthoringPage.md` describes the UI shape for each;
the catalogue provides the exact field names and enums. If catalogue and
spec disagree, catalogue wins — and flag the discrepancy back to the spec
author (me, the WarPaths author).

## Session 5a — Step 4 Tension

**Deliverables:**
- Step 4 form per `04_tension_indicator.md` field list
- Pre-fill from `re.tension_suggestion` when config has a
  `source_extraction_id` (or scenario has one — inspect the catalogue
  to see which object owns source_extraction_id for this mapping)
- POST on first save (creates TensionIndicator), PATCH on re-edit
- Advance gate: TensionIndicator exists

**Acceptance:** Fill the fields, save, reload, values persist. Advancing
without saving blocks.

**Files:** `src/pages/authoring/steps/Step4Tension.jsx`, addition to
`src/api/scenarioChildren.js` (new file).

## Session 5b — Step 5 Dimensions

**Deliverables:**
- Repeating row editor for 5 DimensionDefinitions per
  `05_dimension_definition.md`
- Weight sum indicator at top, red/teal-bright based on tolerance
- Key field with lowercase_snake regex validation (inline error if
  violated)
- Advance gate: exactly 5 rows AND weight sum = 1.0 ± 0.001

**Acceptance:** Add 5 rows, assign weights summing to 1.0, save, reload,
all 5 persist. Weight 0.99 blocks advance with clear message.

**Files:** `src/pages/authoring/steps/Step5Dimensions.jsx`, addition to
`src/api/scenarioChildren.js`.

## Session 5c — Step 6 Scoring

**Deliverables:**
- Repeating row editor for 1–5 EvaluationCriteria per
  `05b_evaluation_criteria.md`
- Weight sum indicator at top, red/teal-bright based on sum = 100
  (integer, not 1.0)
- `criteria_key` field with lowercase_snake regex
- Advance gate: 1–5 rows AND weight sum = 100

**Acceptance:** Add 3 criteria with weights 40/30/30, save, reload, all
3 persist and sum = 100. Weight 99 blocks advance.

**Important:** `criteria_key` values feed Step 9 (TurnQuestion's
`evaluation_tags` references them). In Session 6, Step 9 will need to
read this list — so keep the API surface clean: provide
`getEvaluationCriteria(configId)` that Session 6 can import.

**Files:** `src/pages/authoring/steps/Step6Scoring.jsx`, addition to
`src/api/scenarioChildren.js`.

## Session 5d — Step 7 Perspective

**Deliverables:**
- Step 7 form per `09_player_perspective.md` field list
- POST on first save, PATCH on re-edit
- Advance gate: PlayerPerspective exists

**Acceptance:** Fill fields, save, reload, persist. Advance works.

**Files:** `src/pages/authoring/steps/Step7Perspective.jsx`, addition to
`src/api/scenarioChildren.js`.

## Prompt to CC (use at the start of each sub-session)

> Session 5{letter} per `docs/build-plans/AuthoringPage-BuildOrder.md`.
> BEFORE writing any code, read the per-object catalogue named in the
> session section. If the catalogue fields differ from the spec's
> suggested fields, catalogue wins — flag discrepancies in a comment at
> the top of the new step file. Do not touch other steps.

---

# Session 6 — Steps 8 Advisors + 9 TurnQuestions

## Preconditions

- Session 5 complete (all sub-objects 4–7 working)
- `getEvaluationCriteria(configId)` available from 5c

## Deliverables

### Step 8 — Advisors
1. Advisor list view per spec, rows with inline fields OR Drawer editor
   (CC's call, but be consistent with Step 2 Actors pattern for
   familiarity — use Drawer for parity)
2. Fields per `docs/api/08_advisor.md`
3. "At most one primary" enforcement: toggling `is_primary: true` on
   one row marks all others false — do this client-side before sending
   the PATCH
4. Advance gate: ≥1 row AND exactly 1 primary
5. No AI generation for Advisors in Phase 1 — hand-authored only

### Step 9 — TurnQuestions
1. Collapsible section per turn number (1..`turn_count`)
2. Each section shows count chip and expand/collapse
3. Inside each section: list of TurnQuestion rows with `question_text`,
   `evaluation_tags[]` (multi-select chips from Step 6's criteria_keys),
   `question_order` (derive from array index on save)
4. Fields per `docs/api/06_turn_question.md`
5. "Generate draft" button at top — calls
   `POST /v1/scenario-configs/:id/turn-questions/generate` with
   ProgressBar. Confirm endpoint is live first via `docs/curls.md`;
   if stubbed/501, disable the button with "AI generation coming soon"
   chip.
6. On successful generate: invalidate `['turn-questions', configId]`,
   Toast `"Generated {n} questions — review and edit."`
7. Advance gate: every turn 1..turn_count has ≥1 question

## Out of scope

- Advisor AI generation
- ContentSeed pool (Phase 2)

## Acceptance

- Add 2 advisors, mark one primary, save, reload, persist. Toggling
  primary on #2 flips #1 to false.
- Advance gate blocks until exactly one primary.
- Generate TurnQuestions button (if live): ProgressBar, then list
  populates, author can edit each row.
- Advance gate on Step 9 blocks if any turn has 0 questions.
- `evaluation_tags` chip picker only shows the criteria_keys defined in
  Step 6 — not arbitrary values.

## Files touched

```
src/pages/authoring/steps/Step8Advisors.jsx
src/pages/authoring/AdvisorEditor.jsx           # if using Drawer pattern
src/pages/authoring/steps/Step9TurnQuestions.jsx
src/pages/authoring/QuestionRow.jsx
src/api/scenarioChildren.js                     # additions
```

## Prompt to CC

> Session 6 per build order. Before wiring the generate endpoint, confirm
> it's live in `docs/curls.md` — if stubbed, render the button disabled
> with an explanatory chip. Advisor is_primary is a client-side
> single-select: when the user toggles one on, toggle all others off
> before PATCHing. TurnQuestion evaluation_tags pull from Step 6's
> EvaluationCriteria criteria_keys — do not hardcode tag options.

---

# Session 7 — Step 10 Turn1Template

## Preconditions

- Sessions 1–6 complete
- Read `docs/api/10b_turn1_template.md` first — schema is complex and
  spec defers detail to build time

## Deliverables

1. Step 10 layout with "Generate draft" primary button and "Start blank"
   ghost button at top
2. "Generate draft" →
   `POST /v1/scenario-configs/:id/turn1-template/generate`. Confirm
   live via curls.md. Render ProgressBar with label "Generating Turn 1
   template — this takes 30–60 seconds."
3. On generate success: load the returned template into an editable
   form below the buttons
4. "Start blank" → POST an empty Turn1Template record, load into form
5. Form structure per `10b_turn1_template.md`:
   - `world_state` editor — one row per DimensionDefinition (pulled
     from Step 5), each row lets the author set the initial value for
     that dimension
   - `content_items[]` — list of ContentItem rows. Each has type
     (intel report / media / scenario update — enum from catalogue),
     headline, body, and other fields per catalogue. "+ Add content
     item" button.
   - `advisor_inputs[]` — one row per Advisor from Step 8 (auto-created
     placeholders on template load — one input per advisor); each row
     lets author write the initial advisor message
   - Turn 1 TurnQuestions — displayed read-only, noting that Step 9's
     Turn 1 questions are automatically included. No edit UI here.
6. Save on "Save & next": PATCH the Turn1Template with all fields
7. Advance gate: Turn1Template record exists (no field-level
   requirements per `03_scenario_config.md`)

## Out of scope

- AI prompt quality concerns — treat generated output as a starting
  draft that the author will edit heavily
- DimensionSnapshot logic beyond the initial world_state values
- Anything about how Turn 2+ is generated

## Acceptance

- Generate draft on a config with 5 dimensions, 2 advisors, Turn 1
  questions defined → template loads with world_state rows for all 5
  dimensions, 2 advisor input placeholders, and content_items[]
  populated from the AI
- Start blank → empty template with advisor input placeholders still
  pre-seeded (one per advisor), empty content_items, default
  world_state values (or empty — check catalogue)
- Edit fields, save, reload, persist
- Advancing to Step 11 works once template exists

## Files touched

```
src/pages/authoring/steps/Step10Turn1Template.jsx
src/pages/authoring/WorldStateEditor.jsx
src/pages/authoring/ContentItemRow.jsx
src/pages/authoring/AdvisorInputRow.jsx
src/api/scenarioChildren.js                     # additions
```

## Prompt to CC

> Session 7 per build order. READ `docs/api/10b_turn1_template.md`
> THOROUGHLY before writing any code — its schema determines the UI
> shape and the spec defers to it. Generate button must show
> ProgressBar for the full duration; 30–60s is expected. Do not attempt
> to tune prompts or evaluate AI output quality — that's Step 7
> platform work, not this page.

---

# Session 8 — Step 11 Review + Tabbed Editor Mode

## Preconditions

- Sessions 1–7 complete; you have a config that could plausibly pass
  submit-for-review

## Deliverables

### Step 11 — Review + Publish

1. ReadinessChecklist component — one row per submit-for-review
   requirement from `03_scenario_config.md`:
   - Scenario is `published`
   - ≥3 actors
   - `analytical_framework_id` assigned
   - TensionIndicator exists
   - Exactly 5 DimensionDefinitions with weights summing to 1.0
   - EvaluationCriteria with weights summing to 100
   - ≥1 TurnQuestion per turn number
   - ≥1 Advisor with `is_primary: true`
   - PlayerPerspective exists
   - Turn1Template exists
2. Each row: CheckCircle2 teal-bright if met, XCircle red if not
3. Rows are clickable — click jumps to the relevant step
4. Compute readiness client-side by aggregating the cached query data.
   Do not call submit-for-review to probe — just inspect cache.
5. "Submit for review" primary button — disabled until all rows pass.
   POST → config transitions to `in_review`. On 422 (server disagrees
   with client readiness check): show field-level errors as Toast plus
   inline per-step errors, scroll to first failing row.
6. When `config.status === 'in_review'`:
   - "Approve" primary (teal) button →
     `POST /v1/scenario-configs/:id/approve`
   - "Reject / Return to draft" destructive ghost button →
     `POST /v1/scenario-configs/:id/reject`
7. When `config.status === 'validated'`: render post-validation success
   block:
   - CheckCircle2 40px teal-bright
   - "Scenario ready for play"
   - "Players can now create games against this config."
   - "Create a game" primary → scaffold route (e.g.
     `/org/games/new?scenario_config_id=:id`) — route may 404 for now,
     that's fine
   - "Clone config for a new lens" disabled with "Coming soon" chip
8. Hidden in Phase 1: "Start ConfigValidation cycle" (staff-only,
   Phase 2)

### Tabbed Editor Mode

9. Implement the tabbed editor completely per the spec's "State 3 —
   Tabbed Editor Mode" section. All 11 step components already exist —
   this session wires them into tab bodies.
10. Metadata bar (§6) with inline-editable scenario title + config name
    + scenario status Badge + config status Badge + Trash2 delete icon
11. Top bar (§8): scenario status badge, "Back to steps" ghost if
    stepped mode is available
12. Tabs: Framing, Actors, Config, Tension, Dimensions, Scoring,
    Perspective, Advisors, Questions, Turn 1, Review. Staff-only tab:
    Validation (Phase 1: placeholder "Phase 2" block)
13. Default active tab on entering tabbed mode: first tab with an
    unmet requirement, else Framing
14. Lock behavior:
    - Published Scenario + validated/active downstream config:
      `scenario_narrative` and `actors` fields rendered disabled with
      "LOCKED" chip
    - Validated or retired config: all config-level tabs rendered
      read-only with banner at top: "This config is {status}. Clone to
      make changes." + disabled "Clone config" button
15. Delete Scenario: Trash2 opens Modal with wording per spec; confirm
    → `DELETE /v1/scenarios/:id` → on 409 (configs exist), Modal swaps
    to show archive option; archive → `POST /v1/scenarios/:id/archive`
16. Delete ScenarioConfig: disabled per Phase 1 (endpoint planned-not-
    built) — Trash2 on config surface shows "Coming soon" tooltip

## Out of scope

- ConfigValidation cycle (Phase 2)
- Config clone (Phase 2)
- Config retire (Phase 2)

## Acceptance

- Full walk through from `/author` → pick extraction → Steps 1–10 →
  Step 11: readiness checklist shows all 10 rows green → Submit for
  Review → Approve → config reaches `validated` status
- `/author/:id` for a validated config: lands in tabbed editor mode,
  all tabs read-only with clone banner, Framing + Actors tabs show
  their LOCKED chips
- `/author/:id` for a draft config with an incomplete actor set: lands
  in stepped mode at Step 2 (first unmet requirement)
- "Edit freely" on footer → switches to tabs; "Back to steps" on tab
  top bar → switches back
- Delete a scenario with no configs: confirm → 204 → redirect to
  `/author`
- Delete a scenario with configs: confirm → 409 handled → Modal
  suggests archive → archive succeeds
- Clicking a red checklist row at Step 11 jumps to that step

## Files touched

```
src/pages/authoring/steps/Step11Review.jsx     # full readiness + submit
src/pages/authoring/ReadinessChecklist.jsx     # new
src/pages/AuthoringPage.jsx                    # mode switch logic, metadata bar
src/pages/authoring/TabbedEditorLayout.jsx     # new
src/api/scenarioConfig.js                      # submit/approve/reject additions
src/api/scenario.js                            # delete + archive wiring
```

## Prompt to CC

> Session 8 per build order. This is the last core session — after this,
> the full Phase 1 flow end-to-end works and GamePage work can start.
> Readiness check computes from cache, not from calling submit-for-review.
> 422 from submit-for-review is treated as a cache-truth mismatch: show
> the server errors and let the user jump to the failing step. Lock
> behavior is critical — test with a scenario that has a validated
> config to confirm narrative and actors render as LOCKED. Do not build
> ConfigValidation, clone, or retire — those are Phase 2.

---

# Closeout — After Session 8

**Verify end-to-end:**
1. Log in as test account
2. `/author` → pick a real extraction → land on `/author/:id` Step 1
3. Walk through all 11 steps, saving at each — reach `validated` status
4. Hit `POST /v1/games` directly (curl) with `scenario_config_id` from
   Step 11 → confirm Game record creates cleanly
5. Reload `/author/:id` → tabbed editor renders with locks correctly
   applied
6. Delete scenario path works for a config-less scenario

**Documentation updates:**
- Update `docs/query-keys.md` with all new query keys
- Update `docs/api-surface.md` with all new API functions
- Update `docs/pages/AuthoringPage.md` to `Status: BUILT`
- Add an entry to the frontend page index table in `Frontend_HANDOFF.md`
- Note in API_HANDOFF.md that GamePage work is unblocked

**Known deferrals to Phase 2** (do not start on these without explicit
green light):
- Scenario clone tile on landing (needs clone endpoint built first)
- ContentSeed pool on Advisors step
- ConfigValidation cycle (staff Validation tab)
- Framework creation UI (staff)
- AI generation for Dimensions / Criteria / Perspective / Advisors
- `inject_seeds[]` → ContentSeed pre-fill
- Category taxonomy enum
- Scenario list view at `/author`
- Auto-save pattern on text fields

---

## Session-to-Spec Mapping Cheatsheet

If something is unclear in a session, cross-reference these sections
of `docs/pages/AuthoringPage.md`:

| Session | Spec sections |
|---|---|
| 1 | Purpose, Route Configuration, Layout, Flow Model, State 1 (shell only) |
| 2 | State 1 (wiring), State 2 Step 1, "Extraction pre-fill" rules in Constraints |
| 3 | State 2 Step 2, Step 0 implicit publish |
| 4 | State 2 Step 3, Framework picker notes, "Framework clone guard" |
| 5a–5d | State 2 Steps 4–7, referenced per-object catalogues |
| 6 | State 2 Steps 8–9 |
| 7 | State 2 Step 10, "AI generation prompt quality" in Constraints |
| 8 | State 2 Step 11, State 3 Tabbed Editor Mode, Delete semantics, Lock behavior |

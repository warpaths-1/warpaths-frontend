# CC Prompt — Session 5b: Step 5 Dimensions
## Audit-revised 2026-04-29; wrapper-integrated 2026-04-29

This is a full replacement of `docs/cc-prompts/SESSION-05b-dimensions.md`.
Phase 1 meta-review classified the prior draft as "significant
rewrite" — every field name was wrong, three required fields were
missing, two endpoint paths were wrong, and the entire UX scaffolding
(count chip, weight-sum, exact-5 gate) belonged to a different
resource (EvaluationCriteria, Session 5c). This file replaces it.

---

## Pre-flight (required before any work)

Run all steps in `~/dev/warpaths-frontend/docs/cc-prompts/_session-wrapper.md`
under "PRE-FLIGHT SEQUENCE" before reading the rest of this prompt.
If any pre-flight check fails, STOP and report.

### Pre-flight 3 customization (prerequisites for this session)

This session depends on Session 5a having landed. Specifically
verify:

```
test -f src/api/scenarioChildren.js && echo "FOUND: scenarioChildren.js" || echo "MISSING"
test -f src/pages/authoring/steps/Step4Tension.jsx && echo "FOUND: Step4Tension.jsx" || echo "MISSING"
git log main --oneline | grep -i "tensionindicator"
git log main --oneline | grep -iE "step 4|step4|tension"
```

Expected: `scenarioChildren.js` and `Step4Tension.jsx` both present;
at least one commit message references TensionIndicator or Step 4.
The recovery commit is `d2ea1f8` on main, dated 2026-04-29.

If any prerequisite is missing, STOP. The recovery work that
landed 5a may have been lost or reverted; investigate before
attempting 5b.

### Pre-flight 4 customization (planned file changes)

This session will create or modify:
- `src/api/scenarioChildren.js` — extend with Dimensions section (5
  new exported functions)
- `src/pages/authoring/steps/Step5Dimensions.jsx` — full replacement
  of placeholder
- `src/pages/AuthoringPage.jsx` — Step 5 wiring (advance gate, step
  registration)
- `docs/api-surface.md` — add Dimensions section
- `docs/query-keys.md` — add `['dimensions', configId]`
- `docs/response-shapes.md` — add list envelope and single-record
  shapes after first POST
- `BACKLOG.md` (at `/c/Users/tomna/Dev/BACKLOG.md`) — entries for
  deferred reorder UI, deferred extraction pre-fill, deferred
  staff-only verification

Any other modified files in close-out are unexpected and must be
flagged.

---

## Context

Working directory: `~/dev/warpaths-frontend`.

**Operating rules:**
1. `~/dev/CLAUDE.md`
2. `~/dev/warpaths-frontend/CLAUDE.md`
3. `~/dev/warpaths-api/CLAUDE.md`

**Design system:**
4. `~/dev/warpaths-frontend/docs/design-tokens.md`
5. `~/dev/warpaths-frontend/docs/components.md`
6. `~/dev/warpaths-frontend/docs/page-design-patterns.md`

**Page spec:**
7. `~/dev/warpaths-frontend/docs/pages/AuthoringPage.md`
   — "State 2 Step 5 — Dimensions" section

**Build plan:**
8. `~/dev/warpaths-frontend/docs/build-plans/AuthoringPage-BuildOrder.md`
   — Session 5b section + the "CRITICAL — Audit-driven prompt
   revision required" section at the top

**API contract — authority order is OpenAPI > live probe > catalogue > spec:**
9. `~/dev/warpaths-api/openapi.json` (live; fetch fresh) — request
   schemas are authoritative, response schemas mostly aren't declared
10. `~/dev/warpaths-api/docs/api/05_dimension_definition.md` — hint
    for field semantics; verify shape against OpenAPI
11. `~/dev/warpaths-api/docs/curls.md` — secondary path reference

**ReportExtraction shape — for pre-fill:**
12. `~/dev/warpaths-api/docs/api/19_report_extraction.md` AND
    `~/dev/warpaths-api/schemas/v2/report_extraction_schema.yaml`

**Audit references:**
13. `~/dev/api-audit/deliverables/DRIFT-REPORT.md` — §6 covers
    DimensionDefinition, §3c covers the weight-on-EvaluationCriteria
    boundary
14. `~/dev/api-audit/deliverables/PROBE-RESULTS-BATCH1.md`
15. `~/dev/api-audit/deliverables/LIVE-PROBE-BATCH.md`

**Frontend registries:**
16. `~/dev/warpaths-frontend/docs/api-surface.md`
17. `~/dev/warpaths-frontend/docs/response-shapes.md`
18. `~/dev/warpaths-frontend/docs/query-keys.md`

**Reference for shape and discipline:**
19. `~/dev/warpaths-frontend/docs/cc-prompts/SESSION-05a-tension.md`
    — the structural template. Same PV phase, same authority
    hierarchy, same silent-drop guard, same response-shape stamping,
    same test data hygiene. Copy the pattern, not the field list.

## Authority hierarchy — non-negotiable

1. **Live API behavior** (probe results)
2. **OpenAPI** (`openapi.json`) — request schemas are authoritative
3. **Catalogue** (`docs/api/05_dimension_definition.md`) — hint, may drift
4. **Page spec** (`AuthoringPage.md`) — UX intent, not API truth

When sources disagree: probe. Never resolve by picking the
"more recent-looking" doc. The pre-audit draft asserted "catalogue
wins"; that was wrong.

## Product decisions — locked, do not relitigate

These were resolved during Phase 1 review and follow-up chat. Build
to these answers; if PV finds an API constraint that contradicts
one, flag it and stop.

| Decision | Answer |
|---|---|
| `framework` UX | Per-config dropdown at top of Step 5; same value sent on every row's POST |
| `framework` change after dimensions exist | Soft lock with "Change framework" override button + confirmation modal; on confirm, sequentially PATCH every existing row's framework field |
| `framework` vs Step 3's `analytical_framework_id` | Distinct concepts — analytical framework (methodology) is a UUID set in Step 3; dimension framework is a 4-value enum tag set in Step 5. Treat as independent. |
| `update_guidance` visibility | Staff-only — hidden from ClientAdmin in Step 5 form |
| `display_order` | Implicit from list array order. POST in array order. NO reorder UI in v1 (deferred to a future 5b.5 mini-session) |
| `initial_value` control | Labeled Select — "1 — Failing", "2 — Critical", "3 — Contested", "4 — Manageable", "5 — Stable" |
| Pre-fill scope from extraction | Per PV-3 already resolved by spec: `re.dimension_suggestions` does not exist. Skip pre-fill deliverable entirely. Add BACKLOG entry. |
| Advance gate at 0 dimensions | Silent advance — no warning, no friction. Platform supports 0-dimension configs |
| Per-row editing | Auto-commit on blur; PATCH dirty subset only |
| `dimension_key` constraint relative to `framework` | NONE. Framework is a categorical label, not a constraint engine. Author can name dimensions whatever fits the config |
| Lifecycle locking (publish/retire) | Handled by the API (DELETE/PATCH blocked on validated configs per catalogue line 79). Frontend does NOT implement this — surfaces as 422 errors which the existing error handler catches |
| Response shape stamping | Defer to first POST during build (per Session 5b PV-4 deferral; no existing dimensions to probe) |
| `framework`-required UX gate | Add button disabled until framework is selected; show hint "Select a framework first" |

## Pre-build verification — DO THIS BEFORE WRITING CODE

This is in addition to the wrapper's pre-flight. Pre-flight is
about repo state; PV is about API contract truth.

Phase 1 PV already produced findings (the meta-review report).
Re-verify the load-bearing items below as PV-1 because the API
may have changed and live verification is cheap.

### Step PV-1: Re-verify OpenAPI request schemas (live)

Fetch `https://warpaths-api.onrender.com/openapi.json` fresh.
Render starter plan sleeps; first request may 503 — retry with
backoff (e.g., 5s, 15s, 30s).

Confirm against the meta-review's findings (which were correct
as of 2026-04-29):

- `CreateDimensionDefinitionRequest`:
  - Required: `framework`, `dimension_key`, `display_name`,
    `definition_prose`, `initial_value`, `display_order`
  - Optional/nullable: `update_guidance`
  - `framework` enum: `["pmesii", "pmesii_pt", "pestel", "custom"]`
  - `initial_value`: integer, min 1, max 5
- `PatchDimensionDefinitionRequest`:
  - All seven fields nullable, none required (subset PATCH)
  - Same `framework` enum, same `initial_value` range
- Endpoint paths:
  - GET list: `/v1/scenario-configs/{config_id}/dimension-definitions`
  - POST: `/v1/scenario-configs/{config_id}/dimension-definitions`
  - GET single: `/v1/dimension-definitions/{definition_id}` (FLAT)
  - PATCH: `/v1/dimension-definitions/{definition_id}` (FLAT)
  - DELETE: `/v1/dimension-definitions/{definition_id}` (FLAT)

If any of these have drifted from the meta-review findings, STOP
and report. Phase 2 build assumes these exact shapes; deviations
require human review before code changes.

If OpenAPI fetch returns 503 after 3 retries, fall back to:
- `~/dev/warpaths-api/openapi.json` if present locally
- The DRIFT-REPORT §6 findings (audit-confirmed)
- Note clearly which source was used.

### Step PV-2: Existing DimensionDefinition probe

Try GET on a few configs in the test account. If any have existing
dimensions, capture:
- The list-envelope shape (expected `{items: [...]}` per house
  pattern, but DRIFT §6d flagged unverified)
- The single-record response shape

If none exist, defer response-shape stamping to first POST during
build. Note in the PV report.

Note: PV-3 (extraction pre-fill probe) is skipped per Phase 1
finding that `dimension_suggestions` doesn't exist on
ReportExtraction.

### PV report format

After PV-1 and PV-2, post a single message containing:
- OpenAPI schema confirmations (or drift report if anything has
  changed)
- Existing dimension response shape (or "deferred — no records
  exist yet")
- Final field list and endpoint path table for the build phase
- Any blockers

Wait for "go" before writing code.

## Scope (post-PV)

Build Step 5's Dimensions list editor. Many records per
ScenarioConfig (zero or more). No pre-fill (per locked decisions).

## Deliverables

**1. Extend `src/api/scenarioChildren.js` — add Dimensions section:**

Per the module convention from Session 5a, this file is the home
for all per-config sub-object API functions. Add a Dimensions
section with five functions:

- `listDimensions(configId)` — GET nested
- `createDimension(configId, body)` — POST nested
- `getDimension(dimensionId)` — GET flat
- `updateDimension(dimensionId, body)` — PATCH flat
- `deleteDimension(dimensionId)` — DELETE flat

Note the path asymmetry: list/create are nested under config,
get/update/delete operate on the flat resource path. Match the
OpenAPI shape exactly. Do NOT invent a `bulkCreateDimensions` —
OpenAPI has no such endpoint.

**2. Step 5 form — `Step5Dimensions.jsx` full replacement:**

Layout (top to bottom):
- **Framework dropdown** — single Select at the top, bound to a
  config-level state. Options: per OpenAPI's framework enum
  (verified in PV-1). Required: must be set before Add button is
  enabled. When framework is empty, show hint text "Select a
  framework first" near the disabled Add button.
- **Dimensions list** — array of DimensionRow components, one per
  existing or being-created dimension
- **Add dimension button** — disabled until framework selected;
  appends a new blank row at the bottom when clicked
- **Soft lock for framework changes when dimensions exist:**
  When framework is changed AND dimensions exist:
  - Show confirmation modal: "Change framework from {old} to
    {new}? This will recategorize {N} existing dimensions."
  - On confirm: sequentially PATCH each existing dimension's
    `framework` field to the new value. Show per-row pending
    state during the loop.
  - On cancel: revert dropdown to previous value.

DimensionRow inline editor:
- `display_name` — Input, required
- `dimension_key` — Input, required. Auto-suggest lower_snake_case
  derived from display_name on first edit; allow override.
  Display-only validation: regex check for `/^[a-z][a-z0-9_]*$/`
  with inline hint if it fails. Send to server even if client-side
  regex doesn't match (server is authoritative).
- `definition_prose` — Textarea (3 rows), required
- `initial_value` — Labeled Select with options:
  - "1 — Failing"
  - "2 — Critical"
  - "3 — Contested"
  - "4 — Manageable"
  - "5 — Stable"
  Required.
- `update_guidance` — Textarea (3 rows), staff-only. Hide from
  ClientAdmin entirely. Same role-gating pattern as Session 2.5's
  `tier_minimum`. Optional/nullable.
- `framework` — NOT a per-row control. Read from config-level state
  and included in POST/PATCH bodies invisibly.
- `display_order` — NOT a per-row control. Computed from array
  index on POST.
- Trash icon (Trash2 from lucide-react) — DELETE the row. Inline
  confirmation, not a modal.

Per-row save discipline:
- Auto-commit on blur (UX pattern survived the rewrite)
- New rows: first blur with required fields filled → POST →
  cache-seed
- Existing rows: blur after edit → PATCH dirty subset → invalidate
- "Saved" indicator (small check + fade) on successful save
- If required fields aren't filled, blur does NOT POST; row stays
  in unsaved-draft state with visual indicator
- **Required-field indicators:** mark required inputs with a
  visible asterisk or "Required" label so the author knows what's
  needed before save (this addresses the gap noted at Session 5a
  close)

**3. Silent-drop guard:**

POST/PATCH bodies must contain ONLY fields present in the OpenAPI
request schema. Specifically: do NOT send `weight` (does not exist
on DimensionDefinition; that's EvaluationCriteria territory).

**4. Pre-fill from extraction — SKIP:**

Per Phase 1 PV-3, ReportExtraction does not produce dimension
suggestions. Skip this deliverable entirely. Add a BACKLOG entry:

> Step 5 dimension pre-fill from extraction — deferred. Per
> 19_report_extraction.md and v2 schema, ReportExtraction does
> not produce dimension suggestions (DimensionDefinition is
> always author-written). Re-evaluate only if/when a future
> extraction prompt adds a dimension_suggestions field.

**5. Advance gate:**

Silent advance. No required minimum. Save & next is always enabled.
Do NOT ship a count chip, weight indicator, or any "exactly N"
gating UI.

**6. Response shape stamping:**

After the first successful POST AND the first successful list GET,
capture response body shapes and add to
`~/dev/warpaths-frontend/docs/response-shapes.md` with
`Last probed: <today's date>` stamps. Stamp the list envelope
specifically (was unverified per DRIFT §6d).

**7. Registry doc updates:**

- `docs/api-surface.md` — add the five new functions in a
  Dimensions section
- `docs/query-keys.md` — add `['dimensions', configId]`
- `docs/response-shapes.md` — see deliverable 6

## Out of scope

- Everything outside Step 5
- Reorder UI (deferred to 5b.5)
- EvaluationCriteria, weights, weight-sum indicator (Session 5c)
- Bulk POST endpoint (does not exist; loop in form layer)
- Pre-fill from extraction (skip per locked decision)
- Step 4 required-field indicators retrofit (separate follow-up
  session)

## Test data hygiene

Per CHAT-HANDOFF.md and the Session 5a pattern:
- Track every record ID created during PV and during build
- "0 or more dimensions" means many test records will accumulate;
  more than 5a
- DELETE on flat path appears to work for unvalidated configs;
  do NOT auto-delete during the session
- Report all created IDs at session close

## Acceptance checklist

- [ ] Pre-flight passed and reported (per wrapper)
- [ ] PV-1 + PV-2 reported, "go" received
- [ ] Step 5 renders with framework dropdown disabled-Add state for
      a config with no existing dimensions
- [ ] Selecting framework enables Add button
- [ ] Add row → fill required fields → blur → POST 201 → response
      shape stamped → row shows "Saved"
- [ ] Required-field indicators visible on each per-row Input/Select
- [ ] Edit a field on existing row → blur → PATCH fires with dirty
      subset only (verified via Network tab)
- [ ] Trash icon → DELETE → row removed from UI and cache
- [ ] Change framework when dimensions exist → confirmation modal →
      confirm → all rows PATCH sequentially → all rows show "Saved"
- [ ] Cancel framework change → dropdown reverts, no PATCHes fire
- [ ] Save & next is always enabled (silent advance)
- [ ] No `weight` field anywhere in form, body, or UI
- [ ] No count chip, no weight-sum line, no "exactly N" gate
- [ ] update_guidance hidden for ClientAdmin role; visible for staff
      (if no staff test account exists, flag and defer; note in
      BACKLOG)
- [ ] Body sends ONLY OpenAPI-documented fields (silent-drop guard)
- [ ] List envelope shape stamped in response-shapes.md
- [ ] `npm run build` succeeds
- [ ] All registry docs updated
- [ ] All created IDs reported at session close
- [ ] Close-out passed (per wrapper) — commit on main verified

---

## Close-out (required final steps)

Run all steps in `~/dev/warpaths-frontend/docs/cc-prompts/_session-wrapper.md`
under "CLOSE-OUT SEQUENCE" as the final session activity. Do not
declare the session complete until close-out passes.

The session is on `claude/<name>` if the desktop app spawned a
worktree, so close-out 5 (merge to main) applies. The merge
verification in close-out 6 is the load-bearing step — confirm
the commit appears on main's history before reporting completion.

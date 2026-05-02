# AuthoringPage — Feature Plan

**Location:** `warpaths-frontend/docs/plans/AUTHORING-PAGE.md`
**Status:** In progress — Steps 1–5 complete, Step 6 next
**Last updated:** May 2026

This is the single source of truth for AuthoringPage. It supersedes the
April 2026 chat-era handoff doc and `docs/build-plans/AuthoringPage-BuildOrder.md`.
When a CC plan-mode session starts work on AuthoringPage, this is the doc to read first.

---

## 1. Purpose

AuthoringPage is the staff/ClientAdmin tool for building a complete `ScenarioConfig`
from end to end. A ScenarioConfig is the full, playable definition of a wargame,
derived from an underlying `Scenario` (which is itself created from a `ReportExtraction`).

**End state:** an author can walk an extracted PDF analysis through 11 numbered
steps that define every aspect of a game, then submit it for approval. Once approved,
the config becomes "validated" and unblocks GamePage.

---

## 2. Architecture

- One `<StepN<Name>>.jsx` component per step in `src/pages/authoring/steps/`
- All per-config sub-object API calls live in `src/api/scenarioChildren.js`
  (Tension, Dimensions, EvaluationCriteria, PlayerPerspective, Advisors,
  TurnQuestions, Turn1Template). Per-Scenario calls live in `src/api/scenario.js`.
- TanStack Query for caching; query keys `['<resource>', configId]` for per-config
  sub-objects. Documented in `docs/query-keys.md`.
- API surface registry in `docs/api-surface.md`. Verified response shapes (with
  `Last probed:` stamps) in `docs/response-shapes.md`.
- CSS modules are conditional, not mandatory — only created when styling needs
  exceed shared components and tokens.

---

## 3. The 11 steps

| # | Step | Cardinality | Status |
|---|---|---|---|
| 1 | Framing (Scenario base info) | 1 per scenario | ✅ Done |
| 2 | Actors | ≥3 per scenario | ✅ Done |
| 3 | Config setup + Framework Picker | 1 per config | ✅ Done |
| 4 | TensionIndicator | 1 per config | ✅ Done (`d2ea1f8`) |
| 5 | DimensionDefinitions | 0+ per config | ✅ Done (`6db57ce`) |
| 6 | EvaluationCriteria (Scoring) | weights sum to 100 | ⏭️ Next |
| 7 | PlayerPerspective | 1 per config | Pending |
| 8 | Advisors | n per config | Pending |
| 9 | TurnQuestions | n per config | Pending |
| 10 | Turn1Template | 1 per config (most complex) | Pending |
| 11 | Review + submit-for-approval | gating step | Pending |

---

## 4. Test account

```
email:     tom@strategyconnections.com
password:  Warpaths2026
client_id: ad412b27-deca-425b-be66-86e4638fe6e9
scope:     client_admin
```

---

## 5. Step 6 — EvaluationCriteria (next session)

### Known facts (verified)

- **List envelope is non-standard:** `{items: [...], meta: {weight_sum: number}}`.
  Cache reads must handle this shape.
- **Required fields:** `criteria_key`, `display_name`, `description`,
  `weight` (1–100 integer)
- **Weights sum to 100, NOT 1.0.** This is the field that was wrongly
  attributed to Dimensions in the pre-audit Step 5 draft.
- **Defaults exist** in catalogue `05b_evaluation_criteria.md` lines 11–16:
  Problem Framing, Decision Quality, Outcome Effectiveness, Stakeholder
  Engagement, Strategic Communication.
- **Cross-resource boundary:** `EvaluationCriteria.criteria_key` is referenced
  by `TurnQuestion.evaluation_tags` (catalogue `06_turn_question.md` line 26).
  Renaming a criteria_key after TurnQuestions exist will orphan tag references.

### Open product UX questions

These need decisions before or during the planning conversation with CC:

- Visibility: are criteria shown collapsed or expanded by default?
- Gating: is "Save & next" enabled when weights don't yet sum to 100, or blocked?
- Weight indicator: where does the `meta.weight_sum` indicator render? At the
  top of the section, or inline under each row?
- Defaults: pre-populate the 5 catalogue defaults on first render, or start empty?
- Edit immutability of `criteria_key` after TurnQuestions exist (parallel to
  Step 5's Turn1Template-aware lock for `dimension_key`)?

### How to start the session

1. Open CC at `~/dev/warpaths-frontend` on `main`. Confirm `git status` clean
   and `git log main --oneline -3` shows `6db57ce` at top.
2. Enter plan mode. Reference this doc and `docs/decisions.md` (frontend) at
   the top of your prompt.
3. Ask CC to plan Step 6 — give it the "Known facts" list above and the
   "Open product UX questions" list. Have it propose answers and surface the
   ones that need your call.
4. Review the plan, iterate, approve, then let CC execute.

---

## 6. Step 7+ outline

These are sketched, not planned in detail. Each gets its own plan-mode session
with full planning when its turn comes.

- **Step 7 — PlayerPerspective:** single record per config, similar shape to
  TensionIndicator (Step 4). One screen, one save.
- **Step 8 + 9 — Advisors + TurnQuestions:** bundle into one session. Both are
  list resources scoped to the config. TurnQuestion uses
  `evaluation_tags` referencing `EvaluationCriteria.criteria_key` — Step 6 must
  be solid before this lands.
- **Step 10 — Turn1Template:** most complex sub-object. Catalogue
  `10b_turn1_template.md` is the spec. Will likely need its own design
  conversation before a plan-mode session. Mutations on this resource MUST
  invalidate `['turn1-template', configId]` so Step 5's silent dimension_key
  derivation lock activates correctly.
- **Step 11 — Review + tabbed editor mode:** assembles all prior sub-objects
  into a review screen and provides a tabbed re-edit mode. Gating step — submit
  blocked until required minima met.

---

## 7. Known bugs (queued, not blocking)

### Bug A — API DELETE on dimension-definitions returns 204 but doesn't delete

**Severity:** HIGH (data integrity)
**Where:** `DELETE /v1/dimension-definitions/{id}`
**Effect:** Three corrupted test rows remain on config `b34acac5-...`.
Frontend cannot rely on DELETE for cleanup until fixed.
**Owner:** API team. BACKLOG entry: `[API] (HIGH) DELETE on dimension-definitions returns 204 but doesn't delete`.

### Bug B — Inconsistent server-side validation on DimensionDefinition PATCH

**Severity:** MEDIUM (frontend is sole enforcement for two fields)
**Where:** `PATCH /v1/dimension-definitions/{id}`
**Effect:** Empty `display_name` and `definition_prose` accepted; empty
`dimension_key` returns 422. Frontend `isRowComplete` PATCH gate (Session 5b)
closes this from the frontend side, but a third party could still PATCH empties.
**Owner:** API team. BACKLOG entry: `[API] Inconsistent server-side validation of required fields on DimensionDefinition PATCH`.

### Bug C — Vite HMR breaks Chrome extension pixel screenshots

**Severity:** LOW (workaround exists)
**Effect:** `document_idle` never fires while HMR websocket is open.
**Workaround:** Use DOM/text inspection via `javascript_tool` for smoke testing
instead of pixel screenshots.
**Owner:** Infra. BACKLOG entry: `[INFRA] Chrome integration in dev environments with active HMR cannot capture pixel screenshots`.

---

## 8. Test data state

- Three corrupted DimensionDefinition rows on config `b34acac5-...` from
  Bug 4 of Session 5b. Inert; cleanup blocked by Bug A.
- Two pre-existing clean test rows on configs `f069dab1-...` and
  `9a41328e-...` (both Military, framework `pmesii`, dated April 11 2026).
  Predate this work. Not bugs.

---

## 9. Cross-cutting facts that apply to every step

These are pulled from the chat-era handoff. They apply to all remaining steps,
not just Step 6.

- **Authority hierarchy:** OpenAPI > live probe > catalogue > page spec.
  When sources disagree, probe.
- **Silent-drop is on:** Pydantic `extra="ignore"` is the default. Wrong
  field names return 201/200 with no error and data is dropped. POST/PATCH
  bodies must contain ONLY fields present in the OpenAPI request schema.
- **PATCH schemas may differ from POST schemas.** Verify both in OpenAPI
  before assuming a field is patchable.
- **Endpoint path conventions vary.** Some resources are nested-only, some
  are nested-create + flat-edit. DimensionDefinition: GET list and POST
  nested under `/v1/scenario-configs/{config_id}/dimension-definitions`;
  GET single, PATCH, DELETE flat at `/v1/dimension-definitions/{id}`. Don't
  assume nested everywhere.
- **Response shapes mostly undeclared in OpenAPI.** Probe and stamp in
  `docs/response-shapes.md` before destructuring.

---

## 10. Conventions established and durable

These conventions emerged from Sessions 1–5 and should keep working in
remaining steps. They are also captured in `docs/decisions.md`.

- Auto-commit on blur with dirty-subset PATCH (only changed fields)
- New rows POST on first complete blur
- Silent advance: "Save & next" enabled by default; gating only at Step 11
- Required-field red asterisks, inlined per component (no shared component)
- Saving-state dim: opacity 0.55 + disabled inputs + corner "Saving…" text + hidden trash button
- Error → idle status transitions automatically when fields resolve (no spurious PATCH)
- One section per resource in `scenarioChildren.js`
- CSS module per component is optional, not mandatory

---

## 11. What was retired in the May 2026 plan-mode transition

For historical context only.

- The session-wrapper-as-prompt-prefix pattern (`docs/cc-prompts/_session-wrapper.md`)
  was retired. Plan mode replaces pre-flight and close-out narration with native
  planning + execution.
- The audit-driven prompt revision two-pass pattern was retired. Plan mode reads
  the codebase during planning, so the meta-review-then-revised-prompt loop
  collapses into a single plan-review-execute cycle.
- The `docs/cc-prompts/SESSION-*.md` drafts for Steps 6–11 were not kept.
  Their useful content (the cross-resource constraints and product UX questions)
  was lifted into Section 5 above and into the Step 7+ outlines.
- The April 2026 handoff doc (`AUTHORING-PAGE-HANDOFF.md`) was archived. Its
  durable content was distilled into this file and `docs/decisions.md`.

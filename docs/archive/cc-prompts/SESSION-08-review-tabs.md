# CC Prompt — Session 8: Step 11 Review + Tabbed Editor Mode

**This is the final Phase 1 session. Completing this session unblocks
GamePage work — a validated ScenarioConfig will be creatable
end-to-end.**

## Context — read before writing code

Working directory: `~/dev/warpaths-frontend`.

**Operating rules:**
1. `~/dev/CLAUDE.md`
2. `~/dev/warpaths-frontend/CLAUDE.md`
3. `~/dev/warpaths-api/CLAUDE.md`

**Design system:**
4. `~/dev/warpaths-frontend/docs/design-tokens.md`
5. `~/dev/warpaths-frontend/docs/components.md`
6. `~/dev/warpaths-frontend/docs/page-design-patterns.md`

**Page spec — read all of it, not just step 11:**
7. `~/dev/warpaths-frontend/docs/pages/AuthoringPage.md`
   — Step 11, State 3 Tabbed Editor Mode, Delete semantics, Lock
   behavior in tabbed mode, Constraints (lifecycle locks subsection)

**Build plan:**
8. `~/dev/warpaths-frontend/docs/build-plans/AuthoringPage-BuildOrder.md`
   — Session 8 section AND the "Closeout" section at the end

**API contracts — read these for the endpoints you'll call:**
9. `~/dev/warpaths-api/docs/api/03_scenario_config.md` —
   submit-for-review requirements list, approve, reject, lifecycle
   states and lock rules
10. `~/dev/warpaths-api/docs/api/02_scenario.md` — narrative + actors
    lock rules, archive, delete
11. `~/dev/warpaths-api/docs/api/10_config_validation.md` — read for
    awareness; the staff ConfigValidation tab is Phase 2 so you just
    render a placeholder
12. `~/dev/warpaths-api/docs/curls.md` — confirm submit/approve/
    reject paths

**Frontend registries:**
13. `~/dev/warpaths-frontend/docs/api-surface.md`
14. `~/dev/warpaths-frontend/docs/response-shapes.md`
15. `~/dev/warpaths-frontend/docs/query-keys.md`

**All upstream work:**
- Sessions 1–7 must be complete and passing acceptance
- All step components (`Step1Framing` through `Step10Turn1Template`)
  must be working end-to-end

## Scope for this session

Two big deliverables:

1. **Step 11 Review** — readiness checklist + submit-for-review +
   approve/reject → validated config
2. **Tabbed editor mode** — fully functional (Session 1's skeleton
   expanded with real behavior, lock rules, delete/archive)

After this session: a Scenario can be created, fully authored,
submitted, approved, and reach `validated` status. `POST /v1/games`
will accept the resulting `scenario_config_id`.

## Deliverables

### Step 11 Review

**1. `src/pages/authoring/ReadinessChecklist.jsx`:**

Computes readiness from cached query data — does NOT call
submit-for-review to probe. The 10 rows (per
`03_scenario_config.md`):

| # | Requirement | Data source |
|---|---|---|
| 1 | Scenario is `published` | `['scenario', id]` — `status === 'published'` |
| 2 | ≥3 actors | `['scenario', id]` — `actors.length >= 3` |
| 3 | `analytical_framework_id` assigned | `['config', configId]` — `analytical_framework_id` truthy |
| 4 | TensionIndicator exists | `['tension', configId]` — record present |
| 5 | Exactly 5 DimensionDefinitions, weights sum 1.0 | `['dimensions', configId]` — length 5, sum within 0.001 of 1.0 |
| 6 | EvaluationCriteria weights sum 100 | `['criteria', configId]` — 1–5 rows, sum exactly 100 |
| 7 | ≥1 TurnQuestion per turn number | `['turn-questions', configId]` + `['config', configId].turn_count` |
| 8 | ≥1 Advisor with `is_primary: true` | `['advisors', configId]` — at least one primary |
| 9 | PlayerPerspective exists | `['perspective', configId]` — record present |
| 10 | Turn1Template exists | `['turn1-template', configId]` — record present |

Row rendering:
- Lucide `CheckCircle2` 16px teal-bright if met; `XCircle` 16px
  red if not
- Row text: human-readable description
- Clickable — click routes to the relevant step via the page's step
  router; scroll to top of step body

**2. Step 11 action buttons:**

Primary row (based on current config status):

When `status === 'draft'`:
- Primary: `"Submit for review"` — disabled until all 10 checklist
  rows pass
- Calls `submitConfigForReview(configId)` (from Session 4's api)
- On 200: invalidate `['config', configId]`, render approve/reject
  buttons
- On 422: Toast `"Some requirements aren't met yet."`, surface
  server field-level errors as inline errors on the checklist rows
  they correspond to, scroll to first failing row

When `status === 'in_review'`:
- Primary: `"Approve"` (teal variant or primary with teal
  background — confirm Button variants available) →
  `approveConfig(configId)`
  - On 200: config → `validated`, page re-renders to post-validation
    success block
- Secondary (destructive ghost): `"Reject / Return to draft"` →
  `rejectConfig(configId)`
  - Opens Modal with `rejection_reason` Textarea (required input);
    catalogue note: config reject endpoint may or may not require a
    reason in body — check `03_scenario_config.md` §
    `POST /scenario-configs/:id/reject`. If not required, just show
    a confirm button.
  - On 200: config → `draft`, re-render to draft mode

When `status === 'validated'`:
- Render post-validation success block (see #3)

**3. Post-validation success block:**
- Centered, max-width 600px:
  - Lucide `CheckCircle2` 40px teal-bright
  - h3: `"Scenario ready for play"`
  - Body: `"Players can now create games against this config."`
  - Primary: `"Create a game"` → `navigate("/org/games/new?
    scenario_config_id=" + configId)` — route may 404 in Phase 1,
    that's fine and expected
  - Ghost (disabled): `"Clone config for a new lens"` with "Coming
    soon" chip

**4. Staff-only placeholder (Phase 2):**
- When `scope === 'bubble'`, render a separate small block below
  main actions:
  `"Staff: ConfigValidation cycle UI is Phase 2. Use the org-facing
  approve path above for now."` in 11px mono secondary

### Tabbed Editor Mode

**5. `src/pages/authoring/TabbedEditorLayout.jsx`:**

Replaces the Session 1 minimal tab scaffolding.

- Tab row (§5) at top, full-width equal tabs
- Tabs in order:
  - Framing
  - Actors
  - Config
  - Tension
  - Dimensions
  - Scoring
  - Perspective
  - Advisors
  - Questions
  - Turn 1
  - Review
  - Validation (staff only: `scope === 'bubble'`)
- Active tab indicator: `--accent-red` 2px underline
- Active tab determined by local state; initial active tab
  computed on mount:
  - If all readiness rows pass → "Framing"
  - Else → first tab corresponding to a failing readiness row
- Tab body: the same step component, rendered unchanged

**6. Mode switching logic in `AuthoringPage.jsx`:**

Simplify with explicit rules:
- **Stepped mode is default** on `/author/new` and when config is
  `draft` with any unmet readiness row
- **Tabbed mode is default** when config is `in_review`,
  `validated`, or `retired` — OR when user has clicked "Edit
  freely" in the footer
- User can click "Back to steps" on tabbed top bar to return to
  stepped mode (only available when config is `draft`)

**7. Metadata bar (§6) in tabbed mode:**

Above the tab row:
- Left: inline-editable Scenario `title` (§18)
  - Click to edit, blur or Enter to save
  - `updateScenario(scenarioId, { title })`
  - If scenario is locked (see #8): render read-only with `"LOCKED"`
    chip
- Left center: inline-editable ScenarioConfig `name`
  - Same pattern, `updateConfig(configId, { name })`
  - If config is `validated` or `retired`: read-only with `"LOCKED"`
    chip
- Right center: Scenario status Badge + Config status Badge
- Far right: Trash2 icon — opens delete flow (see #10)

**8. Lock behavior (critical — read spec's "Lock behavior in tabbed
mode" section):**

Compute two boolean flags:
- `isScenarioNarrativeLocked` = `scenario.status === 'published'` AND
  any downstream config has `status` in `['validated', 'active']`
- `isConfigLocked` = `config.status` in `['validated', 'retired']`

Apply to step components:
- `Step1Framing`: if `isScenarioNarrativeLocked`, render `narrative`
  field disabled with "LOCKED" chip beside the field label. Other
  fields remain editable.
- `Step2Actors`: if `isScenarioNarrativeLocked`, render entire actor
  list + editor as read-only, with banner at top: `"Actors locked —
  downstream config is validated."`
- `Step3ConfigSetup` through `Step10Turn1Template`: if
  `isConfigLocked`, render entire step as read-only with banner at
  top: `"This config is {status}. Clone to make changes."` +
  disabled `"Clone config"` button ("Coming soon" chip)

Pass these flags as props from `AuthoringPage.jsx` to each step
component. Steps read them and render accordingly.

**9. "Back to steps" ghost link in tabbed top bar:**
- Only visible when `config.status === 'draft'`
- Clicking returns to stepped mode, active step = first failing
  readiness row

**10. Delete Scenario flow:**

Trash2 icon in metadata bar → Modal:
- Title: `"Delete scenario '{title}'?"`
- Body: `"This cannot be undone. If configs exist, you'll be offered
  to archive instead."`
- Confirm button: `destructive` variant, label `"Delete"`
- Cancel ghost

On confirm:
- `deleteScenario(scenarioId)`
- On 204: navigate `/author` with Toast `"Scenario deleted."`
- On 409 (configs exist — check error response shape in
  `02_scenario.md`): Modal body updates to:
  `"Cannot delete — {n} config(s) exist. Archive instead?"` with
  confirm button label changing to `"Archive"`.
  On confirm: `archiveScenario(scenarioId)` → on 200 invalidate,
  show Toast `"Scenario archived."`, stay on page but show archived
  status on the Scenario badge

**11. Config delete — disabled:**

Trash2 or delete action on config surface (if rendered anywhere):
disabled with tooltip `"Config delete endpoint is planned — coming
soon"`. The API endpoint is marked planned-not-built.

**12. Validation tab placeholder (staff-only):**

When `scope === 'bubble'` and the Validation tab is active, render:
- h3: `"ConfigValidation cycle — Phase 2"`
- Body: `"Staff review workflow UI is planned for a later build.
  For now, use the Approve action on the Review tab to validate
  configs directly."`

## Closeout work (after main deliverables)

**13. Update documentation:**
- `docs/pages/AuthoringPage.md` — change status at top from `"SPEC
  — not yet built"` to `"BUILT"`
- `Frontend_HANDOFF.md` — update the page index table to reflect
  AuthoringPage as BUILT
- `API_HANDOFF.md` — add a note under "Next Priorities" that
  GamePage work is now unblocked because a ScenarioConfig can reach
  `validated` via the authoring flow

**14. End-to-end smoke test:**

Before declaring Session 8 done, do a full walk:
1. Log in as test account
2. `/author` → pick a real extraction (try
   `fc9c99bd-0ef8-4ad4-871c-24c04580e7e5`)
3. Walk through Steps 1–10, filling required fields at each step
4. Reach Step 11 with all 10 checklist rows green
5. Click Submit for review → status changes to `in_review`
6. Click Approve → status changes to `validated`
7. Post-validation block renders
8. Copy the `config.id` value; from a terminal:
   `curl -X POST https://<api-url>/v1/games -H "Authorization:
   Bearer $TOKEN" -H "Content-Type: application/json" -d
   '{"scenario_config_id": "<copied_id>", "mode": "async"}'`
9. Confirm the Game record is created (status 201)

If step 8–9 fail, debug before declaring done — the whole point of
this session is unblocking GamePage.

## Out of scope

- ConfigValidation cycle UI (Phase 2)
- Config clone (Phase 2, endpoint not built)
- Config retire (Phase 2, endpoint not built)
- Framework creation (Phase 2)
- GamePage itself (separate work)

## Acceptance checklist

- [ ] ReadinessChecklist shows correct state for a partially-built
      config (some rows green, some red); clicking a red row jumps
      to that step
- [ ] Complete build → all 10 rows green → Submit for review
      enables
- [ ] Submit for review → config `in_review` → Approve/Reject
      buttons appear
- [ ] Approve → config `validated` → post-validation block renders
      with "Create a game" button
- [ ] Reject (with reason if required) → config back to `draft` →
      can re-edit and re-submit
- [ ] Tabbed mode active on `validated` config; all tabs read-only
      with banner
- [ ] Scenario title + config name inline-editable in metadata bar
      when not locked
- [ ] On a scenario with a validated config, open Step 1/Actors →
      narrative and actors show "LOCKED" chips, other fields
      editable
- [ ] Delete scenario with no configs → 204 → back to `/author`
- [ ] Delete scenario with configs → 409 → Modal offers Archive →
      archive succeeds
- [ ] Switch between stepped and tabbed modes on a draft config via
      footer link and "Back to steps"
- [ ] Staff sees Validation tab with Phase 2 placeholder; ClientAdmin
      does not see the tab
- [ ] End-to-end curl test: `POST /v1/games` with the
      just-validated `scenario_config_id` returns 201 with a Game
      record
- [ ] `npm run build` succeeds
- [ ] All three doc files updated per #13

## Process

**Before writing code:**
1. Read all context docs
2. Report:
   - Whether `rejectConfig` requires a body field per
     `03_scenario_config.md`
   - Confirmed the approve/reject endpoint paths match `curls.md`
   - Your understanding of the lock-flag computation
3. Summarize, wait for "go"

**While building:**
- ReadinessChecklist is cache-only computation — don't call the API
  just to probe readiness
- 422 from submit-for-review is a cache-API mismatch — show the
  server errors, don't silently retry
- Lock flags are scope-agnostic; they're lifecycle-driven. Scope
  gating is a separate concern (staff-only Validation tab).
- The end-to-end smoke test in #14 is the acceptance gate — if it
  fails, something upstream is still broken

**On completion:**
- Run the full acceptance checklist
- Run the end-to-end smoke test with the curl command
- Update the three doc files
- Report done with a summary of what shipped

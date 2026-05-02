# CC Prompt — Session 5c: Step 6 Scoring (EvaluationCriteria)

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

**Page spec:**
7. `~/dev/warpaths-frontend/docs/pages/AuthoringPage.md`
   — "State 2 Step 6 — Scoring (EvaluationCriteria)" section

**Build plan:**
8. `~/dev/warpaths-frontend/docs/build-plans/AuthoringPage-BuildOrder.md`
   — Session 5c section

**API contract — catalogue authoritative:**
9. `~/dev/warpaths-api/docs/api/05b_evaluation_criteria.md` — field
   list, endpoint paths. Critical: this references
   `criteria_key` which is used downstream by TurnQuestion.
10. `~/dev/warpaths-api/docs/api/00_overview.md` — read the
    "DimensionDefinition vs EvaluationCriteria" section to reinforce
    the distinction (scoring is here, world state is in Session 5b)
11. `~/dev/warpaths-api/docs/curls.md`

**Frontend registries:**
12. `~/dev/warpaths-frontend/docs/api-surface.md`
13. `~/dev/warpaths-frontend/docs/response-shapes.md`
14. `~/dev/warpaths-frontend/docs/query-keys.md`

## Scope for this session

Build Step 6. 1–5 EvaluationCriteria per config, integer weights
summing to 100.

**This session has a downstream contract:** Session 6 needs a
function `getEvaluationCriteria(configId)` that returns the list of
records including `criteria_key`. The TurnQuestion editor uses those
keys as the allowed values for the `evaluation_tags` chip picker.
Export this function cleanly.

## Deliverables

**1. Extend `src/api/scenarioChildren.js`:**
- `listEvaluationCriteria(configId)` — per catalogue
- `createEvaluationCriteria(configId, body)`
- `updateEvaluationCriteria(configId, criteriaId, body)`
- `deleteEvaluationCriteria(configId, criteriaId)`

Ensure `listEvaluationCriteria` is exported and usable by Session 6.

**2. Step 6 layout — `Step6Scoring.jsx` full replacement:**
- Header row:
  - `"EVALUATION CRITERIA"` 10px mono uppercase secondary
  - Count chip `{n}/5 max, 1 min` right — teal-bright at 1–5,
    red at 0 or >5
- Weight sum line: `"Weight total: {sum}/100"` —
  teal-bright when exactly 100 (integer), red otherwise
- List of `CriteriaRow` sub-components
- `"+ Add criterion"` button below the list; disabled at `n >= 5`

**3. `CriteriaRow` — inline editor:**

Fields per catalogue. Expected (confirm):
- `criteria_key` — Input, lowercase_snake regex (same pattern as
  Session 5b `key`)
- `name` — Input
- `description` — Textarea, 2 rows
- `weight` — Input type number, integer, min 0, max 100

Auto-save on blur — same pattern as Session 5b.

**4. Advance gate on Step 6:**
- 1 ≤ n ≤ 5
- All rows have `criteria_key`, `name`, and a valid `weight`
- `criteria_key` values are all unique within the config (no
  duplicates)
- Integer weight sum = 100 (exact — no tolerance; weights are
  integers)
- Disabled with specific tooltip per failing condition

**5. Loading / error states** per §19.

## Out of scope

- AI generation for criteria (Phase 2)
- Everything outside Step 6

## Acceptance checklist

- [ ] Start with empty list, "+ Add criterion" creates a row
- [ ] Add 3 criteria with weights 40/30/30 → weight sum turns
      teal-bright at 100
- [ ] Change one weight to 35 → sum = 105, turns red, advance blocked
- [ ] Duplicate `criteria_key` → inline error on the duplicate
- [ ] Try to add a 6th criterion → button disabled
- [ ] Reload page → rows persist
- [ ] Save & next enables when all conditions met
- [ ] `npm run build` succeeds
- [ ] Registry docs updated

## Process

**Before writing code:**
1. Read docs — note especially the distinction between
   DimensionDefinition (Session 5b, weights 0.0–1.0 sum to 1.0) and
   EvaluationCriteria (this session, weights 0–100 integers sum to
   100). Do not conflate.
2. Report catalogue field names
3. Wait for "go"

**While building:**
- Weights are integers, sum is exact 100 — no float tolerance
- `criteria_key` is the downstream contract with TurnQuestion — use
  the same lowercase_snake regex from Session 5b's `key` field so
  they're consistent
- Export `listEvaluationCriteria` cleanly — Session 6 imports it

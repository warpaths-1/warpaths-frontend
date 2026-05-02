# CC Prompt — Session 6: Steps 8 Advisors + 9 TurnQuestions

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
   — "State 2 Step 8 — Advisors" and "Step 9 — Turn questions"
   sections

**Build plan:**
8. `~/dev/warpaths-frontend/docs/build-plans/AuthoringPage-BuildOrder.md`
   — Session 6 section

**API contracts — catalogue authoritative:**
9. `~/dev/warpaths-api/docs/api/08_advisor.md` — advisor field list,
   `is_primary` semantics, endpoint paths
10. `~/dev/warpaths-api/docs/api/06_turn_question.md` — turn question
    shape, `evaluation_tags` references `criteria_key` from
    EvaluationCriteria, `question_order` ordering semantics
11. `~/dev/warpaths-api/docs/api/00_overview.md` — re-read the note
    about `TurnQuestion.evaluation_tags` referencing
    `EvaluationCriteria.criteria_key`
12. `~/dev/warpaths-api/docs/curls.md` — confirm paths, and **verify
    `POST /v1/scenario-configs/:id/turn-questions/generate` is live,
    not stubbed/501**. If it returns a non-success status, the
    Generate button must disable with "AI generation coming soon"
    chip.

**Frontend registries:**
13. `~/dev/warpaths-frontend/docs/api-surface.md`
14. `~/dev/warpaths-frontend/docs/response-shapes.md`
15. `~/dev/warpaths-frontend/docs/query-keys.md`

**Upstream dependency:**
- Session 5c exported `listEvaluationCriteria(configId)` — import it
  here for the `evaluation_tags` chip picker

## Scope for this session

Build Step 8 (Advisors) and Step 9 (TurnQuestions). Wire the
`turn-questions/generate` endpoint if live.

## Deliverables

### Step 8 — Advisors

**1. Extend `src/api/scenarioChildren.js`:**
- `listAdvisors(configId)`
- `createAdvisor(configId, body)`
- `updateAdvisor(configId, advisorId, body)`
- `deleteAdvisor(configId, advisorId)`

**2. Step 8 layout — `Step8Advisors.jsx`:**
- Header row:
  - `"ADVISORS"` 10px mono secondary label left
  - Count chip right: `{n} · {primary_count} primary` — teal-bright
    when `primary_count === 1`, amber otherwise
- List of `AdvisorCard` components (parallel to Step 2 ActorCard)
- `"+ Add advisor"` ghost button

**3. `AdvisorCard`:** Card variant `default`, showing:
- `name` primary, `role` secondary
- `is_primary` red-accent badge if true
- Edit (opens `AdvisorEditor` Drawer) + Trash2 remove

**4. `AdvisorEditor` — 640px Drawer (parallel to `ActorEditor`):**

Fields per catalogue (confirm):
- `name` — Input, required
- `role` — Input
- `persona` — Textarea, 4 rows
- `knowledge_domain` — Textarea, 3 rows
- `is_primary` — Toggle, teal on-state
- Any additional catalogue fields

**5. Single-primary enforcement:**
- Client-side: when user toggles `is_primary: true` on advisor A
  while advisor B is already primary, before sending any PATCH:
  1. PATCH advisor B to `is_primary: false`
  2. Then PATCH advisor A to `is_primary: true`
  3. Invalidate `['advisors', configId]`
- If the first PATCH fails, show an error Toast and don't send the
  second PATCH — leave state unchanged

**6. Remove advisor:**
- Modal confirm (same pattern as actor remove)
- On confirm: `deleteAdvisor`, invalidate list

**7. Advance gate on Step 8:**
- `n >= 1` AND exactly 1 `is_primary: true`
- Tooltip names the failing condition

### Step 9 — TurnQuestions

**8. Extend `src/api/scenarioChildren.js`:**
- `listTurnQuestions(configId)`
- `createTurnQuestion(configId, body)`
- `updateTurnQuestion(configId, questionId, body)`
- `deleteTurnQuestion(configId, questionId)`
- `generateTurnQuestions(configId)` —
  `POST /v1/scenario-configs/:id/turn-questions/generate`.
  Wrap in try/catch; on 501 / "not implemented" / similar, throw a
  typed error the UI can detect.

**9. Step 9 layout — `Step9TurnQuestions.jsx`:**

Top bar:
- `"Generate draft"` primary button →
  `generateTurnQuestions(configId)` with ProgressBar overlay,
  label `"Generating turn questions — this may take 30+ seconds"`
- If endpoint is known unavailable (`curls.md` check failed or
  runtime 501): disable button with 11px mono amber chip `"AI
  generation coming soon"`
- On generate success: invalidate `['turn-questions', configId]`,
  Toast `"Generated {n} questions — review and edit."`
- On generate error: Toast error, keep existing list intact

Below top bar:
- Load config via `['config', configId]` to read `turn_count`
- Load criteria via `['criteria', configId]` for the chip picker
  allowed values
- Load existing questions via `['turn-questions', configId]`
- Group questions by `turn_number`
- Render one collapsible section per turn number 1..`turn_count`:
  - Header: `"TURN {n}"` 10px mono uppercase + count right:
    `{k} question(s)` teal-bright if ≥1, secondary if 0
  - Expand/collapse chevron
  - Inside: stacked `QuestionRow` components
  - `"+ Add question"` ghost button within the section

**10. `QuestionRow` — local sub-component:**

Fields per catalogue:
- `question_text` — Textarea, 3 rows, auto-save on blur
- `evaluation_tags[]` — multi-select chip picker
  - Allowed values = `criteria_key` list from EvaluationCriteria
  - Chip UI: chips for selected keys with × to remove, plus
    `"+ Add tag"` dropdown
  - If criteria list is empty (user skipped Step 6), render the chip
    picker disabled with amber hint `"Define evaluation criteria in
    Step 6 first"`
- `question_order` — not shown as a field; derived from the row's
  index within its turn_number group. On add/remove/reorder, PATCH
  affected rows with new order values.

Auto-save on blur, same pattern as Session 5b dimensions.

**11. Advance gate on Step 9:**
- Every turn from 1 to `turn_count` has ≥1 TurnQuestion
- Each TurnQuestion has non-empty `question_text`
- Tooltip lists the first failing turn: `"Turn {n} needs at least
  one question"`

## Out of scope

- Reordering questions within a turn via drag-and-drop (Phase 2 —
  order-by-index is fine for now)
- Cross-turn moves (Phase 2)
- ContentSeed authoring (Phase 2)
- Advisor AI generation (Phase 2)

## Acceptance checklist

Step 8:
- [ ] Add 2 advisors via Drawer, mark #2 primary → count chip shows
      `2 · 1 primary` teal-bright
- [ ] Toggle #1 to primary → #2 flips to non-primary automatically,
      count chip still shows `1 primary`
- [ ] Remove an advisor → count updates
- [ ] Advance blocked with 0 primary; tooltip says "Exactly one
      advisor must be primary"

Step 9:
- [ ] Config with `turn_count: 5` shows 5 collapsible sections
- [ ] "Generate draft" (if endpoint live): ProgressBar, then
      questions populate across turns; Toast summary
- [ ] "Generate draft" (if stubbed): button disabled with chip
- [ ] Add question manually: row with text + tags
- [ ] Tag picker only shows the `criteria_key` values from Session
      5c's EvaluationCriteria
- [ ] Empty criteria list → tag picker disabled with hint
- [ ] Advance blocked when any turn has 0 questions
- [ ] Reload page → all questions persist in correct turns

- [ ] `npm run build` succeeds
- [ ] Registry docs updated

## Process

**Before writing code:**
1. Read docs, ESPECIALLY `curls.md` for the generate endpoint status
2. Report whether the generate endpoint is live, stubbed, or missing
3. Summarize, wait for "go"

**While building:**
- Single-primary logic runs client-side; API does not enforce
- `evaluation_tags` values come from Session 5c's data — don't
  hardcode any tag values
- Question order is derived from array index per turn group — no
  explicit reorder UI
- Use `confirm generate endpoint live before wiring` as the decision
  gate: live → full button; stubbed → disabled + chip

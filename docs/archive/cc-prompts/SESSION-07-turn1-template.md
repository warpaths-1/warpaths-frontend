# CC Prompt — Session 7: Step 10 Turn 1 Template

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
   — "State 2 Step 10 — Turn 1 template" section AND
   "AI generation prompt quality" note in Constraints

**Build plan:**
8. `~/dev/warpaths-frontend/docs/build-plans/AuthoringPage-BuildOrder.md`
   — Session 7 section

**API contracts — CRITICAL, read thoroughly:**
9. `~/dev/warpaths-api/docs/api/10b_turn1_template.md` — the
   Turn1Template schema. This is the most complex sub-object; the
   spec defers detailed UI decisions to what this catalogue specifies.
   **Do not start UI work until you've read and understood this
   catalogue end-to-end.**
10. `~/dev/warpaths-api/docs/api/13_dimension_snapshot.md` — for
    `world_state` field semantics if referenced
11. `~/dev/warpaths-api/docs/api/14_content_item.md` — for
    ContentItem shape and type enum
12. `~/dev/warpaths-api/docs/api/15_advisor_input.md` — for
    AdvisorInput shape
13. `~/dev/warpaths-api/docs/curls.md` — **verify
    `POST /v1/scenario-configs/:id/turn1-template/generate` is
    live**. Same rule as Session 6's generate endpoint.

**Frontend registries:**
14. `~/dev/warpaths-frontend/docs/api-surface.md`
15. `~/dev/warpaths-frontend/docs/response-shapes.md`
16. `~/dev/warpaths-frontend/docs/query-keys.md`

**Upstream data dependencies:**
- `listDimensions(configId)` from Session 5b — rows for world_state
- `listAdvisors(configId)` from Session 6 — one AdvisorInput per
  advisor auto-created as placeholders on template load
- `listTurnQuestions(configId)` from Session 6 — Turn 1 questions
  are referenced read-only

## Scope for this session

Build Step 10. Turn1Template is a single composite record per config
covering the full Turn 1 package.

**This session is different:** the spec explicitly defers detailed
UI to after you've read `10b_turn1_template.md`. The deliverables
below describe the overall shape; you fill in field-level details
from the catalogue.

## Deliverables

**1. Extend `src/api/scenarioChildren.js`:**
- `getTurn1Template(configId)`
- `createTurn1Template(configId, body)` — for "Start blank" path
- `updateTurn1Template(configId, body)` — for edits
- `generateTurn1Template(configId)` —
  `POST /v1/scenario-configs/:id/turn1-template/generate`.
  Same live-vs-stubbed handling as Session 6.

**2. Step 10 top bar — `Step10Turn1Template.jsx`:**

Two buttons side by side at top of step:
- `"Generate draft"` primary — calls `generateTurn1Template(configId)`
  with ProgressBar overlay, label `"Generating Turn 1 template —
  this takes 30–60 seconds. Do not close this tab."`
- `"Start blank"` ghost — calls `createTurn1Template(configId, {})`
  with a catalogue-schema-compliant empty body

If either button returns a saved record, the editor body below
populates.

If the generate endpoint is not live: disable with the `"AI
generation coming soon"` chip (same pattern as Session 6).

**3. Editor body — populate per catalogue schema:**

Based on the spec and expected catalogue structure, the editor
should have these sections. **Verify each against
`10b_turn1_template.md` before building:**

**World state section:**
- Load `listDimensions(configId)` for the 5 dimension rows
- One row per dimension with:
  - Dimension `name` and `key` (read-only label)
  - Input for initial value (the value type — 1–5 integer? free
    text? — depends on catalogue)
  - Optional `narrative` or `reasoning` textarea per dimension if
    catalogue specifies

**Content items section:**
- List of `ContentItemRow` sub-components
- Fields per `14_content_item.md`:
  - `type` Select — enum from catalogue (intel / media / scenario
    update / etc.)
  - `headline` Input
  - `body` Textarea
  - Any additional fields
- `"+ Add content item"` button

**Advisor inputs section:**
- Load `listAdvisors(configId)`
- One row per advisor, auto-created as placeholder on template load
  if not yet present:
  - Advisor `name` + `role` read-only label
  - `message` Textarea per `15_advisor_input.md`
  - Any additional fields (tone, urgency — from catalogue)

**Turn 1 questions section (read-only reference):**
- Load `listTurnQuestions(configId)` filtered to `turn_number === 1`
- Display as a read-only list: each question's `question_text`,
  tags
- No edit UI; 11px mono secondary hint at bottom: `"Edit Turn 1
  questions in Step 9."`

**4. Save on "Save & next":**
- `updateTurn1Template(configId, dirtyBody)` with the full composite
  body (including content_items array, advisor_inputs array,
  world_state array)
- Invalidate `['turn1-template', configId]`, advance

**5. Advance gate:**
- Turn1Template record exists (spec: "completeness determined by
  reviewer, not schema")
- Button enabled as soon as the record is created via either path

## Out of scope

- AI prompt quality — do not attempt to critique the generated
  output. Author is expected to edit heavily. The prompt is a Step 7
  platform concern.
- Turn 2+ generation logic (happens at game runtime, not authoring)
- DimensionSnapshot schema beyond the initial world_state values

## Acceptance checklist

- [ ] Config with 5 dimensions, 2 advisors, Turn 1 questions → Step
      10 loads with "Generate draft" and "Start blank" buttons
- [ ] "Start blank" → empty template created, editor populates with
      5 world_state rows, 2 advisor input placeholders, empty
      content_items, read-only Turn 1 questions list below
- [ ] "Generate draft" (if live): ProgressBar for generation
      duration, then editor populates with AI output
- [ ] "Generate draft" (if not live): button disabled with chip
- [ ] Fill in world_state values, add 2 content items, write advisor
      messages, Save & next → PATCH succeeds
- [ ] Reload at Step 10 → all data persists
- [ ] Advance gate enables as soon as the template record exists
- [ ] `npm run build` succeeds
- [ ] Registry docs updated

## Process

**Before writing code:**
1. Read `10b_turn1_template.md` carefully. Report:
   - Exact field names on Turn1Template
   - Whether world_state is array of objects or keyed map
   - Whether advisor_inputs is array per advisor or single field
   - Whether content_items has a type enum and what the values are
   - Whether "Start blank" should POST an empty body or construct a
     default body
2. Summarize your plan, highlight any ambiguity, wait for "go"

**While building:**
- Respect the catalogue schema exactly — use its field names
- The full composite PATCH on save is the intended pattern unless
  the catalogue specifies per-subobject endpoints (e.g. `POST
  /turn1-template/:id/content-items`). Confirm before wiring.
- Generate vs blank: both paths converge on the same editor state;
  write the editor component once, invoke it after either creation
  path
- Do not editorialize on AI output quality

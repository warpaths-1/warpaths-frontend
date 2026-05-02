# CC Prompt — Session 5d: Step 7 Player Perspective

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
   — "State 2 Step 7 — Player perspective" section

**Build plan:**
8. `~/dev/warpaths-frontend/docs/build-plans/AuthoringPage-BuildOrder.md`
   — Session 5d section

**API contract — catalogue authoritative:**
9. `~/dev/warpaths-api/docs/api/09_player_perspective.md` — field
   list, endpoint paths. This is a single-record-per-config object.
10. `~/dev/warpaths-api/docs/curls.md`

**Frontend registries:**
11. `~/dev/warpaths-frontend/docs/api-surface.md`
12. `~/dev/warpaths-frontend/docs/response-shapes.md`
13. `~/dev/warpaths-frontend/docs/query-keys.md`

## Scope for this session

Build Step 7 — PlayerPerspective form. One record per config,
similar shape to TensionIndicator (Session 5a).

No extraction pre-fill for this object — the PlayerPerspective is
config-specific, not a report concept.

## Deliverables

**1. Extend `src/api/scenarioChildren.js`:**
- `getPlayerPerspective(configId)`
- `createPlayerPerspective(configId, body)`
- `updatePlayerPerspective(configId, body)`

Check catalogue for exact paths — may be singular (single record)
with PUT semantics rather than POST + PATCH. Follow catalogue.

**2. Step 7 form — `Step7Perspective.jsx` full replacement:**

Fields per catalogue (these are the spec's suggestions — confirm):
- `role_description` — Textarea, 4 rows
- `objectives` — Textarea, 4 rows
- `constraints` — Textarea, 4 rows
- `information_access` — Textarea, 3 rows
- Any additional fields in catalogue

TanStack Query key: `['perspective', configId]`

**3. Save on "Save & next":**
- First save: `createPlayerPerspective(configId, body)` → cache-seed,
  advance
- Subsequent: `updatePlayerPerspective(configId, dirtySubset)` →
  invalidate, advance

**4. Advance gate:**
- All catalogue-required fields populated
- Disabled with tooltip listing the first missing field

## Out of scope

- Everything outside Step 7

## Acceptance checklist

- [ ] Step 7 renders with blank fields on first visit
- [ ] Fill required fields, Save & next → POST, advances to Step 8
- [ ] Re-visit Step 7 → values persist, no duplicate created
- [ ] Edit fields → PATCH dirty subset on save
- [ ] Advance gate blocks when required fields empty
- [ ] `npm run build` succeeds
- [ ] Registry docs updated

## Process

**Before writing code:**
1. Read docs
2. Report catalogue field names and any required fields
3. Wait for "go"

**While building:**
- No extraction pre-fill for this object
- Textarea rows: 4 rows for main fields, 3 for secondary

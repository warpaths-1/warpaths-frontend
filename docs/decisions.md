# Frontend Decisions

**Location:** `warpaths-frontend/docs/decisions.md`
**Purpose:** Durable architectural decisions that apply across pages and features.
Cross-page conventions live here. Page-specific decisions live in the page spec.
Feature-in-progress state lives in `docs/plans/<FEATURE>.md`.

When a CC plan-mode session starts, this file is required reading alongside
`CLAUDE.md` and any relevant page spec or plan doc.

---

## API contract authority

### Authority hierarchy

1. **Live API behavior (probe)** — definitive
2. **OpenAPI** (`https://warpaths-api.onrender.com/openapi.json`) — authoritative for request shapes
3. **Catalogue** (`warpaths-api/docs/api/*.md`) — hint, may drift
4. **Page spec** (`docs/pages/*.md`) — describes UI intent, not API truth

When sources disagree, probe. When OpenAPI and catalogue disagree, OpenAPI wins
and the catalogue gets updated.

### Silent-drop on unknown fields

The API uses pydantic `extra="ignore"`. POST/PATCH bodies with unknown field names
return 201/200 with no error — the data is silently dropped. There is no defensive
422 to catch typos.

**Rule:** every POST/PATCH body must use field names exactly as declared in
`openapi.json`. Verify before writing code; assume any "obvious" name not in the
schema will silently disappear.

### Response shapes mostly undeclared

140 of 144 success responses in `openapi.json` lack `response_model=`. OpenAPI is
silent on the shape of ~97% of responses.

**Rule:** verify response shapes via probe before destructuring. Stamp them in
`docs/response-shapes.md` with `Last probed: YYYY-MM-DD`.

### List envelope variations

Don't assume `{items: [...]}`. Known variants:

| Resource | Envelope |
|---|---|
| Scenario, ClientExtraction, ScenarioConfig, AnalyticalFramework | `{items}` |
| ReportExtraction | `{items, next_cursor}` |
| EvaluationCriteria | `{items, meta: {weight_sum}}` |

Probe before consuming a list endpoint not yet in `docs/response-shapes.md`.

### PATCH schemas may differ from POST schemas

`PatchScenarioConfigRequest` excludes `game_type` and `turn_count` — those are
immutable after create. Verify PATCH schemas separately from POST.

### Endpoint path conventions vary by resource

Some resources are nested-only. Some are nested-create + flat-edit.
DimensionDefinition is the canonical example: GET list and POST under
`/v1/scenario-configs/{config_id}/dimension-definitions`; GET single, PATCH,
DELETE under `/v1/dimension-definitions/{id}`. Match exactly per resource.

---

## API module organization

- `src/api/scenarioChildren.js` — all per-ScenarioConfig sub-object calls
  (Tension, Dimensions, EvaluationCriteria, PlayerPerspective, Advisors,
  TurnQuestions, Turn1Template). One section per resource.
- `src/api/scenario.js` — per-Scenario calls (Scenario itself, Actors)
- One file per other domain (`auth.js`, `client.js`, `extraction.js`,
  `game.js`, `leaderboard.js`, `user.js`)
- Naming: `get*` for GET, action verbs for POST (`ingestReport`), `patch*` or
  `update*` for PATCH, `delete*` for DELETE
- All paths use `/v1/` prefix except `/auth/*`
- Always use the axios instance from `src/api/client.js` — never raw fetch

The `api-surface.md` registry must be updated in the same session as any change
to `src/api/`.

---

## TanStack Query

- All server state goes through TanStack Query v5. No `useEffect` + fetch.
- GET → `useQuery`. POST/PATCH/DELETE → `useMutation`.
- Successful mutation → invalidate relevant query keys.
- `isLoading: true` → render Skeleton. Never a blank panel.
- `isError: true` → use existing error patterns from
  `docs/page-design-patterns.md` §19.

### Query key conventions

Pattern: `[resource, id, ...filters]`

For per-ScenarioConfig sub-objects: `['<resource>', configId]`. Examples:
`['dimensions', configId]`, `['tension', configId]`, `['turn1-template', configId]`.

Single-record-by-ID queries are usually unnecessary — the list query carries
everything.

All registered keys live in `docs/query-keys.md`. Update it when adding new queries.

---

## Per-row inline editor pattern

Established in Sessions 5a and 5b for DimensionDefinitions. Applies to any
list-of-rows resource.

- **Auto-commit on blur** if all required fields are filled
- **Dirty-subset PATCH:** body contains only changed fields
  (verify in Network tab)
- **POST on first complete blur** for new rows
- **Saving state** (`status === 'saving'`):
  - Row body opacity → 0.55 with 150ms ease
  - Inputs disabled
  - Corner shows "Saving…" text
  - Trash button hidden
- **Error state** (`status === 'error'`):
  - Per-field errors displayed inline
  - Status flips back to `'idle'` automatically when fields resolve.
    No spurious PATCH fires for a no-op clean state.

---

## Required-field indicators

Red asterisk on required field labels. Pattern is **inlined per component, not
extracted to a shared component.** Applied so far in Step 4 (NAME, DESCRIPTION,
INITIAL VALUE, SCALE 1–7 LABEL) and Step 5 (DISPLAY NAME, DEFINITION).

---

## Step gating philosophy

"Save & next" is enabled by default at most steps — the platform supports
incomplete configs. The platform-level gate is at Step 11 (Review + submit).

Per-resource exceptions exist where a hard constraint applies (e.g. duplicate
`dimension_key` blocks save). These are local, not platform-wide.

---

## CSS modules — conditional, not mandatory

Create a `<Component>.module.css` only when styling needs exceed what
`tokens.css`, `global.css`, and shared components cover. Step 4 has no module.
Step 5 has no module. Step 2 has one. There is no expectation either way.

When you do create one, follow the rules in `CLAUDE.md`: no hardcoded colors,
fonts, spacing, or radii — always `var(--token-name)`.

---

## Test data hygiene

- Track every record ID created during build and verification work
- Report all created IDs at the end of a session
- Don't auto-delete — DELETE is unreliable on some resources (see Bug A in
  the AuthoringPage plan)
- Human decides cleanup

---

## Git discipline

These rules are enforced by review, not by tooling.

- All work commits to `main`
- Always specify exact file paths in `git add` and `git commit`. Never
  `git add .` or `git add -A`. Avoids accidentally committing unrelated
  staged changes.
- Verify `git status` is clean before starting any session
- Verify `git log main --oneline -3` matches expected state before starting
- Run `vite build` and `npm test` before declaring a task complete
- Build must pass with zero errors and zero warnings
- Stage changes for human review before committing

---

## Smoke testing

- **Smoke test before close-out, not after.** Build → smoke test → commit.
  Don't commit work that hasn't been verified running.
- For Vite dev environments: HMR breaks Chrome extension pixel screenshots
  (`document_idle` never fires). Use DOM/text inspection via `javascript_tool`.
- Verify dev server CWD matches the code being tested.

---

## State persistence

- Game state: API is authoritative. Reconstruct from API on reload.
- Authoring state: persisted to API on each save. No browser draft state.
- Session tokens: `sessionStorage.warpaths_token` only. Never localStorage.

No application state goes in localStorage anywhere.

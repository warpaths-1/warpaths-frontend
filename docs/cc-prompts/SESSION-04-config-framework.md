# CC Prompt — Session 4: Step 3 Config + Framework Picker

## Audit-aware constraints (read first)

This session was originally drafted pre-audit. Apply these
platform-wide invariants throughout — they apply to every POST/PATCH
and every list endpoint regardless of what individual catalogue
files claim.

1. **Silent-drop on unknown POST/PATCH fields.** The API uses
   pydantic `extra="ignore"` by default. Wrong field names return
   201/200, no error, but data is lost. Verify every body shape
   against `openapi.json` before sending. Examples bitten in prior
   sessions: `goal_items` (real `goals`), `content_items` on
   Turn1Template PATCH (real: drop), `authored_by_client_id` on
   Scenario POST (real: drop).

2. **`response_model=` declarations missing on ~140/144 routes.**
   OpenAPI is silent on most response shapes. Treat response shapes
   defensively. When destructuring a response field, verify against
   a probe or against `docs/response-shapes.md`. Don't assume the
   catalogue.

3. **List endpoint envelopes vary.** Confirmed:
   - `{items: [...]}` — scenarios, client extractions, analytical
     frameworks (verified 2026-04-25)
   - `{items: [...], next_cursor: "..."}` — report extractions
   - `{items: [...], meta: {weight_sum: number}}` — evaluation criteria
   `src/api/*.js` modules unwrap inside the function. Consumers
   never re-unwrap with `.items`.

4. **ScenarioConfig response shape** (verified probe B4 2026-04-24):
   `{id, scenario_id, source_extraction_id, analytical_framework_id,
   name, description, status, game_type, turn_count,
   requires_validation, max_exchanges_per_turn,
   minimum_runs_for_insight, released_through_turn, created_at,
   updated_at}`. Does NOT include `circle_space_id` (stoplight had
   it; field doesn't exist). Does NOT inline child objects — every
   child has its own sub-endpoint, fetch separately.

5. **Submit-for-review readiness gate does not enforce server-side**
   (probe D4 2026-04-24). Empty config submits accept with 200.
   Frontend's readiness checklist is UX-only. Not relevant to
   this session (Session 8 territory) but useful context.

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
   — focus on:
   - "State 2 Step 3 — Config setup"
   - "Framework clone guard" subsection
   - "API Behavior Notes" section (added during audit)
   - Step 6 (Scoring) note about EvaluationCriteria envelope
     `{items, meta: {weight_sum}}` — informs that other endpoints
     can have non-standard envelopes

**Build plan:**
8. `~/dev/warpaths-frontend/docs/build-plans/AuthoringPage-BuildOrder.md`
   — Session 4 section

**API contracts:**
9. `~/dev/warpaths-api/docs/api/03_scenario_config.md` — the config
   create/update surface, the nested-path convention, the
   "submit-for-review requirements" list (for later sessions, but
   useful context here), lifecycle states
10. `~/dev/warpaths-api/docs/api/01_analytical_framework.md` —
    framework shape, tier enum, clone endpoint, scope visibility
11. `~/dev/warpaths-api/docs/curls.md` — confirm paths before wiring

**Frontend registries — update on completion:**
12. `~/dev/warpaths-frontend/docs/api-surface.md`
13. `~/dev/warpaths-frontend/docs/response-shapes.md`
14. `~/dev/warpaths-frontend/docs/query-keys.md`

## Scope for this session

Step 3 creates the ScenarioConfig record and wires the
AnalyticalFramework picker. After this session, a user can reach Step
4 with a `draft` config that has a framework assigned.

## Deliverables

**1. `src/api/scenarioConfig.js` — new module:**
- `getConfigsForScenario(scenarioId)` — `GET /v1/scenarios/:id/configs`
- `createConfig(scenarioId, body)` — **nested path**:
  `POST /v1/scenarios/:scenario_id/configs`
  - Use the nested path. It matches the rest of the API's
    child-creation pattern (e.g.,
    `POST /v1/scenarios/:id/actors`).
  - The catalogue claims the flat `POST /v1/scenario-configs` is
    planned-not-built. This is UNVERIFIED — the audit didn't probe
    the flat POST. The nested path is the correct choice
    regardless of flat-path status.
  - Optional probe (low priority): if curiosity warrants, run
    Probe D in the pre-build verification step to check whether
    the flat path returns 404, 405, or accepts the body.
- `updateConfig(configId, body)` — `PATCH /v1/scenario-configs/:id`
- `submitConfigForReview(configId)` — exported, called in Session 8
- `approveConfig(configId)` — exported, called in Session 8
- `rejectConfig(configId)` — exported, called in Session 8

**2. `src/api/framework.js` — new module:**
- `listFrameworks()` — `GET /v1/analytical-frameworks`.
  - **Envelope:** `{items: [...]}` (verified 2026-04-25). Unwrap
    inside the function: `return data?.items ?? []`.
  - **Server auto-scopes** to platform + caller's client_id
    (verified 2026-04-25 — bubble token returned only `client_id:
    null` records). Frontend does not pass any client_id filter.
  - **Item shape** (verified): `{id, client_id, tier, name,
    framework_description, framework_tenets, created_at,
    updated_at}`. No `is_active`, no `created_by_user_id`, no
    `notes` in response — stoplight-claimed fields not returned.
- `getFramework(id)` — `GET /v1/analytical-frameworks/:id`.
  Response shape UNVERIFIED — assume same as list item shape, but
  treat defensively. Add to `response-shapes.md` after first
  successful call with `Last probed: <today's date>`.
- `cloneFramework(id, name)` —
  `POST /v1/analytical-frameworks/:id/clone` with `{ name }`.
  **Note:** clone endpoint not verified live in any session yet.
  If 422 or other error, surface error and revert local state.

**3. Step 3 config form — `Step3ConfigSetup.jsx` full replacement:**

On mount:
- `getConfigsForScenario(scenarioId)` via TanStack Query with key
  `['configs', scenarioId]`
- If a config with `status === 'draft'` exists, use it (pick newest
  `created_at` if multiple). Load its data as initial form state.
- If none exist, render form blank.

Fields — all use existing UI components:
- `name` — Input, required (placeholder `"e.g. Realism — Baseline"`)
- `description` — Textarea, 3 rows
- `game_type` — Select: `sage_individual | org_facilitated`
  (confirm enum values against `03_scenario_config.md`)
- `turn_count` — Input number, min 3, max 10, default 5
- `max_exchanges_per_turn` — Input number, default 3

Staff-only fields (rendered only when `scope === 'bubble'`):
- `minimum_runs_for_insight` — Input number, default 15
- `requires_validation` — Toggle

**4. Framework picker section — below config fields:**
- Section divider
- `"ANALYTICAL FRAMEWORK"` 10px mono uppercase secondary label
- Load via `listFrameworks()`, key `['frameworks']` (no clientId
  segment — server auto-scopes by caller per probe 2026-04-25)
- Compute default: from returned list, pick the one with
  `client_id === null` AND `tier === 'realism'` AND lowest
  `created_at`. If none matches (no platform Realism exists), pick
  the lowest-`created_at` platform framework of any tier. If none at
  all, show empty state: `"No frameworks available. Contact staff."`
- **Note on test data 2026-04-25:** the dev DB contains exactly one
  framework, `"Smoke Test Realism"` (tier `realism`, platform-owned).
  This satisfies the default selection. The displayed name will be
  "Smoke Test Realism" not just "Realism" — the
  `"Using: Realism (platform default)"` hint label uses tier name,
  not framework name, so the hint stays generic. Render the
  framework's actual `name` in the selected-framework display card.
- **Tier enum is server-driven.** Stoplight YAML lists nine tier
  values; only `realism` observed in current dev DB. Don't hardcode
  a tier list in the picker. Render whatever string comes back as
  the tier pill — uppercase + 11px mono per design tokens.
- Selected framework display (read-only on the step body):
  - Primary: framework `name`
  - Small mono secondary: `tier` in uppercase
  - Small secondary: truncated `framework_description` (1 line,
    ellipsis)
  - Default label if auto-selected: `"Using: Realism (platform
    default)"` as a teal-bright 11px mono hint above the card
- `"Change framework"` ghost button → opens FrameworkPickerDrawer

**5. `src/pages/authoring/FrameworkPickerDrawer.jsx` — 480px:**
- Header: "Pick an analytical framework" + close X
- Groupings — render each group only if the items list contains at least
  one matching record (no empty section headings):

  - **"Platform frameworks"** — render if `items.some(f => f.client_id === null)`.
    Items with `client_id === null`.

  - **"Your org's frameworks"** — render if `items.some(f => f.client_id === currentClientId)`.
    Items with `client_id === currentClientId`. Currently empty for every
    org per probe 2026-04-25 — only platform frameworks exist in dev DB.

  - **"Other organizations"** — render if `items.some(f => f.client_id !== null && f.client_id !== currentClientId)`.
    UNVERIFIED whether staff scope returns these (see Edit 10 above for
    context). The conditional renders the group when records appear and
    hides it cleanly when they don't.

  If items list is entirely empty (zero frameworks), the empty state
  copy `"No frameworks available. Contact staff."` from the
  default-selection logic should also apply to the drawer body.
- Each row: `name` (primary), `tier` pill, truncated
  `framework_description`, row is clickable
- The `tier` pill displays the tier string from the API verbatim
  (uppercased). Don't hardcode an enum check — the API may return
  any of nine values per stoplight, but only `realism` is in dev
  DB as of 2026-04-25. Render whatever comes through.
- Selected framework gets a left border accent (`--accent-red` 2px)
- Bottom of list: staff-only `"+ Create framework"` ghost button,
  disabled, with `"Coming soon"` 11px mono amber chip tooltip
  (Phase 2)
- Footer: "Cancel" ghost
- Click a row → update local state, close drawer. Do NOT PATCH
  immediately — the change is sent on the next "Save & next"

**6. Framework-in-use warning:**
- After selecting a framework, check if it's assigned to any other
  ScenarioConfig with `status` in `['validated', 'active']`:
  - **Catalogue claims:**
    `GET /v1/scenario-configs?analytical_framework_id=:id&status=validated`
  - **Live status:** UNVERIFIED. The flat `GET /v1/scenario-configs`
    list endpoint is itself UNVERIFIED in OpenAPI (audit found it
    documented but not present). Probe before wiring:
    ```bash
    curl -H "Authorization: Bearer $TOKEN" \
      "https://warpaths-api.onrender.com/v1/scenario-configs?analytical_framework_id=$FW&status=validated"
    ```
  - **If endpoint exists:** wire as documented.
  - **If endpoint returns 404 / 422:** skip proactive check.
    Rely on 409 at PATCH time as the fallback. Flag the skip in a
    `// TODO` comment dated today.
  - **If endpoint exists but query filter is silently ignored**
    (unfiltered list returned): also skip and rely on 409. Mark TODO.
- If in use: render an inline warning below the framework card:
  - Amber background, subtle border, 14px 16px padding
  - Icon: Lucide AlertTriangle 16px amber
  - Body: `"This framework is in use on validated configs. Edits to
    tenets would silently change live AI behavior. Clone before
    editing."`
  - Staff-only button: `"Clone framework"` primary sm
    - On click: prompt for new name (use a simple Modal with an
      Input, not a browser prompt), default `"{original name}
      (copy)"`
    - `cloneFramework(frameworkId, newName)` → on success, update
      local state to the cloned framework, invalidate
      `['frameworks']`, dismiss warning
- ClientAdmin sees the warning but not the Clone button; instead
  shows: `"Ask staff to clone this framework before editing."`

**7. Config save on "Save & next":**
- First time through (no config exists): `createConfig(scenarioId,
  body)` — body includes `analytical_framework_id` directly
  - On 201: cache-seed `['config', newConfigId]`, invalidate
    `['configs', scenarioId]`, advance
- Subsequent saves: `updateConfig(configId, dirtySubset)` — diff
  against last-saved state, include `analytical_framework_id` only if
  it changed
  - On 200: invalidate `['config', configId]`, advance

**8. Advance gate on Step 3:**
- Disabled until config has `name` AND `analytical_framework_id`
- Tooltip: `"Name the config and pick a framework"`

**9. Loading / error states:**
- While `['configs', scenarioId]` OR `['frameworks']` is
  loading: Skeleton for the form
- On error: Patterns §19 error block

## Out of scope

- Steps 4+ (next sessions)
- Framework creation UI (Phase 2)
- Content seeds (Phase 2)
- `POST /scenario-configs/:id/submit-for-review` (Session 8)

## Acceptance checklist

- [ ] Land on Step 3 for a freshly-published scenario → see blank
      config form with Realism framework auto-selected and the
      "Using: Realism (platform default)" hint
- [ ] Fill name, press Save & next → new config created, advances to
      Step 4 placeholder, reloading page re-loads the same config
- [ ] Change framework via drawer → selection persists after drawer
      close; Save & next PATCHes the config with the new
      `analytical_framework_id`
- [ ] Second visit to Step 3 for the same scenario: loads existing
      draft config, no duplicate created
- [ ] Staff login: `minimum_runs_for_insight` and
      `requires_validation` fields visible; `"+ Create framework"`
      button visible but disabled in Drawer
- [ ] ClientAdmin login: staff fields hidden; no `"+ Create
      framework"` button in Drawer
- [ ] Advance gate blocks until both name and framework are set
- [ ] If no framework is in use on validated configs yet: warning
      does not render
- [ ] `turn_count` input clamps to 3–10
- [ ] `npm run build` succeeds
- [ ] Registry docs updated:
  - `api-surface.md`: `/v1/analytical-frameworks`, `/v1/scenarios/:id/configs`, `/v1/scenario-configs/:id`, `/v1/analytical-frameworks/:id/clone`
  - `response-shapes.md`: AnalyticalFramework list item shape (8 fields, verified 2026-04-25); ScenarioConfig record shape (verified B4 2026-04-24, field list above); add `Last probed:` stamps
  - `query-keys.md`: `['frameworks']` (no clientId since server auto-scopes), `['configs', scenarioId]`, `['config', configId]`, `['framework', frameworkId]`
- [ ] Confirm `analytical_framework_id` field is included in the
      Create body sent to the API (silent-drop check — if mistakenly
      named `framework_id` or `analyticalFrameworkId`, would be
      dropped silently with 201 returned)

## Process

**Before writing code:**

1. Read docs listed in Context.

2. Run live verification probes (browser console, requires session token):

   **Probe A — Confirm config list endpoint shape:**
   ```js
   fetch('https://warpaths-api.onrender.com/v1/scenarios/SCENARIO_ID/configs', {
     headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('warpaths_token') }
   }).then(r => r.json()).then(d => console.log(d));
   ```
   Replace `SCENARIO_ID` with a real scenario you can author against.
   Capture envelope shape and item shape. Compare against B4 probe data
   (top of this prompt).

   **Probe B — Test config create body:**
   Don't actually create — just confirm the catalogue's `Create` body
   shape against OpenAPI:
   ```bash
   grep -A 30 '"CreateScenarioConfigRequest"' ~/dev/api-audit/openapi.json
   ```
   Or fetch the schema in browser console:
   ```js
   fetch('https://warpaths-api.onrender.com/openapi.json')
     .then(r => r.json())
     .then(s => console.log(JSON.stringify(s.components.schemas.CreateScenarioConfigRequest, null, 2)));
   ```
   Confirm field names match the prompt's planned form fields. Flag
   any drift.

   **Probe C — Framework-in-use endpoint:**
   Per Edit 5, run:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "https://warpaths-api.onrender.com/v1/scenario-configs?analytical_framework_id=$FW&status=validated"
   ```
   Use a known framework id (e.g. `b36d2a92-4d9a-4c02-8b63-d928e053ab1c`,
   the Smoke Test Realism, captured 2026-04-25). Document whether
   404 / 422 / 200 with filter applied / 200 with filter ignored.

   **Probe D — Flat config POST status (low priority, optional):**
   ```bash
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"scenario_id": "SCENARIO_ID", "name": "probe", "game_type": "sage_individual", "turn_count": 5, "max_exchanges_per_turn": 3, "analytical_framework_id": "b36d2a92-4d9a-4c02-8b63-d928e053ab1c"}' \
     "https://warpaths-api.onrender.com/v1/scenario-configs"
   ```
   Document whether 404 / 405 / 201 / 422 / something else. Either
   way, USE THE NESTED PATH for actual config creation. This probe
   is informational only — confirms whether the flat path exists.
   If 201, archive the created config (post probe in cleanup):
   ```bash
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     "https://warpaths-api.onrender.com/v1/scenario-configs/$NEW_CONFIG_ID/archive"
   ```

3. Summarize probe results + plan. Wait for "go" before writing code.

**While building:**
- Nested path for create: `POST /v1/scenarios/:scenario_id/configs`.
  This is non-negotiable — the flat path is not built.
- Framework default is computed client-side — don't assume the API
  returns a "default" flag
- Staff-field hiding is strict — use the scope check, not a feature
  flag
- The framework-in-use check is best-effort. If the query filter
  isn't supported, the 409 path at PATCH time is the fallback —
  handle it gracefully (Toast error, revert local selection to the
  previously-saved framework)
- Do not implement framework creation — the button is intentionally
  disabled for Phase 1

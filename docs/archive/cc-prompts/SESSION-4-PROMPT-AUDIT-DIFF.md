# CC Prompt — Session 4 Audit-Aware Diff

## Background

Update `~/dev/warpaths-frontend/docs/cc-prompts/SESSION-04-config-framework.md` (or wherever the original Session 4 prompt lives) per audit + probe findings. Apply the edits below as a precise diff.

The original prompt was written pre-audit. Most of it is correct against current truth. Five real audit-driven changes plus two minor clarifications.

**Probe data captured 2026-04-25:**
- `GET /v1/analytical-frameworks` envelope: `{items: [...]}` ✓
- Item shape: `{id, client_id, tier, name, framework_description, framework_tenets, created_at, updated_at}` — eight fields
- Server auto-scopes to platform + caller's client_id (single client_id observed in result was `null`)
- Currently only one framework in the DB: `Smoke Test Realism` (tier `realism`, platform-owned)

## File to edit

`~/dev/warpaths-frontend/docs/cc-prompts/SESSION-04-config-framework.md`

## Edits

Apply in order. Each is a precise before/after.

---

### Edit 1 — Add audit-aware preamble at top

**Find** the opening `## Context — read before writing code` line.

**Insert IMMEDIATELY ABOVE it:**

```
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
```

---

### Edit 2 — Update spec reference

**Find:**

```
7. `~/dev/warpaths-frontend/docs/pages/AuthoringPage.md`
   — focus on "State 2 Step 3 — Config setup" and the
   "Framework clone guard" subsection
```

**Replace with:**

```
7. `~/dev/warpaths-frontend/docs/pages/AuthoringPage.md`
   — focus on:
   - "State 2 Step 3 — Config setup"
   - "Framework clone guard" subsection
   - "API Behavior Notes" section (added during audit)
   - Step 6 (Scoring) note about EvaluationCriteria envelope
     `{items, meta: {weight_sum}}` — informs that other endpoints
     can have non-standard envelopes
```

---

### Edit 3 — Tighten `framework.js` listFrameworks contract

**Find** the `**2. `src/api/framework.js`** section, specifically:

```
- `listFrameworks()` — `GET /v1/analytical-frameworks`. Server
  auto-scopes by caller (platform + caller's client_id).
- `getFramework(id)` — `GET /v1/analytical-frameworks/:id`
- `cloneFramework(id, name)` —
  `POST /v1/analytical-frameworks/:id/clone` with `{ name }`
```

**Replace with:**

```
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
```

---

### Edit 4 — Update the framework default selection logic

**Find** in deliverable 4 (Framework picker section):

```
- Compute default: from returned list, pick the one with
  `client_id === null` AND `tier === 'realism'` AND lowest
  `created_at`. If none matches (no platform Realism exists), pick
  the lowest-`created_at` platform framework of any tier. If none at
  all, show empty state: `"No frameworks available. Contact staff."`
```

**Replace with:**

```
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
```

---

### Edit 5 — Update framework-in-use warning section

**Find** in deliverable 6 (Framework-in-use warning):

```
- After selecting a framework, check if it's assigned to any other
  ScenarioConfig with `status` in `['validated', 'active']`:
  - Try: `GET /v1/scenario-configs?analytical_framework_id=:id&status=validated`
  - If the query-param filter is not supported (404 / 422 / ignored),
    skip the proactive check and rely on 409 at PATCH time instead.
    Flag the skip in a `// TODO` comment with today's date.
```

**Replace with:**

```
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
```

---

### Edit 6 — Tier values documentation note

**Find** in deliverable 5 (FrameworkPickerDrawer):

```
- Each row: `name` (primary), `tier` pill, truncated
  `framework_description`, row is clickable
```

**Replace with:**

```
- Each row: `name` (primary), `tier` pill, truncated
  `framework_description`, row is clickable
- The `tier` pill displays the tier string from the API verbatim
  (uppercased). Don't hardcode an enum check — the API may return
  any of nine values per stoplight, but only `realism` is in dev
  DB as of 2026-04-25. Render whatever comes through.
```

---

### Edit 7 — Pre-build verification step

**Find** the end of the prompt — the `## Process` section:

```
**Before writing code:** read docs, summarize, wait for "go".
```

**Replace with:**

```
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

3. Summarize probe results + plan. Wait for "go" before writing code.
```

---

### Edit 8 — Add registry update reminder

**Find** at the bottom (before the existing `## Process` section):

```
- [ ] Registry docs updated
```

**Replace with:**

```
- [ ] Registry docs updated:
  - `api-surface.md`: `/v1/analytical-frameworks`, `/v1/scenarios/:id/configs`, `/v1/scenario-configs/:id`, `/v1/analytical-frameworks/:id/clone`
  - `response-shapes.md`: AnalyticalFramework list item shape (8 fields, verified 2026-04-25); ScenarioConfig record shape (verified B4 2026-04-24, field list above); add `Last probed:` stamps
  - `query-keys.md`: `['frameworks']` (no clientId since server auto-scopes), `['configs', scenarioId]`, `['config', configId]`, `['framework', frameworkId]`
- [ ] Confirm `analytical_framework_id` field is included in the
      Create body sent to the API (silent-drop check — if mistakenly
      named `framework_id` or `analyticalFrameworkId`, would be
      dropped silently with 201 returned)
```

---

## Acceptance

- [ ] Edits 1–8 applied to `SESSION-04-config-framework.md`
- [ ] No source code modified — only the prompt file
- [ ] After applying edits, re-read the prompt end-to-end and report
      any remaining contradictions or gaps that the audit should
      have caught
- [ ] Show diff (or grep for key audit terms like `silent-drop`,
      `verified`, `Last probed`) to confirm the changes landed

## Process

Apply edits one at a time. After Edit 8 completes:

1. Run a grep for terms that should now appear:
   ```bash
   grep -ni "silent-drop\|verified 2026-04\|response_model\|UNVERIFIED" docs/cc-prompts/SESSION-04-config-framework.md
   ```
   Should return at least 8 matches.

2. Report a summary of edits applied + any remaining concerns.

3. Do NOT commit. Wait for human review.

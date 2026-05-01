# CC Prompt — Session 5a: Step 4 Tension
## Audit-revised 2026-04-28 (was: pre-audit draft)

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
   — "State 2 Step 4 — Tension" section

**Build plan:**
8. `~/dev/warpaths-frontend/docs/build-plans/AuthoringPage-BuildOrder.md`
   — Session 5a section + the "CRITICAL — Audit-driven prompt
   revision required" section at the top

**API contract — authority order is OpenAPI > live probe > catalogue > spec:**
9. `~/dev/warpaths-api/openapi.json` (live; fetch fresh) — request
   schemas are authoritative, response schemas mostly aren't declared
10. `~/dev/warpaths-api/docs/api/04_tension_indicator.md` — hint for
    field list and endpoint paths; verify against OpenAPI
11. `~/dev/warpaths-api/docs/curls.md` — secondary path reference

**ReportExtraction shape — for pre-fill:**
12. `~/dev/warpaths-api/docs/api/19_report_extraction.md` AND
    `~/dev/warpaths-api/schemas/v2/report_extraction_schema.yaml` —
    both are hints; the actual `re.tension_suggestion` keys must be
    verified by probing a real extraction record

**Audit references:**
13. `~/dev/api-audit/deliverables/DRIFT-REPORT.md`
14. `~/dev/api-audit/deliverables/PROBE-RESULTS-BATCH1.md` — check
    whether TensionIndicator endpoints are already probed; if so,
    use those stamps; if not, this session adds them
15. `~/dev/api-audit/deliverables/LIVE-PROBE-BATCH.md` — queue of
    unverified endpoints

**Frontend registries:**
16. `~/dev/warpaths-frontend/docs/api-surface.md`
17. `~/dev/warpaths-frontend/docs/response-shapes.md` — entries
    >90 days re-probe before relying
18. `~/dev/warpaths-frontend/docs/query-keys.md`

## Authority hierarchy — non-negotiable

The previous draft of this prompt said "Catalogue wins. Always."
**That was wrong.** The April 2026 API audit found systemic drift
between catalogue, Stoplight YAMLs, OpenAPI, and live behavior.

**Correct authority order:**
1. **Live API behavior** (probe results)
2. **OpenAPI** (`openapi.json`) — request schemas are authoritative
3. **Catalogue** (`docs/api/04_tension_indicator.md`) — hint, may drift
4. **Page spec** (`AuthoringPage.md`) — UX intent, not API truth

When sources disagree: probe. Never resolve by picking the
"more recent-looking" doc.

## Pre-build verification — DO THIS BEFORE WRITING CODE

This session opens with verification, not implementation. Do NOT
write form code until after the human OKs the verification report.

### Step PV-1: OpenAPI request schemas

From `openapi.json` (fresh fetch from
`https://warpaths-api.onrender.com/openapi.json`), extract and report:

- `CreateTensionIndicatorRequest`:
  - Full property list (names, types)
  - `required: [...]` array
  - Any enum constraints (esp. on `starting_level` or equivalent)
- `PatchTensionIndicatorRequest`:
  - Full property list
  - Diff against Create — flag any field in Create but not Patch
    (those are immutable post-create; UI must render them disabled
    on re-edit, per Session 4's `game_type`/`turn_count` pattern)
- The TensionIndicator endpoint paths under `/v1/scenario-configs/`:
  - GET path
  - POST path
  - PATCH path
  - Whether the resource is singular (one per config, e.g.
    `/tension-indicator`) or a collection (`/tension-indicators`)

If `CreateTensionIndicatorRequest` is missing from OpenAPI, STOP and
report — that means the endpoint is planned-not-built, which would
block this session entirely.

### Step PV-2: Catalogue vs OpenAPI diff

Read `04_tension_indicator.md`. For each field listed there:
- Is it in OpenAPI's CreateTensionIndicatorRequest? (yes/no)
- Same name? (yes/no — silent-drop risk if no)
- Same enum values? (yes/no)

Report any drift. Do not "reconcile" — report only. OpenAPI wins.

### Step PV-3: ReportExtraction.tension_suggestion shape

Probe a live extraction record that has a tension_suggestion
populated. Use the test account in CHAT-HANDOFF.md. Run:

```js
// in browser console after login
fetch('https://warpaths-api.onrender.com/v1/clients/ad412b27-deca-425b-be66-86e4638fe6e9/extractions', {
  headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('warpaths_token') }
}).then(r => r.json()).then(d => {
  const withTension = d.items?.find(e => e.tension_suggestion);
  console.log(JSON.stringify(withTension?.tension_suggestion, null, 2));
});
```

Report the actual key names in `tension_suggestion`. The original
prompt assumed `{name, definition, suggested_starting_level, rationale}` —
verify each. If a real extraction with tension_suggestion can't be
found in the test account's data, flag it; pre-fill is conditional
anyway and we can build the form without it but should not ship
the pre-fill mapping unverified.

### Step PV-4: Existing TensionIndicator probe (optional but recommended)

If a TensionIndicator already exists on any config in the test
account, GET it and report the actual response shape (single
resource — should NOT be enveloped, but verify). If none exists,
note that and we'll stamp response-shapes.md after the first POST
during build.

### PV report format

After PV-1 through PV-4, post a single message with:
- OpenAPI request field lists (Create + Patch + diff)
- Catalogue drift table
- tension_suggestion actual shape
- GET response shape (or "deferred — no record exists yet")
- A proposed final field list and pre-fill mapping based on the
  above
- Any blockers

Wait for "go" before writing code.

## Scope for this session (post-PV)

Build Step 4's TensionIndicator form. One record per ScenarioConfig.
Pre-fill from extraction when available.

## Deliverables

**1. `src/api/scenarioChildren.js` — new module:**
- `getTensionIndicator(configId)` — path verified in PV-1
- `createTensionIndicator(configId, body)` — path verified in PV-1
- `updateTensionIndicator(configId, body)` — path verified in PV-1

Module convention: this file is the home for all per-config
sub-object API functions across Sessions 5a–5d. Structure it so
later sessions can extend it cleanly (one section per object).

**2. Step 4 form — `Step4Tension.jsx` full replacement:**
- Load existing TensionIndicator via TanStack Query key
  `['tension', configId]` on mount
- If 404 / not found, render blank form
- Fields per the PV-verified OpenAPI schema (NOT the draft prompt's
  guessed list, NOT the catalogue's list if it diverged)
- Each field uses the matching component from
  `~/dev/warpaths-frontend/docs/components.md`:
  - String fields → Input
  - Long string fields → Textarea, 3 rows
  - Enum fields → Select (the values come from OpenAPI's enum array)
- Fields that exist in Create but not Patch render disabled on
  re-edit with "Fixed at create" hint (Session 4 pattern)

**3. Silent-drop guard:**
- Form's POST/PATCH body MUST contain ONLY fields present in the
  OpenAPI request schema. Any field in the catalogue but absent from
  OpenAPI is silently dropped if sent — do not send.
- If the form has UI for a field that ends up not being in OpenAPI
  (e.g., catalogue claims a field that doesn't actually exist),
  remove that field from the UI; add a BACKLOG.md entry flagging
  the catalogue drift.

**4. Extraction pre-fill — one-shot on first load only:**
- If no TensionIndicator exists yet AND the parent Scenario has
  `source_extraction_id`:
  - Fetch extraction via `getReportExtraction(sourceExtractionId)`
  - Pre-populate form state from `re.tension_suggestion` using the
    PV-3-verified key mapping
- Pre-fill is local form state only — nothing is POSTed until the
  user clicks Save & next
- One-shot: never re-seed on re-render. Use a ref or
  `seededRef.current` flag so React strict-mode double-mounts don't
  re-trigger. (Session 3 had a similar pattern for actor pre-fill.)
- If TensionIndicator already exists: load from API, no pre-fill
  logic runs

**5. Save on "Save & next":**
- First save (no record exists): `createTensionIndicator(configId, body)`
  - Cache-seed the `['tension', configId]` query with the response
  - Advance to Step 5
- Subsequent saves: `updateTensionIndicator(configId, dirtySubset)`
  - Invalidate the query
  - Advance

**6. Advance gate:**
- Required fields = OpenAPI's `required: [...]` array (verified in PV-1)
- Save & next disabled when any required field is empty
- Disabled button shows tooltip: "Complete required fields to continue"

**7. Response shape stamping:**
- After the first successful POST in this session, capture the
  response body shape and add it to
  `~/dev/warpaths-frontend/docs/response-shapes.md` with a
  `Last probed: 2026-04-28` stamp.
- If GET was probed in PV-4, stamp that too.

**8. Registry doc updates:**
- `docs/api-surface.md` — add the three new functions
- `docs/query-keys.md` — add `['tension', configId]`
- `docs/response-shapes.md` — see deliverable 7

## Out of scope

- Everything outside Step 4
- Any other sub-object module functions (5b/5c/5d add their own)

## Test data hygiene

Per CHAT-HANDOFF.md: probe sessions and direct API verification can
leak DB records into normal app flow. Three false-positive bug
investigations have happened from leftover test data.

- Track every record ID created during PV and during build
- Report all created IDs at session close so the human can decide
  whether to leave or clean up
- Do NOT auto-delete (DELETE returns 405 for most resources anyway;
  use archive where applicable)

## Acceptance checklist

- [ ] PV report posted, verified by human, "go" received
- [ ] Step 4 renders with blank fields for a config with no existing
      TensionIndicator
- [ ] If Scenario has `source_extraction_id` and the extraction's
      `tension_suggestion` is non-null, fields pre-fill on first
      mount only (verified via React strict-mode double-mount test:
      pre-fill does NOT re-trigger on remount)
- [ ] Fill required fields, Save & next → POST succeeds, response
      shape stamped in response-shapes.md, advances to Step 5
      placeholder
- [ ] Re-enter Step 4 → existing values load via GET, no duplicate
      record created on save
- [ ] Edit a field, Save & next → PATCH fires with the dirty subset
      only (verify via Network tab — body should contain only
      changed fields, not the whole form)
- [ ] Any Create-only fields render disabled on re-edit
- [ ] Advance gate blocks when required fields empty
- [ ] Form body sends ONLY OpenAPI-documented fields (silent-drop
      guard verified)
- [ ] `npm run build` succeeds
- [ ] `docs/api-surface.md`, `docs/query-keys.md`,
      `docs/response-shapes.md` all updated
- [ ] Created IDs reported at session close

## Process

**Phase 1 — Verification (no code):**
1. Read all docs in the Context section
2. Run PV-1 through PV-4
3. Post PV report
4. Wait for "go"

**Phase 2 — Build:**
- OpenAPI wins. Always. Catalogue is a hint.
- Pre-fill is one-shot; never re-seed on re-render
- Send ONLY OpenAPI-documented fields in POST/PATCH bodies
- Do not touch Step 5 or any other step
- Stamp response-shapes.md after first POST

**Phase 3 — Close:**
- Update registries
- Report created IDs
- Confirm acceptance checklist

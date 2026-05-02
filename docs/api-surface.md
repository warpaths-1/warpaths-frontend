# API Surface

Every API endpoint the frontend calls, organized by domain file in `src/api/`.

For each endpoint: HTTP method + path, the API function, which page(s) call it, and the response fields each page depends on.

Page status (April 2026):
- **Built:** `LoginPage`, `ExtractionPage`
- **In progress:** `AuthoringPage` — Steps 1–5 complete, Step 6 next
- **Stubs** (return `null`, no API calls yet): `AccountPage`, `GamePage`, `LeaderboardPage`, `OrgManagementPage`, `SignupPage`

"(unused)" below means the API function exists but no built page calls it yet. Those are waiting on the stub pages.

---

## auth.js

### POST `/auth/login` — `login(data)`
- **Body:** `{ email, password, client_id }`
- **Used by:** `LoginPage`
- **Response fields used:**
  - `access_token` — stored in `sessionStorage.warpaths_token`. Payload decoded client-side for `sub`, `client_id`, `scope`.

### POST `/auth/register` — `register(data)`
- (unused — `SignupPage` is a stub)

### POST `/auth/change-password` — `changePassword(data)`
- (unused — `AccountPage` is a stub)

---

## client.js

Axios instance only — no endpoints. Attaches `Authorization: Bearer <token>` from `sessionStorage.warpaths_token` and redirects to `/login` on 401 for non-`/auth/` responses.

---

## extraction.js

### POST `/v1/report-extractions/ingest` — `ingestReport(file)`
- **Body:** `multipart/form-data` with `file` (PDF)
- **Used by:** `ExtractionPage`
- **Response fields used:** `id`, `is_duplicate` (triggers toast). Rest of payload is cached under `['extraction', id]` and consumed as a `ReportExtraction` (see next endpoint).
- **Error status codes handled:** `413` (file too large), `422` (bad PDF), other → `error.response.data.detail`.

### GET `/v1/report-extractions/:id` — `getReportExtraction(id)`
- **Used by:** `ExtractionPage`, `AuthoringPage` (two distinct uses):
  1. Picker fetch — full RE loaded before the Scenario POST body is built; seeds `['extraction', id]`
  2. Step 2 MappingCallout — fetched on Step 2 mount when `scenario.source_extraction_id` is non-null, matched by actor index to surface `capabilities_overview` in the ActorEditor. Uses the same `['extraction', id]` key — no duplicate fetch if already cached from the picker.
- **Response fields used:**
  - `report_extraction_id` (as `id`)
  - `extraction_status` (rendered in `Badge`)
  - `confidence_score` (0–1, rendered in `ConfidenceMeter`)
  - `extraction_notes`
  - `source_filename`
  - `pdf_fingerprint` (first 16 chars shown)
  - `created_at`
  - `report_brief.report_title`
  - `report_brief.publication`
  - `report_brief.summary`
  - `report_brief.why_this_game`
  - `scenario_suggestion.scenario_narrative`
  - `scenario_suggestion.strategic_domain_tags[]`
  - `scenario_suggestion.suggested_turn_count`
  - `actor_suggestions[].name`
  - `actor_suggestions[].role`
  - `actor_suggestions[].objectives[]` (mapped → `goal_items[]` at priority 2)
  - `actor_suggestions[].current_posture`
  - `actor_suggestions[].is_visible_to_player`
  - `actor_suggestions[].relationships_overview`
  - `actor_suggestions[].capabilities_overview` (surfaced via MappingCallout — not written to actor fields)
  - `inject_seeds[].seed_text`
  - `inject_seeds[].turn_suggestion`
  - `inject_seeds.length` (toast when 1 ≤ n < 5)
- **Error status codes handled:** `404` (not found) → special error copy.

### GET `/v1/clients/:clientId/extractions` — `getClientExtractions(clientId, params)`
- **Query params:** `tag_id` (optional, for filter)
- **Used by:** `ExtractionPage` (left master list, ClientAdmin only); `AuthoringPage` (extraction picker drawer — no `tag_id`, sorts client-side by `extracted_at`)
- **Response shape:** array of `ClientExtraction` summaries
- **Response fields used per row:**
  - `id`
  - `display_name` (falls back to `report_title`)
  - `report_title`
  - `extracted_at` (rendered as localized date)
  - `extraction_status` (badge shown only when `failed` or `pending`)
  - `scenario_ids[]` (presence → "Scenario created" marker)
  - `tags[].id`, `tags[].name`
  - `report_extraction_id` (used to match selection against `currentReId`)

### GET `/v1/clients/:clientId/extractions/:id` — `getClientExtraction(clientId, id)`
- **Used by:** `ExtractionPage` (loaded when a row is selected)
- **Response fields used:**
  - `id`
  - `display_name` (editable inline)
  - `notes` (synced into the notes textarea / drawer)
  - `tags[].id`, `tags[].name`
  - `scenario_ids[]` (presence disables delete, shows "Scenario created" link)

### PATCH `/v1/clients/:clientId/extractions/:id` — `patchClientExtraction(clientId, id, data)`
- **Body:** partial — `{ display_name }` or `{ notes }`
- **Used by:** `ExtractionPage` (inline name edit, notes autosave)
- **Response fields used:** full updated `ClientExtraction` — written directly into `['clientExtraction', clientId, updated.id]` cache.

### DELETE `/v1/clients/:clientId/extractions/:id` — `deleteClientExtraction(clientId, id)`
- **Used by:** `ExtractionPage` (delete modal, disabled when `scenario_ids[]` non-empty)
- **Response fields used:** none — invalidates `['extractions', clientId]`.

### POST `/v1/clients/:clientId/extractions/:extractionId/tags` — `applyTag(clientId, extractionId, tagId)`
- **Body:** `{ tag_id }`
- **Used by:** `ExtractionPage`
- **Response fields used:** none — invalidates `['clientExtraction', …]` and `['extractions', …]`.

### DELETE `/v1/clients/:clientId/extractions/:extractionId/tags/:tagId` — `removeTag(clientId, extractionId, tagId)`
- **Used by:** `ExtractionPage`
- **Response fields used:** none — invalidates the same two keys as `applyTag`.

### GET `/v1/clients/:clientId/tags` — `getClientTags(clientId)`
- **Used by:** `ExtractionPage` (lazy — only once the tag dropdown is opened; drives the left-column filter chips too); `AuthoringPage` ExtractionPickerDrawer (tag filter chip row above the list — multi-select AND, client-side filter). Shared `['tags', clientId]` cache across pages.
- **Response shape:** array of `ClientTag`
- **Response fields used per row:** `id`, `name`.

### POST `/v1/clients/:clientId/tags` — `createClientTag(clientId, data)`
- **Body:** `{ name }`
- **Used by:** `ExtractionPage` ("Create …" option in tag dropdown)
- **Response fields used:** `id` — immediately chained into `applyTag`.

### GET `/v1/clients/:clientId` — `getClient(clientId)`
- **Used by:** `ExtractionPage` (quota display on the upload panel and in Extraction Details)
- **Response fields used:**
  - `custom_reports_limit` (preferred)
  - `plan_reports_limit` (fallback)
  - `reports_used_this_period`
- Also expected (per CLAUDE.md `Header`): `logo_url`, display name. Header reads from auth/user context, not this query.

---

## game.js

All functions exist but `GamePage` is a stub — none are wired to a page yet.

| Method | Path | Function | Used by |
|---|---|---|---|
| GET | `/v1/games/:id` | `getGame` | (unused) |
| GET | `/v1/games/:gameId/content-items` | `getContentItems` | (unused) |
| POST | `/v1/games/:gameId/advisor` | `consultAdvisor` | (unused) |
| POST | `/v1/games/:gameId/actions` | `submitAction` | (unused) |
| GET | `/v1/games/:gameId/eval` | `getEval` | (unused) |

---

## leaderboard.js

| Method | Path | Function | Used by |
|---|---|---|---|
| GET | `/v1/leaderboard` | `getLeaderboard` | (unused — `LeaderboardPage` is a stub) |
| GET | `/v1/games?status=complete&limit=10` | `getRecentGames` | (unused) |

---

## scenario.js

### GET `/v1/scenarios` — `listScenarios(params)`
- **Live response shape:** `{ items: Scenario[] }`. The catalogue at
  `warpaths-api/docs/api/02_scenario.md` documents this as a bare array —
  that is drift (see `docs/response-shapes.md` §4). The frontend function
  unwraps `.items` so consumers receive a plain array.
- **Used by:** `AuthoringPage` ExtractionPickerDrawer — called inside the
  row-click mutation with `{ source_extraction_id }` to check whether a
  Scenario already exists for the picked extraction. Length-0 → POST
  (create). Length ≥1 → resume: seed `['scenario', item.id]` cache and
  navigate. Enforces the product rule that a ReportExtraction has at
  most one Scenario.
- **Filter params supported:** `source_extraction_id`, `status`,
  `client_id` (staff only), `category`.

### GET `/v1/scenarios/:id` — `getScenario(id)`
- **Used by:** `AuthoringPage` (loads the scenario record on `/author/:scenario_id` into `['scenario', scenarioId]`)
- **Response fields used (Session 2 — Step 1 Framing):**
  - `id`
  - `title`, `category`, `subcategory`, `scenario_narrative`
  - `setting`
  - `time_horizon.planning_horizon`, `time_horizon.incident_horizon`, `time_horizon.notes`
  - `tier_minimum`
  - `availability_window_days`
- **Error status codes handled:** `404` / `403` → "Scenario not found" state; other → generic "Could not load scenario".

### POST `/v1/scenarios` — `createScenario(body)`
- **Body (creation mode / deferred blank):** `{ source_extraction_id: null, title: form.title || "Untitled scenario" }` plus any other filled Step 1 fields (`category`, `subcategory`, `scenario_narrative`, `setting`, `time_horizon`, `tier_minimum`, `availability_window_days`). Fires on the first save at `/author/new` — never on the Blank tile click itself. Deferring eliminates orphan records when users cancel before saving.
- **Body (From extraction):** `{ source_extraction_id, title, category, subcategory, scenario_narrative, setting, time_horizon, actors[] }`. The `actors[]` array is mapped from `actor_suggestions[]` per the Session 3 spec mapping table — name, role, current_posture, relationships_overview, is_visible_to_player, goal_items (from objectives[] at priority 2). behavior/history/constraints are empty strings (author-written).
- **Used by:** `AuthoringPage` (Step 1 first-save in creation mode + extraction picker row click)
- **Response fields used:** `id` — used for `setQueryData(['scenario', id], …)` and `navigate('/author/:id', { replace: true })`.

### PATCH `/v1/scenarios/:id` — `updateScenario(id, body)`
- **Body (Step 1):** partial — only dirty framing fields. Nested `time_horizon` sent as a full object whenever any sub-field changed.
- **Body (Step 2):** `{ actors: [...fullArray] }` — replaces the actors array in full on every add, edit, or remove. Never sends a partial diff. Optimistic update: cache is set immediately, rolled back on error.
- **Used by:** `AuthoringPage` (Step 1 "Save & next"; Step 2 actor add/edit/remove)
- **Response fields used:** full updated Scenario — written straight into `['scenario', scenarioId]` cache.
- **Error status codes handled (Step 1):** `422` → FastAPI `detail[]` mapped back onto per-field inline errors, including nested `time_horizon.*` paths; falls back to `_general` error banner for unknown fields.
- **Error status codes handled (Step 2):** actor PATCH errors trigger toast + optimistic rollback.

### POST `/v1/scenarios/:id/publish` — `publishScenario(id)`
- **Used by:** `AuthoringPage` (Step 2 implicit publish on advance to Step 3 — fires silently when scenario is `draft` and title + narrative + category + subcategory + ≥3 actors are all present)
- **Response fields used:** full updated Scenario with `status: 'published'` — written into `['scenario', scenarioId]` cache. The teal-bright `"● Scenario in progress"` status line renders whenever any Scenario record (draft or published) is loaded; it does not change label on publish.
- **Error status codes handled:** `422` with Step 1 field errors → banner in Step 2 with "Return to Step 1" link that calls `onStepChange(1)`. Other 422 errors → inline error banner in Step 2.

### POST `/v1/scenarios/:id/archive` — `archiveScenario(id)`
- (unused — wiring lands in a later session)

### DELETE `/v1/scenarios/:id` — `deleteScenario(id)`
- (unused — wiring lands in a later session)

---

## scenarioConfig.js

### GET `/v1/scenarios/:scenario_id/configs` — `getConfigsForScenario(scenarioId)`
- **Live response shape:** `{ items: ScenarioConfig[] }` (verified 2026-04-26). Unwrapped inside the function.
- **Used by:** `AuthoringPage` (Step 3 — `['configs', scenarioId]`) to find an existing `status === 'draft'` config to resume.
- **Response fields used per row:** `id`, `status`, `created_at`, plus the full record (loaded into the form via `fromConfig` — see Step 3 mapping below).

### POST `/v1/scenarios/:scenario_id/configs` — `createConfig(scenarioId, body)`
- **Body (CreateScenarioConfigRequest, verified against openapi.json 2026-04-26):**
  - Required: `name`, `turn_count` (3–10).
  - Optional: `source_extraction_id`, `analytical_framework_id`, `description`, `game_type` (enum: `sage_individual` | `org_facilitated`), `requires_validation` (default `true`), `max_exchanges_per_turn`, `minimum_runs_for_insight` (default `15`), `released_through_turn` (default `1`).
  - **Nested path is non-negotiable** — flat `POST /v1/scenario-configs` returns `404` (probed 2026-04-26).
- **Used by:** `AuthoringPage` (Step 3 first save).
- **Response fields used:** full `ScenarioConfig` — seeded into `['config', id]` and cache `['configs', scenarioId]` invalidated.
- **Silent-drop check:** body uses `analytical_framework_id` (not `framework_id` / `analyticalFrameworkId`) so the FK is preserved across the create.

### GET `/v1/scenario-configs/:configId` — `getConfig(configId)`
- (unused by built pages — registered on the API surface for future direct loads.)

### PATCH `/v1/scenario-configs/:configId` — `updateConfig(configId, body)`
- **Body (PatchScenarioConfigRequest, verified 2026-04-26):** any subset of `name`, `description`, `analytical_framework_id`, `requires_validation`, `max_exchanges_per_turn`, `minimum_runs_for_insight`, `released_through_turn`.
- **Does NOT accept** `game_type` or `turn_count` — those are immutable after create. Step 3 renders them disabled on return visits with the helper hint `"Fixed at create"`.
- **Used by:** `AuthoringPage` (Step 3 subsequent saves — diff over the allowed fields).
- **Response fields used:** full updated `ScenarioConfig` — written into `['config', configId]`; `['configs', scenarioId]` invalidated.
- **Error handling:** 409 → toast `"Framework is in use on validated configs. Reverting selection."` and revert local `analytical_framework_id` to last-saved. (Until the proactive `GET /v1/scenario-configs?analytical_framework_id=…&status=validated` filter exists — currently 404 — this is the only check for framework-in-use conflicts.)

### POST `/v1/scenario-configs/:configId/submit-for-review` — `submitConfigForReview(configId)`
- (unused — wired in Session 8.)

---

## scenarioChildren.js

Per-config sub-object API functions. One section per child object.

### GET `/v1/scenario-configs/:config_id/tension-indicator` — `getTensionIndicator(configId)`
- **Live response shape:** Single TensionIndicator record. Stamped in `docs/response-shapes.md` (see §8). Returns 404 if no record exists yet — Step 4 catches and treats as "no record".
- **Used by:** `AuthoringPage` (Step 4 — `['tension', configId]`).
- **Response fields used:** full record loaded into the form via `fromTension`.

### POST `/v1/scenario-configs/:config_id/tension-indicator` — `createTensionIndicator(configId, body)`
- **Body (CreateTensionIndicatorRequest, verified against openapi.json 2026-04-28):**
  - Required: `name`, `description`, `initial_value` (integer 1–7), `scale_1_label` … `scale_7_label`.
  - Optional: `image_url` (nullable string).
  - **Constraint:** Returns `409 Conflict` if a TensionIndicator already exists for this config — UI uses PATCH after first create.
- **Used by:** `AuthoringPage` (Step 4 first save).
- **Response fields used:** full TensionIndicator record — seeded into `['tension', configId]` cache.
- **Silent-drop check:** body uses `description` (not `definition`) and `initial_value` (not `suggested_starting_level`). Pre-fill from `re.tension_suggestion` translates names explicitly — see Step 4 mapping.

### PATCH `/v1/scenario-configs/:config_id/tension-indicator` — `updateTensionIndicator(configId, body)`
- **Body (PatchTensionIndicatorRequest, verified 2026-04-28):** any subset of the Create fields. Fully permissive — no Create-only/immutable fields.
- **Used by:** `AuthoringPage` (Step 4 subsequent saves — diff over all form fields).
- **Response fields used:** full updated TensionIndicator record — written into `['tension', configId]` cache.
- **Constraint:** Blocked if parent ScenarioConfig is `validated` or `retired` (per catalogue — not yet probed).

### GET `/v1/scenario-configs/:config_id/turn1-template` — `getTurn1Template(configId)`
- **Live response shape:** Single Turn1Template record. OpenAPI declares 200 + 422 only; the route returns 404 when no record exists (matches the tension-indicator pattern). The frontend treats 404 as "doesn't exist" → caller catches and resolves to `null`.
- **Used by:** `AuthoringPage` (Step 5 — `['turn1-template', configId]`). Used as an existence probe only: when a Turn1Template exists for the config, Step 5 locks `dimension_key` re-derivation (display_name renames preserve the existing key).
- **Response fields used:** none consumed by Step 5; only the existence flag (`data != null`) drives the lock.

### POST `/v1/scenario-configs/:configId/approve` — `approveConfig(configId)`
- (unused — wired in Session 8, staff-only.)

### POST `/v1/scenario-configs/:configId/reject` — `rejectConfig(configId)`
- (unused — wired in Session 8, staff-only.)

### GET `/v1/scenario-configs/:config_id/dimension-definitions` — `listDimensions(configId)`
- **Live response shape:** `{ items: DimensionDefinition[] }` (verified 2026-04-30). Unwrapped inside the function — consumers receive a plain array.
- **Used by:** `AuthoringPage` (Step 5 — `['dimensions', configId]`).
- **Response fields used per row:** `id`, `scenario_config_id`, `framework`, `dimension_key`, `display_name`, `definition_prose`, `update_guidance`, `initial_value`, `display_order`. `created_at` / `updated_at` not surfaced. List sorted client-side by `display_order` ascending.

### POST `/v1/scenario-configs/:config_id/dimension-definitions` — `createDimension(configId, body)`
- **Body (CreateDimensionDefinitionRequest, verified against openapi.json 2026-04-30):**
  - Required: `framework` (enum: `pmesii` | `pmesii_pt` | `pestel` | `custom`), `dimension_key` (string), `display_name` (string), `definition_prose` (string), `initial_value` (integer 1–5), `display_order` (integer).
  - Optional: `update_guidance` (nullable string).
- **Used by:** `AuthoringPage` (Step 5 per-row first save).
- **Response fields used:** full record — appended to `['dimensions', configId]` cache.
- **Silent-drop check:** body sends only the seven OpenAPI fields. Notably **NO** `weight` (does not exist on DimensionDefinition — that's EvaluationCriteria territory).

### GET `/v1/dimension-definitions/:definition_id` — `getDimension(dimensionId)`
- (unused by built pages — registered for future direct loads. Flat path; not nested under config.)

### PATCH `/v1/dimension-definitions/:definition_id` — `updateDimension(dimensionId, body)`
- **Body (PatchDimensionDefinitionRequest, verified 2026-04-30):** any subset of `framework`, `dimension_key`, `display_name`, `definition_prose`, `initial_value`, `display_order`, `update_guidance`. Fully permissive — no Create-only fields.
- **Path is flat** (`/v1/dimension-definitions/:id`), not nested under config. Same asymmetry as `getDimension` / `deleteDimension`.
- **Used by:** `AuthoringPage` (Step 5 per-row dirty-subset save and framework-change soft-lock loop).
- **Response fields used:** full updated record — replaced by id in `['dimensions', configId]` cache.

### DELETE `/v1/dimension-definitions/:definition_id` — `deleteDimension(dimensionId)`
- **Path is flat.**
- **Used by:** `AuthoringPage` (Step 5 trash icon — inline confirmation, not a modal).
- **Response:** invalidates row in `['dimensions', configId]` cache by id filter.
- **Constraint:** Blocked by API on validated configs (per catalogue line 79); surfaces as a 422 caught by the row's general error banner.

---

## framework.js

### GET `/v1/analytical-frameworks` — `listFrameworks()`
- **Live response shape:** `{ items: AnalyticalFramework[] }` (verified 2026-04-25). Unwrapped inside the function.
- **Server auto-scopes** to platform (`client_id === null`) + caller's `client_id` — no `client_id` filter passed from the frontend.
- **Used by:** `AuthoringPage` (Step 3 framework picker — `['frameworks']`). Drives both the selected-framework display card and the `FrameworkPickerDrawer` row list.
- **Response fields used per row:** `id`, `client_id` (drives drawer grouping: platform / org / other), `tier` (rendered as a pill, server-driven enum), `name`, `framework_description`, `created_at` (used to pick the lowest-`created_at` Realism platform framework as the default).

### GET `/v1/analytical-frameworks/:id` — `getFramework(id)`
- (unused by built pages — registered for future detail/clone flows.)
- **Response shape:** UNVERIFIED — assumed to match the list-item shape. Re-probe and update `docs/response-shapes.md` once first wired.

### POST `/v1/analytical-frameworks/:id/clone` — `cloneFramework(id, name)`
- **Body:** `{ name }`.
- (unused this session — Phase 2. The Step 3 `FrameworkPickerDrawer` shows a disabled `"+ Create framework"` ghost button + amber "Coming soon" chip in its place. The clone flow on the framework-in-use warning is also deferred since the proactive in-use check is currently disabled — see PATCH 409 fallback above.)

---

## user.js

| Method | Path | Function | Used by |
|---|---|---|---|
| GET | `/v1/users/:id` | `getUser` | (unused by pages — likely consumed by `AuthContext` outside `src/pages/`) |
| PATCH | `/v1/users/:id` | `patchUser` | (unused — `AccountPage` is a stub) |
| DELETE | `/v1/users/:id` | `deleteUser` | (unused) |

---

## Summary of live endpoints (pages currently calling the API)

| Page | Endpoints |
|---|---|
| `LoginPage` | `POST /auth/login` |
| `ExtractionPage` | `POST /v1/report-extractions/ingest`, `GET /v1/report-extractions/:id`, `GET /v1/clients/:clientId`, `GET /v1/clients/:clientId/extractions`, `GET /v1/clients/:clientId/extractions/:id`, `PATCH /v1/clients/:clientId/extractions/:id`, `DELETE /v1/clients/:clientId/extractions/:id`, `POST /v1/clients/:clientId/extractions/:id/tags`, `DELETE /v1/clients/:clientId/extractions/:id/tags/:tagId`, `GET /v1/clients/:clientId/tags`, `POST /v1/clients/:clientId/tags` |
| `AuthoringPage` | `GET /v1/clients/:clientId/extractions`, `GET /v1/report-extractions/:id`, `GET /v1/scenarios` (resume check), `GET /v1/scenarios/:id`, `POST /v1/scenarios`, `PATCH /v1/scenarios/:id`, `POST /v1/scenarios/:id/publish`, `GET /v1/scenarios/:id/configs`, `POST /v1/scenarios/:id/configs`, `PATCH /v1/scenario-configs/:id`, `GET /v1/analytical-frameworks`, `GET /v1/scenario-configs/:configId/tension-indicator`, `POST /v1/scenario-configs/:configId/tension-indicator`, `PATCH /v1/scenario-configs/:configId/tension-indicator`, `GET /v1/scenario-configs/:configId/turn1-template`, `GET /v1/scenario-configs/:configId/dimension-definitions`, `POST /v1/scenario-configs/:configId/dimension-definitions`, `PATCH /v1/dimension-definitions/:id`, `DELETE /v1/dimension-definitions/:id` |

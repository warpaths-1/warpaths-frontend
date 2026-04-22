# API Surface

Every API endpoint the frontend calls, organized by domain file in `src/api/`.

For each endpoint: HTTP method + path, the API function, which page(s) call it, and the response fields each page depends on.

Page status (April 2026):
- **Built:** `LoginPage`, `ExtractionPage`
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
- **Used by:** `ExtractionPage`
- **Response fields used:**
  - `id`
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
  - `actor_suggestions[].stance`
  - `inject_seeds[].seed_text`
  - `inject_seeds[].turn_suggestion`
  - `inject_seeds.length` (toast when 1 ≤ n < 5)
- **Error status codes handled:** `404` (not found) → special error copy.

### GET `/v1/clients/:clientId/extractions` — `getClientExtractions(clientId, params)`
- **Query params:** `tag_id` (optional, for filter)
- **Used by:** `ExtractionPage` (left master list, ClientAdmin only)
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
- **Used by:** `ExtractionPage` (lazy — only once the tag dropdown is opened; drives the left-column filter chips too)
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

| Method | Path | Function | Used by |
|---|---|---|---|
| GET | `/v1/scenarios` | `getScenarios` | (unused) |
| GET | `/v1/scenarios/:id` | `getScenario` | (unused) |

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

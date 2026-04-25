# API Response Shapes

Captured from live API (`https://warpaths-api.onrender.com`) on 2026-04-22 under a ClientAdmin JWT (client_id `ad412b27-deca-425b-be66-86e4638fe6e9`).

**Audit method:** Each section is grounded in a live response capture. Per-section `Last probed` dates indicate the most recent verification. When the API contract changes, re-probe the affected endpoint and update both the field table and the date. Discrepancies between the live response and the API catalogue (`warpaths-api/docs/catalogue/`) are recorded as **catalogue drift** and require a backend doc fix.

Each section documents:
1. Observed field → type mapping, with `| null` where the live response contained null.
2. Which of these fields the frontend consumes today (cross-referenced against `docs/api-surface.md`).
3. Fields the surface registry references that **do not exist** in the live response — these are registry drift that must be reconciled before the affected pages are finished.

---

## 1. `GET /v1/report-extractions/:id`

_Last probed: 2026-04-22._

Returns the extraction payload directly (no wrapper envelope). Same shape as the 200 body of `POST /v1/report-extractions/ingest`.

### Top-level

| Field | Type | Notes |
|---|---|---|
| `report_extraction_id` | string (UUID) | Primary key. `api-surface` refers to this as `id`. |
| `schema_version` | string | Currently `"v2"`. |
| `extraction_status` | string | Observed: `"complete"`. Other values per API: `"pending"`, `"failed"`. |
| `created_at` | string (ISO8601 with tz) | |
| `updated_at` | string (ISO8601 with tz) | |
| `extracted_at` | string (ISO8601 with tz) | |
| `source_pdf_ref` | object | See below. Replaces registry entries `pdf_fingerprint` / `source_filename` (neither exists). |
| `report_brief` | object | See below. |
| `scenario_suggestion` | object | See below. |
| `actor_suggestions` | array of object | |
| `inject_seeds` | array of object | |
| `tension_suggestion` | object | See below. |
| `generation_notes` | object | `{ limits: string, known_gaps: string }`. Registry refers to this as `extraction_notes`. |
| `kickoff_question` | string | |
| `suggested_framework_tier` | string | Observed: `"realism"`. |

### `source_pdf_ref`

```
{
  sha256: string,       // 64-char hex
  source_id: string,    // e.g. "file-Bu3dAg7a3zokWV5Tvix3mJ"
  source_type: string   // observed: "openai_file"
}
```

### `report_brief`

| Field | Type |
|---|---|
| `publisher` | string |
| `report_title` | string |
| `report_subtitle` | string |
| `report_authors` | string[] |
| `publication_date` | string |
| `core_thesis` | string |
| `why_this_game` | string |
| `key_claims` | array of `{ claim: string, supporting_citations: Citation[] }` |
| `cited_fragments` | `Citation[]` |
| `policy_implications` | array of `{ implication: string, supporting_citations: Citation[] }` |
| `strategic_domain_tags` | string[] |

`Citation` = `{ quote: string, notes: string, page_start: number, page_end: number }`.

### `scenario_suggestion`

| Field | Type |
|---|---|
| `title` | string |
| `setting` | string |
| `category` | string |
| `subcategory` | string |
| `central_crisis` | string |
| `scenario_narrative` | string |
| `escalation_dynamics` | string |
| `key_assumptions` | string[] |
| `primary_geographies` | string[] |
| `time_horizon` | `{ incident_horizon: string, planning_horizon: string, notes: string }` |

### `actor_suggestions[]`

| Field | Type |
|---|---|
| `name` | string |
| `role` | string (e.g. `"protagonist"`, `"adversary"`, `"neutral"`) |
| `type` | string (e.g. `"state_actor"`, `"international_organization"`) |
| `objectives` | string[] |
| `current_posture` | string |
| `is_visible_to_player` | boolean |
| `capabilities_overview` | string |
| `relationships_overview` | string |
| `supporting_citations` | `Citation[]` |

### `inject_seeds[]`

| Field | Type |
|---|---|
| `title` | string |
| `seed_text` | string |
| `suggested_types` | string[] |
| `aggravating_factors` | string[] |
| `supporting_citations` | `Citation[]` |

### `tension_suggestion`

```
{
  name: string,
  definition: string,
  rationale: string,
  suggested_starting_level: number
}
```

### Frontend usage (from `api-surface.md`)

Consumed today: `report_extraction_id` (as `id`), `extraction_status`, `report_brief.report_title`, `report_brief.why_this_game`, `scenario_suggestion.scenario_narrative`, `scenario_suggestion.strategic_domain_tags[]` (live payload has this under `report_brief`, not `scenario_suggestion`), `actor_suggestions[].name|role`, `inject_seeds[].seed_text`, `inject_seeds.length`.

### Registry drift (fields `api-surface.md` claims but live response does not return)

- `confidence_score` — absent.
- `extraction_notes` — absent (the payload has `generation_notes` instead).
- `source_filename` — absent (the PDF identity lives under `source_pdf_ref`).
- `pdf_fingerprint` — absent (use `source_pdf_ref.sha256`).
- `report_brief.publication` — the field is named `publisher`.
- `report_brief.summary` — absent (closest is `core_thesis`).
- `scenario_suggestion.strategic_domain_tags` — lives on `report_brief`, not `scenario_suggestion`.
- `scenario_suggestion.suggested_turn_count` — absent.
- `actor_suggestions[].stance` — absent (the closest field is `current_posture`).
- `inject_seeds[].turn_suggestion` — absent.

### Nullable fields

No top-level nulls observed in the sample response. All of the fields above were populated.

---

## 2. `GET /v1/clients/:id`

_Last probed: 2026-04-22._

Flat object, no envelope.

| Field | Type | Nullable |
|---|---|---|
| `id` | string (UUID) | no |
| `name` | string | no |
| `type` | string (e.g. `"think_tank"`) | no |
| `billing_plan_id` | string (UUID) | no |
| `billing_tier` | string (e.g. `"free"`) | no |
| `is_trial` | boolean | no |
| `billing_email` | string | no |
| `contact_source` | string (e.g. `"direct_signup"`) | no |
| `research_billing_tier` | string (e.g. `"none"`) | no |
| `research_agreement_ref` | string | **yes** (null observed) |
| `research_access_expires_at` | string (ISO8601) | **yes** (null observed) |
| `research_seats_purchased` | number | no |
| `seats_purchased` | number | no |
| `reports_used_this_period` | number | no |
| `seats_used_this_period` | number | no |
| `invites_used_this_period` | number | no |
| `custom_reports_limit` | number | **yes** (null observed) |
| `custom_seats_limit` | number | **yes** (null observed) |
| `custom_invites_limit` | number | **yes** (null observed) |
| `period_start` | string (ISO8601) | no |
| `period_end` | string (ISO8601) | no |
| `periods_remaining` | number | **yes** (null observed) |
| `bubble_client_id` | string | **yes** (null observed) |
| `created_at` | string (ISO8601) | no |
| `updated_at` | string (ISO8601) | no |

### Frontend usage (from `api-surface.md`)

Consumed today: `custom_reports_limit`, `reports_used_this_period`.

### Registry drift

- `plan_reports_limit` — absent from this endpoint. The registry lists it as the "fallback" to `custom_reports_limit`; it would require a separate lookup via `billing_plan_id`.
- `logo_url` — absent. The Header spec (CLAUDE.md) expects `client.logo_url` for org branding, but this endpoint does not surface it.

---

## 3. `GET /v1/clients/:clientId/extractions`

_Last probed: 2026-04-22._

Envelope: `{ items: ClientExtractionSummary[] }`.

### `ClientExtractionSummary` (per-item)

| Field | Type | Nullable |
|---|---|---|
| `id` | string (UUID) | no — ClientExtraction row ID |
| `client_id` | string (UUID) | no |
| `report_extraction_id` | string (UUID) | no — FK to the underlying ReportExtraction |
| `display_name` | string | **yes** (null observed) |
| `notes` | string | **yes** (null observed) |
| `scenario_ids` | string[] (UUIDs) | no (may be empty `[]`) |
| `tags` | `{ id: string, name: string }[]` | no (may be empty `[]`) |
| `report_title` | string | **yes** in principle — denormalized from underlying extraction; null if extraction is pending/failed |
| `extraction_status` | string | no — observed: `"complete"` |
| `extracted_at` | string (ISO8601) | **yes** — null until underlying extraction has a timestamp |
| `created_at` | string (ISO8601) | no |
| `updated_at` | string (ISO8601) | no |

### Frontend usage (from `api-surface.md`)

Consumed today: `id`, `display_name`, `report_title`, `extracted_at`, `extraction_status`, `scenario_ids[]`, `tags[].id|name`, `report_extraction_id`.

### Registry drift

None — the per-row fields `api-surface.md` lists all exist in the live response.

### Notes

- Registry notes a `tag_id` query param; confirmed working (tested with a random UUID, returned `{ items: [] }` as expected).
- No cursor/pagination envelope observed — this endpoint returns all matching rows at once.

---

## 3. Scenario — `actors[]` item shape

_Last probed: 2026-04-24._

The `current_posture` field on a Scenario actor is an **enum**, not a free-text string.
Valid values: `dormant | observing | active | escalating | de_escalating | engaged`.

| Field | Type |
|---|---|
| `name` | string |
| `role` | string |
| `goals` | `GoalItem[]` — see below |
| `behavior` | string |
| `history` | string |
| `constraints` | string |
| `current_posture` | enum — see values above |
| `is_visible_to_player` | boolean |
| `relationships_overview` | string |

### `GoalItem`

```
{
  label: string,        // short name, required
  description: string,  // longer narrative, required
  priority: 1 | 2 | 3   // 1=High, 2=Medium, 3=Low
}
```

All three fields are required by the API (Pydantic `GoalItem` schema). Priority is an
integer in `{1, 2, 3}`; the convention `1=High, 2=Medium, 3=Low` is documented in
`warpaths-api/docs/catalogue/02b_actor.md` and `09_player_perspective.md`.

**Important:** previous frontend code used `goal_items: [{ goal, priority }]`. That
shape was silently dropped by the API (Pydantic `extra="ignore"` default), so saves
appeared to succeed but stored an empty `goals` list. Always use `goals` with the
three-field `GoalItem` shape above.

### Catalogue drift

`warpaths-api/docs/catalogue/02_scenario.md` documents `current_posture` as type `string`.
This is incorrect — the API enforces the enum listed above and returns a 422 if an
out-of-range value is submitted. The catalogue entry should be updated.

### Extraction vs. Scenario distinction

`actor_suggestions[].current_posture` (on the ReportExtraction) is a **free-text narrative**
string (e.g. "Leading efforts in promoting space governance"). It is NOT the same field as
`Scenario.actors[].current_posture`. When seeding scenario actors from an extraction:
- Default `current_posture` to `'observing'`
- Surface the narrative string via MappingCallout so the author can pick the correct enum value

---

## 4. `GET /v1/scenarios` — list envelope

_Last probed: 2026-04-24._

The live response is wrapped in an `items` envelope:

```json
{ "items": [ <Scenario>, <Scenario>, ... ] }
```

Empty result still returns the same shape: `{ "items": [] }`.

Filter parameters tested and confirmed working:
- `source_extraction_id=<uuid>` — returns length 0 or 1 (product rule: at most
  one Scenario per extraction)

### Catalogue drift (BACKLOG — needs API-side doc fix)

`warpaths-api/docs/api/02_scenario.md` at the `GET /scenarios` entry documents
**"Returns: Array of Scenario records"** — a bare array. The live response is
actually `{ items: [...] }`. This is real drift, same class as the
`current_posture` enum mislabeling above — both need API catalogue corrections.

Frontend handles this by unwrapping inside `src/api/scenario.js`:

```js
export const listScenarios = (params) =>
  client.get('/v1/scenarios', { params }).then(r => r.data?.items ?? []);
```

Consumers receive a plain array. Same pattern as `getClientExtractions` and
`getClientTags` in `src/api/extraction.js`.

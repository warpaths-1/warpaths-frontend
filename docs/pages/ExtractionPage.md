# ExtractionPage — Page Behavior Specification
`src/pages/ExtractionPage.jsx`

**Status: BUILT** — Page is complete with TanStack Query data fetching.
Last updated: April 2026.

Read `docs/page-design-patterns.md` before modifying this page.
All visual patterns referenced below by section number (e.g. §3) are
defined there. Do not re-implement them — use the patterns as specified.

---

## Purpose

The Extraction page serves three distinct user types via two URL patterns:

- `/extract` — ClientAdmin org experience: master-detail layout
- `/extract/:id` — Direct link: shared link or returning authenticated user.
  Auth state determines content depth.

| User type | URL | List visible | Detail depth |
|---|---|---|---|
| ClientAdmin (org) | `/extract` | Yes — always | Full: ReportExtraction + ClientExtraction metadata |
| ClientAdmin (org) | `/extract/:id` | Yes — always | Same; pre-selects matching record if in org history |
| Authenticated User (no org) | `/extract/:id` | No | All four content tabs enabled + org upgrade CTA |
| Unauthenticated | `/extract/:id` | No | Game Brief visible + auth gate + disabled tabs |

User-type detection is scope-based:
- `isClientAdmin` — JWT `scope === 'client_admin'`
- Staff (`scope === 'bubble'`) use the same rendering path as an authenticated
  user with no org; they are excluded only from the Org CTA
- Authenticated user with no admin scope and no `:id` param is redirected
  to `/leaderboard`

---

## Route Configuration

`src/App.jsx` routes:

```jsx
<Route path="/extract" element={
  <ProtectedRoute><ExtractionPage /></ProtectedRoute>
} />
<Route path="/extract/:id" element={<ExtractionPage />} />
```

`ExtractionPage` handles its own auth-awareness on the `:id` path by
reading `sessionStorage.warpaths_token` directly.

---

## Layout

**ClientAdmin (`/extract` or `/extract/:id` authed as ClientAdmin):**
Master-detail layout (Patterns §1). Left column 260px, right column
fills remaining width.

**User / unauthenticated (`/extract/:id` only):**
Single-column layout (Patterns §1), `max-width: 700px`, centered.

---

## Left Panel — Extraction History List (ClientAdmin only)

### Header
Follow the List Panel pattern (Patterns §7), with one deviation:
the extraction quota appears as a line of 11px mono secondary text
between the section label row and the tag filter row.

- Section label row: `"EXTRACTIONS"` label (10px mono uppercase secondary)
  on the left, `"+ New"` ghost button on the right — triggers UPLOAD
  state in detail panel and clears active selection
- Quota line (11px mono secondary):
  - If `custom_reports_limit` is non-null: `"{used}/{limit} used this period"`
  - Otherwise: `"{used} used this period"`
  - `used` = `client.reports_used_this_period ?? 0`
  - A non-null `plan_reports_limit` fallback is not currently supported — a
    separate BillingPlan fetch would be required and is not yet implemented
- Tag filter chips (Patterns §9, tag filter chips). `"All"` chip first,
  selected by default. Single-select. Active tag re-fetches list with
  `?tag_id=` param.

### Tag library query
`['tags', clientId]` — fetched eagerly whenever the user is a ClientAdmin
with a resolved `clientId` (not lazy). The same query powers both the
filter chips and the `"+ Add tag"` dropdown.

### List items
Follow list item anatomy (Patterns §7):
1. Title: `display_name` if set, else `report_title` (denormalized),
   else `"Untitled"`
2. Date row: `extracted_at` localized (`"Apr 9, 2026"`) on the left,
   status Badge on the right — **only for `failed` and `pending`** —
   omit for `complete` (Patterns §21)
3. Tag chips row: applied tags, read-only display
4. Status indicator: `"● Scenario created"` in teal-bright 10px mono,
   shown when `scenario_ids` is non-empty. Blank otherwise.

No retry button is rendered inline — a failed list item loads into the
detail panel with the `Badge status="failed"` and the standard result
view.

### List API call
```
GET /v1/clients/:client_id/extractions
  Auth: Bearer token
  Query: tag_id (when tag filter active)
  Returns: { items: ClientExtractionSummary[] } desc by created_at
  Includes: embedded tags, report_title, extraction_status, extracted_at
```
TanStack Query key: `['extractions', clientId, tagId]`
Fetch on mount. Re-fetch after new extraction completes, record deleted,
display_name edit, or tag apply/remove.

---

## Detail Panel States

Five states. One visible at a time.

```
EMPTY → UPLOAD → LOADING → RESULT
                          ↓ (on error)
                         ERROR → UPLOAD

EMPTY → (list item selected) → RESULT
```

On `/extract/:id` without ClientAdmin auth: skip EMPTY and UPLOAD.
Go directly to LOADING (fetch by ID) → RESULT or ERROR.

---

### State 1 — EMPTY

Shown when ClientAdmin has no record selected and no upload in progress.

Use the empty state pattern (Patterns §19):
- Icon: Lucide `FileText`, 40px, secondary color
- Heading: `"Select an extraction to view"` — h3
- Body: `"Or upload a new report to extract a scenario."` — base size
- Button: `"Upload Report"` — variant `secondary`, transitions to UPLOAD state

---

### State 2 — UPLOAD

**Quota line (above upload zone):**
Same data as the left-panel header quota. Effective limit is
`client.custom_reports_limit` (null means no fallback available).
- When `remaining > 0`: `"{remaining} extraction(s) remaining this period"`,
  11px mono secondary, right-aligned
- When `remaining <= 0`: `"Extraction limit reached for this period"` in
  amber mono. Upload zone and Extract button disable.
- When no limit is known: the quota line is omitted.

**Upload zone:**
- `border: 1px dashed var(--border-active)`, `border-radius: 3px`,
  full width, `height: 160px`
- Centered: Lucide `Upload` (32px secondary) above text
- Primary text: `"Drop a PDF here or click to browse"` — 13px
- Hint: `"PDF only · Max 20 MB"` — 11px mono secondary
- Click opens file picker (`accept=".pdf"`)
- On file selected: show `"filename.pdf · 4.2 MB"` below zone in
  12px mono secondary, with inline Lucide `X` (14px) to clear selection

**Actions (below upload zone):**
- `"Extract"` button — variant `primary`, right-aligned. Disabled until
  a file is selected or if the quota is exhausted.
- `"Cancel"` — variant `ghost`, left-aligned. Returns to the previous
  state (RESULT if one was loaded, else EMPTY). Not shown on
  `/extract/:id` flows.

---

### State 3 — LOADING

Replaces UPLOAD entirely on submit.

- `ProgressBar` component — `active={true}`,
  label `"Running extraction — this takes 30–60 seconds"`
- Below bar: `"Do not close this tab."` — secondary text, base size

**API call:**
```
POST /v1/report-extractions/ingest
  Auth: Bearer token
  Body: multipart/form-data, field name "file"
  Returns: 201 ReportExtraction object (is_duplicate: false)
           200 existing ReportExtraction (is_duplicate: true)
  Side effect: ClientExtraction created atomically server-side
```

**On `is_duplicate: true`** (org already extracted this PDF):
Treat as success — transition to RESULT with returned data.
Show Toast: variant `info`,
`"This report was already extracted. Showing existing results."`

**On success:** seed the `['extraction', id]` cache with the returned
payload, transition to RESULT, invalidate `['extractions', clientId]`
and `['client', clientId]`.

**On error:** transition to ERROR.

Loading state for an existing record (list item selection or direct link)
shows Skeleton rows instead of the ProgressBar.

---

### State 4 — RESULT

#### Metadata bar (ClientAdmin only, requires loaded ClientExtraction)
Follow the Metadata Bar pattern (Patterns §6). Slots:
1. Inline-editable display name (Patterns §18) —
   `PATCH /v1/clients/:id/extractions/:id` with `{ display_name }`.
   Mutation writes the updated ClientExtraction into
   `['clientExtraction', clientId, ceId]` and invalidates
   `['extractions', clientId]`.
2. Applied tags with `×` remove each —
   `DELETE /v1/clients/:id/extractions/:id/tags/:tag_id`.
   `"+ Add tag"` → tag dropdown (Patterns §9) backed by `['tags', clientId]`.
   Apply existing: `POST /v1/clients/:id/extractions/:id/tags`.
   Create new: `POST /v1/clients/:id/tags` then apply.
3. `"Add note"` / `"Edit notes"` shortcut — opens Drawer (480px)
   containing the same Admin Notes tab content; textarea auto-saves on
   blur via `PATCH /v1/clients/:id/extractions/:id` with `{ notes }`.
4. Right-aligned: `"● Scenario created"` (teal-bright, 10px mono) if
   `scenario_ids` non-empty. Anchor currently points to `#` —
   authoring route is TBD.
5. Destructive: Trash2 icon button. Opens confirmation Modal:
   title `"Delete extraction record"`,
   body `"This removes it from your org history. The underlying extraction
   is not deleted."`, confirm button variant `destructive`.
   Disabled with tooltip `"Cannot delete — scenarios exist"` if
   `scenario_ids` non-empty.
   On confirm: `DELETE /v1/clients/:id/extractions/:id` → 204 →
   invalidate `['extractions', clientId]`, transition to EMPTY.

#### Top bar (all user types)
Follow Detail Panel Top Bar pattern (Patterns §8):
- Left: Badge with `extraction_status` (always shown here — Patterns §21)
- Right (ClientAdmin master-detail only): `"New Extraction"` ghost
  button → transitions to UPLOAD state

#### Auth gate (unauthenticated only)
Follow Auth Gate Card pattern (Patterns §13). Render above tab row.
- Title: `"You're viewing a WarPaths scenario extraction"`
- Body: `"Create a free account to see the full scenario brief, actor
  analysis, and story seeds extracted from this report."`
- Actions: `"Create account"` (primary) → `/join?next=/extract/:id`,
  `"Log in"` (secondary) → `/login?next=/extract/:id`

#### Org CTA (authenticated non-admin, non-staff only)
Follow Org CTA Bar pattern (Patterns §14). Render above tab row.
- Body: `"Want to run this as a live wargame for your org? Create an org
  account to configure and invite participants."`
- Action: `"Create org account"` — primary, sm size. Route TBD (`#`).

Hidden when `scope === 'bubble'`.

#### Tabs
Full-width equal tab row (Patterns §5).

| Tab | ClientAdmin | Authenticated User / Staff | Unauthenticated |
|---|---|---|---|
| Game Brief | ✓ active on mount | ✓ active on mount | ✓ active, visible |
| Source Report | ✓ | ✓ | Disabled |
| Actors | ✓ | ✓ | Disabled |
| Inject Seeds | ✓ | ✓ | Disabled |
| Admin Notes | ✓ | — (not shown) | — (not shown) |

Active on mount: **Game Brief**. Tabs reset to Game Brief whenever a new
ReportExtraction loads.

There is no Extraction Details tab. Operational metadata (status, IDs,
fingerprints, generation notes, framework tier, schema version, source
PDF ref) is reserved for a future staff management panel and is not
rendered on this page.

---

#### Tab: Game Brief

Use Field Block pattern (Patterns §3) for each field. Full content visible
to all user types — no clipping or fade.

Top section (flat field blocks):
- `"WHY THIS GAME"` — `report_brief.why_this_game`
- `"SCENARIO NARRATIVE"` — `scenario_suggestion.scenario_narrative`
- `"SCENARIO TITLE"` — `scenario_suggestion.title`
- `"SETTING"` — `scenario_suggestion.setting`
- Two-column grid: `"CATEGORY"` / `"SUBCATEGORY"` —
  `scenario_suggestion.category` / `scenario_suggestion.subcategory`
- `"CENTRAL CRISIS"` — `scenario_suggestion.central_crisis`
- `"ESCALATION DYNAMICS"` — `scenario_suggestion.escalation_dynamics`
- `"KEY ASSUMPTIONS"` — `scenario_suggestion.key_assumptions[]` as a
  numbered list
- `"PRIMARY GEOGRAPHIES"` — `scenario_suggestion.primary_geographies[]`
  as domain tag chips (Patterns §9)
- `"STRATEGIC DOMAIN TAGS"` — `report_brief.strategic_domain_tags[]` as
  domain tag chips (Patterns §9). Sourced from `report_brief`, not
  `scenario_suggestion`.

Section divider, then `"TIME HORIZON"` section label (Patterns §10):
- `"CRISIS HORIZON"` — `scenario_suggestion.time_horizon.planning_horizon`
- `"TURN HORIZON"` — `scenario_suggestion.time_horizon.incident_horizon`
- `"NOTES"` — `scenario_suggestion.time_horizon.notes` (secondary variant)

Section divider, then `"TENSION SUGGESTION"` section label:
- `"NAME"` — `tension_suggestion.name`
- `"DEFINITION"` — `tension_suggestion.definition`
- `"RATIONALE"` — `tension_suggestion.rationale`
- `"SUGGESTED STARTING LEVEL"` — `tension_suggestion.suggested_starting_level`
  (mono variant)

Section divider, then:
- `"KICKOFF QUESTION"` — `re.kickoff_question`

Missing values render as `"—"`.

---

#### Tab: Source Report

Header block (not field blocks):
- `report_brief.report_title` — 17px, `font-weight: 600`, primary text,
  `margin-bottom: 3px`
- `report_brief.report_subtitle` — base size, secondary text,
  `line-height: 1.5`, `margin-bottom: 6px` (omitted if empty)
- Meta line — 13px (`--text-sm`) secondary, joined with ` · `:
  `publisher`, `report_authors[].join(', ')`, `publication_date`
  (any falsy parts filtered out)

Below header:
- `"CORE THESIS"` — `report_brief.core_thesis` (secondary variant field
  block)

Section divider, then `"KEY CLAIMS"` section label.
Render each `report_brief.key_claims[]` entry as a local ClaimCard:
- Body: `claim` text, 13px primary, `line-height: 1.6`
- Expandable `"Supporting Citations (n)"` block with ChevronRight/Down
  toggle, revealing each citation as an italic quote + page range +
  optional notes.
Empty array → `"No key claims."` in secondary text.

Section divider, then `"POLICY IMPLICATIONS"` section label.
Same ClaimCard treatment as Key Claims, using `implication` as the body.
Empty array → `"No policy implications."`.

Section divider, then `"CITED FRAGMENTS"` section label.
Render each `report_brief.cited_fragments[]` entry inline (no ClaimCard
wrapper): italic quote, mono page range, optional notes in secondary.
Empty array → `"No cited fragments."`.

---

#### Tab: Actors

Reads `re.actor_suggestions[]`. If empty, render
`"No actors suggested."` in secondary text inside the tab's padded area.

Each actor renders in the `Card` UI component (variant `default`),
separated from the next actor by a section divider (Patterns §4):
- `<h4>` 15px `font-weight: 600` primary — `actor.name`
- Mono subheading, uppercase, letter-spacing 0.08em, secondary —
  `[role, type].filter(Boolean).join(' · ')`
- Field blocks:
  - `"CURRENT POSTURE"` — `current_posture`
  - `"CAPABILITIES"` — `capabilities_overview`
  - `"RELATIONSHIPS"` — `relationships_overview`
  - `"OBJECTIVES"` — `objectives[]` as a numbered list
  - `"VISIBLE TO PLAYER"` — `Toggle` component, disabled, reflects
    `is_visible_to_player`
- Expandable citations block at the bottom, sourced from
  `supporting_citations[]`

---

#### Tab: Inject Seeds

Reads `re.inject_seeds[]`. If empty, render `"No seeds returned."` in
secondary text.

Each seed is a local card (`bg-secondary`, subtle border, 3px radius,
`padding: 14px 16px`):
- Zero-padded index — `"01"`, `"02"`, … (10px mono, disabled color)
- Optional seed title — base size primary, `font-weight: 600` (omitted
  when `title` is absent)
- `seed_text` — base size primary, `line-height: 1.6`
- `"SUGGESTED TYPES"` mono label + tag-chip row when
  `suggested_types[]` is non-empty
- `"AGGRAVATING FACTORS"` mono label + bulleted list when
  `aggravating_factors[]` is non-empty
- Expandable citations block at the bottom, sourced from
  `supporting_citations[]`

When `1 ≤ inject_seeds.length < 5` on a freshly loaded ReportExtraction,
show a Toast: variant `warning`,
`"Only {n} seeds returned — minimum is 5. Consider re-extracting."`.
The toast fires once per newly loaded record.

---

#### Tab: Admin Notes (ClientAdmin only)

Reads from the selected `ClientExtraction` record.

- `"ADDED"` — `ce.created_at` formatted as `"Apr 9, 2026 · 14:32 UTC"`
  (mono variant)
- `"LINKED SCENARIOS"` — `ce.scenario_ids[]`:
  - Empty → `"None"` in secondary text
  - Non-empty → count on the first line, followed by each scenario ID
    on its own line in 11px mono secondary

Section divider (Patterns §4), then the auto-save note field
(Patterns §17):
- Section label: `"ADMIN NOTES"`
- `Textarea`, 6 rows, placeholder `"Add notes — authoring decisions,
  quality observations, follow-up items…"`
- Value: `clientExtraction.notes` (may be null)
- On blur: `PATCH /v1/clients/:id/extractions/:id` with `{ notes }`.
  On success, writes updated record into
  `['clientExtraction', clientId, ceId]` and shows `"Saved"` below the
  textarea for 2 seconds (11px mono disabled).

The same content renders inside the Notes Drawer reachable from the
metadata bar.

---

### State 5 — ERROR

Use error state pattern (Patterns §19):
- Icon: Lucide `AlertTriangle`, 32px, `var(--accent-red)`
- Heading: `"Extraction failed"` — h3
- Body: `error.response?.data?.detail` if present, else generic fallback

Status-specific body overrides:
- 413: `"File exceeds the 20 MB limit."`
- 422: `"The file could not be processed. Confirm it is a valid PDF."`
- 404 (load by ID): `"This extraction could not be found."`

Button: `"Try Again"` — variant `primary`.
ClientAdmin: returns to UPLOAD state.
Direct link path: reloads the page.

---

## TanStack Query Keys

```javascript
['extractions', clientId, tagId]        // extraction list
['client', clientId]                    // client/quota data
['extraction', reId]                    // report extraction by ID
['clientExtraction', clientId, ceId]    // client extraction record
['tags', clientId]                      // tag library (eager for ClientAdmin)
```

See `docs/query-keys.md` for the full registry.

---

## Key Actions

| Action | Trigger | API call |
|---|---|---|
| Load history list | Page mount (ClientAdmin) | `GET /v1/clients/:id/extractions` |
| Load Client for quota | Page mount (ClientAdmin) | `GET /v1/clients/:id` |
| Load tag library | Page mount (ClientAdmin) | `GET /v1/clients/:id/tags` |
| Filter list by tag | Tag chip click | Re-fetch with `?tag_id=` |
| Select record | List item click | `GET /v1/clients/:id/extractions/:id` + `GET /v1/report-extractions/:id` |
| Load by URL param | Page mount with `:id` | `GET /v1/report-extractions/:id` (no auth required) |
| Upload and extract | Extract button | `POST /v1/report-extractions/ingest` (multipart, field: `file`) |
| Handle duplicate | `is_duplicate: true` response | Info Toast, treat as success |
| Edit display name | Inline click + blur/Enter | `PATCH /v1/clients/:id/extractions/:id` |
| Add / edit note | Tab textarea blur or Drawer blur | `PATCH /v1/clients/:id/extractions/:id` |
| Create and apply tag | New tag + enter | `POST /v1/clients/:id/tags` → `POST .../extractions/:id/tags` |
| Apply existing tag | Tag dropdown select | `POST /v1/clients/:id/extractions/:id/tags` |
| Remove tag | Chip `×` | `DELETE /v1/clients/:id/extractions/:id/tags/:tag_id` |
| Delete record | Confirm modal | `DELETE /v1/clients/:id/extractions/:id` |
| Create account | Auth gate button | Navigate `/join?next=/extract/:id` |
| Log in | Auth gate button | Navigate `/login?next=/extract/:id` |
| New extraction (from result) | `"New Extraction"` / `"+ New"` | Transition to UPLOAD |

---

## API Reference

All paths prefixed with `/v1/` except `/auth/*`.

```
POST /v1/report-extractions/ingest         multipart/form-data, field "file"
GET  /v1/report-extractions/:id            no auth required

GET    /v1/clients/:id                      for quota display
GET    /v1/clients/:id/extractions          history list
GET    /v1/clients/:id/extractions/:id      single record
PATCH  /v1/clients/:id/extractions/:id      display_name, notes
DELETE /v1/clients/:id/extractions/:id      delete record

POST   /v1/clients/:id/extractions/:id/tags           apply tag
DELETE /v1/clients/:id/extractions/:id/tags/:tag_id   remove tag

GET    /v1/clients/:id/tags                 tag library
POST   /v1/clients/:id/tags                 create tag
```

All API functions live in `src/api/extraction.js` (and `src/api/client.js`
for `getClient`).

---

## Component Usage

| Component | Usage |
|---|---|
| `PageShell` | Outer wrapper, no sidebar |
| `Button` | Extract, New Extraction, Cancel, Try Again, CTAs |
| `Badge` | Extraction status |
| `Input` | Inline display name editing |
| `Textarea` | Admin notes |
| `Card` | Actor detail panels |
| `Toggle` | Actor "visible to player" indicator (disabled) |
| `Drawer` | Notes editing panel (480px default width) |
| `Modal` | Delete confirmation |
| `Toast` | Duplicate info, seed warning |
| `ProgressBar` | Upload progress |
| `Skeleton` | List and detail loading states |

Tag chips, tag dropdown, seed cards, citation blocks, and the inline
field/section primitives are implemented as local sub-components inside
`ExtractionPage.jsx`. Do not add them to `src/components/ui/`.

---

## Constraints

- `GET /v1/report-extractions/:id` requires no auth. The axios interceptor
  attaches a token only if present — no special handling needed.
- ReportExtraction content is read-only on this page. Only ClientExtraction
  metadata (display_name, notes, tags) is editable.
- Duplicate detection is via `is_duplicate: true` in the POST response —
  not a 409 status code. Handle accordingly.
- ClientAdmin detection is strict: `scope === 'client_admin'`. Presence
  of `client_id` alone is not sufficient.
- ClientAdmins always see the list panel. When arriving at `/extract/:id`,
  pre-select the matching ClientExtraction if it exists in org history.
  If not, load the ReportExtraction read-only with no list selection
  highlighted.
- Authenticated non-admin users who land on `/extract` (no `:id`) are
  redirected to `/leaderboard`.
- Effective extraction limit currently reads only `custom_reports_limit`.
  A `plan_reports_limit` fallback would require a BillingPlan fetch that
  is not yet implemented.
- Tag rename and tag library delete are scoped to OrgManagementPage —
  not implemented here. Only applying and removing tags on an extraction
  is in scope.
- Page does not persist scroll position or selected record across navigation.
- Do not use localStorage for any state.
- All token values via CSS custom properties — no hardcoded hex values.

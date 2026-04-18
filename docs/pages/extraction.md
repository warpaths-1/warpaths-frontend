# ExtractionPage — Page Behavior Specification
`src/pages/ExtractionPage.jsx`

Read `docs/page-design-patterns.md` before building this page.
All visual patterns referenced below by section number (e.g. §3) are
defined there. Do not re-implement them — use the patterns as specified.

---

## Purpose

The Extraction page serves three distinct user types via two URL patterns:

- `/extract` — ClientAdmin org experience: master-detail layout
- `/extract/:id` — Direct link: GPT tool referral, shared link, or
  returning authenticated user. Auth state determines content depth.

| User type | URL | List visible | Detail depth |
|---|---|---|---|
| ClientAdmin (org) | `/extract` | Yes — always | Full: ReportExtraction + ClientExtraction metadata |
| ClientAdmin (org) | `/extract/:id` | Yes — always | Same; pre-selects matching record if in org history |
| Authenticated User (no org) | `/extract/:id` | No | Full ReportExtraction + org upgrade CTA |
| Unauthenticated | `/extract/:id` | No | Teaser only + auth gate |

---

## Route Configuration

Update `src/App.jsx` — the original scaffold has only `/extract` as a
ProtectedRoute. Add the public `:id` route:

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
Use the master-detail layout (Patterns §1). Left column 260px, right column
fills remaining width.

**User / unauthenticated (`/extract/:id` only):**
Single-column layout (Patterns §1), `max-width: 700px`, centered.

---

## Left Panel — Extraction History List (ClientAdmin only)

### Header
Follow the List Panel pattern (Patterns §7).
- Section label: `"EXTRACTIONS"`
- Primary action: `"+ New"` button — teal ghost, triggers UPLOAD state in
  detail panel and clears active selection

### Tag filter row
Fetch `GET /clients/:id/tags` on mount. Render filter chips (Patterns §9,
tag filter chips). `"All"` chip first, selected by default. Single-select.
Active tag re-fetches list with `?tag_id=` param.

### List items
Follow list item anatomy (Patterns §7):
1. Title: `display_name` if set, else `report_title` (denormalized)
2. Date row: `extracted_at` left. Status Badge right — **only for `failed`
   and `pending`** — omit for `complete` (Patterns §21)
3. Tag chips row: applied tags, read-only display
4. Status indicator: `"● Scenario created"` in teal-bright 10px mono,
   shown when `scenario_ids` is non-empty. Blank otherwise.
5. Retry action: `"↺ Retry"` button in amber, only on `failed` items.
   Clicking a failed item loads the detail panel showing the error state
   with a retry option — the retry does not trigger from the list directly.

### List API call
```
GET /clients/:client_id/extractions
  Auth: Bearer token
  Query: tag_id (when tag filter active)
  Returns: ClientExtraction[] desc by created_at
  Includes: embedded tags, report_title, extraction_status, extracted_at
```
Fetch on mount. Re-fetch after new extraction completes or record deleted.

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

**Quota display:**
Read `reports_used_this_period` and effective reports limit from the Client
object (fetched via `GET /clients/:client_id` on mount — available in
ClientAdmin auth context). Effective limit = `custom_reports_limit` if set,
otherwise read from the billing plan. Compute
`remaining = effective_limit - reports_used_this_period`.

Display as secondary text, 11px mono, right-aligned above upload zone:
`"{n} extractions remaining this period"`
If remaining is 0: amber text — `"Extraction limit reached for this period"`.
Disable upload zone and Extract button.

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
  file selected or if quota is 0.
- `"Cancel"` — variant `ghost`, left-aligned. Returns to EMPTY state.
  Not shown on `/extract/:id` flows.

---

### State 3 — LOADING

Replaces UPLOAD entirely on submit.

- `ProgressBar` component — `active={true}`,
  label `"Running extraction — this takes 30–60 seconds"`
- Below bar: `"Do not close this tab."` — secondary text, base size

**API call:**
```
POST /report-extractions
  Auth: Bearer token
  Body: multipart/form-data, field name "pdf"
  Returns: 201 ReportExtraction object (is_duplicate: false)
           200 existing ReportExtraction (is_duplicate: true)
  Side effect: ClientExtraction created atomically server-side
  Timeout: 300s (already configured in src/api/client.js — do not override)
```

**On `is_duplicate: true`** (org already extracted this PDF):
Treat as success — transition to RESULT with returned data.
Show Toast: variant `info`,
`"This report was already extracted. Showing existing results."`

**On success:** transition to RESULT, re-fetch list.
**On error:** transition to ERROR.

---

### State 4 — RESULT

#### Metadata bar (ClientAdmin only)
Follow the Metadata Bar pattern (Patterns §6). Slots:
1. Inline-editable display name (Patterns §18) —
   `PATCH /clients/:id/extractions/:id` with `{ display_name }`
2. Applied tags with `×` remove each —
   `DELETE /clients/:id/extractions/:id/tags/:tag_id`
   `"+ Add tag"` → tag dropdown (Patterns §9) —
   apply: `POST /clients/:id/extractions/:id/tags`
   create new: `POST /clients/:id/tags` then apply
3. `"Add note"` / truncated note — opens Drawer (480px), Textarea inside,
   auto-save on blur (Patterns §17) —
   `PATCH /clients/:id/extractions/:id` with `{ notes }`
4. Right-aligned: `"● Scenario created"` (teal-bright, 10px mono) if
   `scenario_ids` non-empty, else blank. Link navigates to scenario
   authoring — route TBD, use `#` for now.
5. Destructive: Trash2 icon button. Opens confirmation Modal:
   title `"Delete extraction record"`,
   body `"This removes it from your org history. The underlying extraction
   is not deleted."`, confirm button variant `destructive`.
   Blocked (disabled, tooltip `"Cannot delete — scenarios exist"`) if
   `scenario_ids` non-empty.
   On confirm: `DELETE /clients/:id/extractions/:id` → 204 →
   re-fetch list, transition to EMPTY.

#### Top bar (all user types)
Follow Detail Panel Top Bar pattern (Patterns §8):
- Left: Badge with `extraction_status` (always shown here — Patterns §21)
- Right (ClientAdmin only): `"New Extraction"` ghost button →
  transitions to UPLOAD state

#### Auth gate (unauthenticated only)
Follow Auth Gate Card pattern (Patterns §13). Render above teaser content.
- Title: `"You're viewing a WarPaths scenario extraction"`
- Body: `"Create a free account to see the full scenario brief, actor
  analysis, and story seeds extracted from this report."`
- Primary action: `"Create account"` → `/join?next=/extract/:id`
- Secondary action: `"Log in"` → `/login?next=/extract/:id`

#### Org CTA bar (authenticated User with no org)
Follow Org CTA Bar pattern (Patterns §14). Render above tabs.
- Text: `"Want to run this as a live wargame for your org? Create an org
  account to configure and invite participants."`
- Button: `"Create org account"` → `#` (route TBD)

#### Tabs
Follow Tab Pattern (Patterns §5). Four tabs for ClientAdmin,
three tabs for authenticated User (no org — Admin Notes tab hidden):

| Tab label | ClientAdmin | Authed User |
|---|---|---|
| Game Brief | ✓ | ✓ |
| Source Report | ✓ | ✓ |
| Admin Notes | ✓ | — |
| Extraction Details | ✓ | ✓ |

Active on mount: **Game Brief**.

---

#### Tab: Game Brief

Use Field Block pattern (Patterns §3) for each field.

**Why This Game** (`report_brief.why_this_game`)
Label: `"WHY THIS GAME"` — default field block

**Scenario Narrative** (`scenario_suggestion.scenario_narrative`)
Label: `"SCENARIO NARRATIVE"` — default field block, full render, no truncation

**Strategic Domain Tags** (`scenario_suggestion.strategic_domain_tags`)
Label: `"STRATEGIC DOMAIN TAGS"` — tag group variant (Patterns §3),
domain tag chips (Patterns §9)

**Suggested Turn Count** (`scenario_suggestion.suggested_turn_count`)
Label: `"SUGGESTED TURN COUNT"` — mono value variant (Patterns §3)

Section divider (Patterns §4), then:

Section label: `"SUGGESTED ACTORS"` (Patterns §10)

Render as `Table` component: Name | Role | Stance columns.
Map `actor_suggestions[]`:
- `name` → Name, primary text
- `role` → Role, secondary text
- `stance` → Stance, secondary text

If empty: secondary text `"No actors suggested."` in place of table.

---

#### Tab: Source Report

Report title (`report_brief.report_title`) — 17px, `font-weight: 600`,
primary text, `margin-bottom: 3px`. Not a field block — treated as a
page-level heading for this tab.

Publication (`report_brief.publication`) — 12px secondary text,
`margin-bottom: 12px`.

**Summary** (`report_brief.summary`)
Label: `"SUMMARY"` — secondary value variant field block (Patterns §3)

Section divider (Patterns §4), then:

Section label: `"INJECT SEEDS"` (Patterns §10)
Subheading: `"Story hooks drawn from the report"` — 11px secondary,
`margin-bottom: 10px`

Render each item in `inject_seeds[]` as a Seed Card (Patterns §12):
- Index: zero-padded (`"01"`, `"02"`)
- Body: `seed_text`
- Supporting detail: `"Suggested turn: {turn_suggestion}"` if present

If fewer than 5 seeds present: show Toast on RESULT entry —
variant `warning`,
`"Only {n} seeds returned — minimum is 5. Consider re-extracting."`

---

#### Tab: Admin Notes (ClientAdmin only)

Section label: `"ADMIN NOTES"` (Patterns §10)

Auto-save note field (Patterns §17):
- Placeholder: `"Add notes — authoring decisions, quality observations,
  follow-up items…"`
- Value: `clientExtraction.notes` (may be null — empty textarea if so)
- On blur: `PATCH /clients/:id/extractions/:id` with `{ notes }`

---

#### Tab: Extraction Details

**Confidence Score** (`confidence_score`)
Label: `"CONFIDENCE SCORE"` — use Confidence Meter pattern (Patterns §16)

**Extraction Notes** (`extraction_notes`)
Label: `"EXTRACTION NOTES"` — secondary value variant field block.
If null: show `"—"` in secondary text.

Section divider (Patterns §4), then:

Stat grid (Patterns §11):

| Label | Field | Notes |
|---|---|---|
| Source Document | `source_filename` | mono value |
| Status | `extraction_status` | Badge component |
| SHA-256 Fingerprint | `pdf_fingerprint` | truncate to 16 chars + `…` |
| Extraction ID | `id` | truncate to 12 chars + `…` |
| Created | `created_at` | formatted: `"Apr 9, 2026 · 14:32 UTC"` |
| Extractions Used | `reports_used_this_period` from Client object | e.g. `"4 of 10 this period"` |

`"Extractions Used"` spans full width (`grid-column: 1 / -1`).

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

## Key Actions

| Action | Trigger | API call |
|---|---|---|
| Load history list | Page mount (ClientAdmin) | `GET /clients/:id/extractions` |
| Load Client for quota | Page mount (ClientAdmin) | `GET /clients/:id` |
| Filter list by tag | Tag chip click | Re-fetch with `?tag_id=` |
| Select record | List item click | `GET /clients/:id/extractions/:id` + `GET /report-extractions/:id` |
| Load by URL param | Page mount with `:id` | `GET /report-extractions/:id` (no auth required) |
| Upload and extract | Extract button | `POST /report-extractions` (multipart, field: `pdf`) |
| Handle duplicate | `is_duplicate: true` response | Info Toast, treat as success |
| Edit display name | Inline click + blur/Enter | `PATCH /clients/:id/extractions/:id` |
| Add / edit note | Drawer blur | `PATCH /clients/:id/extractions/:id` |
| Fetch tag library | `"+ Add tag"` click | `GET /clients/:id/tags` |
| Create and apply tag | New tag + enter | `POST /clients/:id/tags` → apply |
| Apply existing tag | Tag dropdown select | `POST /clients/:id/extractions/:id/tags` |
| Remove tag | Chip `×` | `DELETE /clients/:id/extractions/:id/tags/:tag_id` |
| Delete record | Confirm modal | `DELETE /clients/:id/extractions/:id` |
| Create account | Auth gate button | Navigate `/join?next=/extract/:id` |
| Log in | Auth gate button | Navigate `/login?next=/extract/:id` |
| Create org account | Org CTA button | Navigate `#` (TBD) |
| New extraction (from result) | `"New Extraction"` button | Transition to UPLOAD |

---

## API Reference

```
POST /report-extractions                    multipart/form-data, field "pdf"
GET  /report-extractions/:id               no auth required
GET  /report-extractions                   list (staff/admin use)
PATCH /report-extractions/:id              field corrections (staff/admin)

GET    /clients/:id                         for quota display
GET    /clients/:id/extractions             history list
GET    /clients/:id/extractions/:id         single record
PATCH  /clients/:id/extractions/:id         display_name, notes
DELETE /clients/:id/extractions/:id         delete record

POST   /clients/:id/extractions/:id/tags           apply tag
DELETE /clients/:id/extractions/:id/tags/:tag_id   remove tag

GET    /clients/:id/tags                    tag library
POST   /clients/:id/tags                    create tag
```

Implement all functions in `src/api/extraction.js` before building
the page component.

---

## Component Usage

| Component | Usage |
|---|---|
| `PageShell` | Outer wrapper, no sidebar |
| `Button` | Extract, New Extraction, Cancel, Try Again, CTAs |
| `Badge` | Extraction status |
| `Table` | Suggested actors |
| `Input` | Inline display name editing |
| `Textarea` | Notes content inside Drawer |
| `Drawer` | Notes editing panel (480px default width) |
| `Modal` | Delete confirmation |
| `Toast` | Duplicate info, seed warning |
| `ProgressBar` | Loading state |
| `Skeleton` | List and detail loading states |

Tag chips, the tag dropdown, seed cards, and the stat grid are implemented
as local sub-components inside `ExtractionPage.jsx`. Do not add them to
`src/components/ui/`.

---

## Constraints

- `GET /report-extractions/:id` requires no auth. The axios interceptor
  attaches a token only if present — no special handling needed.
- ReportExtraction content is read-only on this page. Only ClientExtraction
  metadata (display_name, notes, tags) is editable.
- Duplicate detection is via `is_duplicate: true` in the POST response —
  not a 409 status code. Handle accordingly.
- ClientAdmins always see the list panel. When arriving at `/extract/:id`,
  pre-select the matching ClientExtraction if it exists in org history.
  If not (extraction belongs to another org or is a free user extraction),
  load detail read-only with no list selection highlighted.
- `free_extraction_id` on User is staff-managed server-side. The frontend
  does not write this field — do not implement any PATCH to User on this page.
- Tag rename and tag library delete are scoped to OrgManagementPage —
  not implemented here. Only applying and removing tags on an extraction
  is in scope.
- Page does not persist scroll position or selected record across navigation.

# WarPaths Frontend — Page Design Patterns
`docs/page-design-patterns.md`

Read this document at the start of every page build session alongside
`docs/design-tokens.md` and `docs/components.md`. It defines the visual
grammar that all pages share. Page-specific docs describe what goes on a
page; this doc describes how everything looks and behaves.

Do not deviate from these patterns without explicit instruction in the
page-specific doc.

---

## 1. Page Shell & Layout Modes

All pages use `PageShell`. Two layout modes exist:

### Single-column (no sidebar)
- `<PageShell sidebar={false}>`
- Content centered, `max-width: 900px` for form/detail pages,
  `max-width: 1200px` for data-heavy pages
- Padding: `40px 24px`

### Master-detail (no sidebar)
- `<PageShell sidebar={false}>` with a custom two-column layout inside
- Left column: `260px` fixed width, full viewport height, `overflow-y: auto`
- Right column: `flex: 1`, full viewport height, `overflow-y: auto`
- Dividing border: `1px solid var(--border-subtle)` on right edge of left column
- Neither column has outer padding — padding lives inside each panel's content areas
- Mobile breakpoint (`< 768px`): stack vertically. Left panel collapses to show
  3 most recent items with "Show all" toggle. Right panel fills full width below.

### Page with sidebar
- `<PageShell sidebar={true}>` — reserved for future admin/authoring pages
- Not used in Milestone 5–6 scope

---

## 2. Page Header (Global)

The `Header` component renders on every authenticated page. Height `56px`.
Primary background, `border-bottom: 1px solid var(--border-subtle)`.

- Left: SVG hex mark (30×29, hex polygon with red stroke + red italic "W") + `"WARPATHS"` wordmark — Black Ops One, 18px, `letter-spacing: 0.04em`,
  `font-weight: 400`, primary text color. SVG sits 10px left of the wordmark.
- Right: user display name + ChevronDown icon — 12px, secondary text color.
  Dropdown on click: secondary background, subtle border, items for
  My Account, Leaderboard, Log out. Org admins also see Org Management.

Unauthenticated pages (`/extract/:id`, `/login`, `/join`): Header still renders
but right side shows nothing or "Not signed in" in disabled text color.

---

## 3. Field Block Pattern

The most common display unit on the platform. Used everywhere content is
labelled and displayed.

```
[LABEL]           ← 10px IBM Plex Mono, uppercase, letter-spacing 0.10em,
                     var(--text-secondary), margin-bottom 5px
[Content value]   ← 13px IBM Plex Sans, var(--text-primary), line-height 1.65
                     margin-bottom 18px (between field blocks)
```

Variants:
- **Default:** label + prose value as above
- **Mono value:** value uses IBM Plex Mono 12px (for IDs, fingerprints, counts)
- **Secondary value:** value uses `var(--text-secondary)` — for supporting
  detail that doesn't need full primary weight (summaries, notes, metadata)
- **Tag group:** value is a flex-wrap row of domain tag chips (see Section 9)

Never hardcode font sizes or colors in field blocks — always use tokens.

---

## 4. Section Divider

Between major content sections within a scrollable panel or tab:

```css
border: none;
border-top: 1px solid var(--border-subtle);
margin: 18px 0;
```

No decorative elements. No section headings above dividers unless the
page-specific doc explicitly calls for a section label (see Section 10).

---

## 5. Tab Pattern

Used when a detail panel or page has multiple content groupings.

**Container:**
```css
display: flex;
border-bottom: 1px solid var(--border-subtle);
background: var(--bg-primary);
```

**Each tab:**
```css
flex: 1;                          /* equal width — always full-width divided */
text-align: center;
font-size: 10px;
font-family: var(--font-mono);
text-transform: uppercase;
letter-spacing: 0.08em;
color: var(--text-secondary);
padding: 10px 4px;
cursor: pointer;
border-bottom: 2px solid transparent;
margin-bottom: -1px;              /* flush with container border */
white-space: nowrap;
```

**Active tab:**
```css
color: var(--text-primary);
border-bottom-color: var(--accent-red);
```

**Hover (inactive):**
```css
color: var(--text-primary);
```

Rules:
- Tabs always span the full width of their container equally — no auto-width tabs
- Tab labels are short (1–2 words max). Keep label length visually balanced
  across the tab set — a 4-tab row should have roughly equal label character counts
- Active tab is always set on mount — never render a tab panel with no active tab
- Tab switching is client-side only — no API call on tab change unless the tab's
  content hasn't been fetched yet (lazy load on first activation)
- No icons in tabs

---

## 6. Metadata Bar Pattern

Used in master-detail layouts directly below the detail panel's top bar.
Sits between the top bar and the tab row.

```css
display: flex;
align-items: center;
gap: 12px;
padding: 9px 20px;
background: var(--bg-secondary);
border-bottom: 1px solid var(--border-subtle);
flex-wrap: wrap;
```

Standard slot order (left to right):
1. **Inline-editable name** — 13px, `font-weight: 500`, primary text.
   Dashed bottom border (`1px dashed var(--border-active)`) signals editability.
   Click → renders inline `Input` component. Save on blur or Enter.
   `PATCH` the record immediately on save. No explicit save button.
2. **Tag chips** — applied tags with `×` remove button each, then `+ Add tag`
   ghost action (see Section 9 for tag chip spec)
3. **Notes shortcut** — `"Add note"` or truncated note preview (40 chars),
   secondary text, dashed underline. Click opens Drawer.
4. **Right-aligned secondary info** — pushed with `margin-left: auto`.
   Examples: "● Scenario created" in teal-bright, scenario count links.
5. **Destructive action** — far right, icon button only (Trash2), destructive
   color. Always last in the bar.

The metadata bar is only shown for authenticated users with org context
(ClientAdmin). It is not shown in single-column user or unauthenticated views.

---

## 7. List Panel Pattern (Master-Detail Left Column)

### Header area
```css
padding: 12px 14px 8px;
border-bottom: 1px solid var(--border-subtle);
```
- Top row: section label (10px mono uppercase secondary) left,
  primary action button (`"+ New"`, ghost/teal) right
- Below: tag filter row (see Section 9)

### List items
```css
padding: 10px 14px 10px 11px;   /* 11px left to allow 3px selection border */
border-bottom: 1px solid var(--border-subtle);
border-left: 3px solid transparent;
cursor: pointer;
```

Selected state:
```css
background: var(--bg-elevated);
border-left-color: var(--accent-red);
```

Hover state:
```css
background: var(--bg-elevated);
```

**Item anatomy (top to bottom):**
1. Title — 13px primary text, single line, truncated with ellipsis
2. Date row — 11px secondary text left, status Badge right (only if status
   is `failed` or `pending` — omit badge for `complete` to save space)
3. Tag chips row — applied tags, 10px mono, disabled color (read-only in list)
4. Status indicator — `"● Scenario created"` or equivalent in teal mono 10px,
   only when a meaningful downstream action has occurred. Blank otherwise.
5. Action (failed state only) — `"↺ Retry"` button in amber, below status row

Minimum item height: auto. No fixed heights — let content breathe.

### Empty states
Centered in the list area, secondary text, base size:
- No records: descriptive message + secondary action button
- No filter results: `"No [items] match this filter."`

---

## 8. Detail Panel Top Bar

Sits at the very top of the detail panel, above the metadata bar and tabs.
Height `44px`. Sticky within the panel.

```css
display: flex;
align-items: center;
justify-content: space-between;
padding: 0 20px;
border-bottom: 1px solid var(--border-subtle);
background: var(--bg-primary);
position: sticky;
top: 0;
z-index: 2;
```

- Left slot: status Badge or contextual label
- Right slot: primary ghost action for the panel (e.g. `"New Extraction"`,
  `"New Game"`) — variant `ghost`, sm size. Only shown when relevant.

In single-column views (`/extract/:id`), the top bar renders as a simpler
`44px` strip with `border-bottom` — no sticky behavior needed since the
page scrolls naturally.

---

## 9. Tag & Chip Patterns

### Domain tag chips (read-only display)
Used for `strategic_domain_tags` and similar taxonomy fields:
```css
font-size: 10px;
font-family: var(--font-mono);
padding: 3px 8px;
border-radius: 2px;
background: var(--bg-elevated);
border: 1px solid var(--border-subtle);
color: var(--text-secondary);
```
Rendered in a `flex-wrap` row with `gap: 5px`.

### Applied tag chips (editable, in metadata bar)
```css
font-size: 10px;
font-family: var(--font-mono);
padding: 2px 7px;
border-radius: 2px;
background: var(--bg-elevated);
border: 1px solid var(--border-active);
color: var(--text-secondary);
display: flex;
align-items: center;
gap: 4px;
```
Each chip includes an `×` remove button: `font-size: 9px`,
`color: var(--text-disabled)`, cursor pointer.

### Tag filter chips (list panel filter row)
```css
font-size: 10px;
font-family: var(--font-mono);
padding: 3px 8px;
border-radius: 2px;
background: var(--bg-elevated);
border: 1px solid var(--border-subtle);
color: var(--text-secondary);
cursor: pointer;
white-space: nowrap;
```
Active (selected) state:
```css
border-color: var(--accent-teal);
color: var(--accent-teal-bright);
```
`"All"` chip always first, selected by default, single-select only.

### Tag dropdown (add tag interaction)
Opens on `"+ Add tag"` click. Implemented as a local positioned div —
not the `Select` component. Contains:
- Text input at top (12px, secondary background, subtle border) for
  filtering existing tags or typing a new tag name
- List of existing org tags below — 36px items, hover elevated background
- If typed name doesn't match any existing tag: show
  `'Create "{name}"'` option at bottom in teal text
- Selecting existing tag: `POST .../tags` apply call
- Selecting create: `POST .../tags` create call then apply call
- Dismiss on outside click or Escape

---

## 10. Section Label

Used as a heading above a content group within a tab or scrollable area.
Not used between every field block — only at the top of a named group.

```css
font-size: 10px;
font-family: var(--font-mono);
text-transform: uppercase;
letter-spacing: 0.10em;
color: var(--text-secondary);
margin-bottom: 10px;
```

Followed immediately by the first field block or table in that group.
Do not add extra top margin above a section label that follows a section
divider — the divider provides the spacing.

---

## 11. Stat Grid (Metadata / Details)

Used in Extraction Details tabs and similar summary areas.

```css
display: grid;
grid-template-columns: 1fr 1fr;
gap: 8px;
```

Each cell:
```css
background: var(--bg-secondary);
border: 1px solid var(--border-subtle);
border-radius: 3px;
padding: 10px 12px;
```

Cell label: 10px mono uppercase tracked secondary color, `margin-bottom: 4px`
Cell value: 11px mono primary text, `word-break: break-all`

Use `grid-column: 1 / -1` on a cell that should span full width.

---

## 12. Seed Card Pattern

Used for `inject_seeds` and similar sequential content items.

```css
background: var(--bg-secondary);
border: 1px solid var(--border-subtle);
border-radius: 3px;
padding: 12px 14px;
margin-bottom: 8px;
```

Internal layout (top to bottom):
1. Index — 10px mono disabled color, `margin-bottom: 5px` (e.g. `"01"`, `"02"`)
2. Body text — 12px primary text, `line-height: 1.6`
3. Supporting detail (optional) — 11px secondary text, `margin-top: 5px`
   (e.g. `"Suggested turn: 2"`)

---

## 13. Auth Gate Card

Used on public pages when unauthenticated users encounter gated content.

```css
background: var(--bg-secondary);
border: 1px solid var(--border-active);
border-radius: 3px;
padding: 20px 22px;
margin-bottom: 22px;
```

Internal layout:
1. Title — 15px, `font-weight: 600`, primary text, `margin-bottom: 7px`
2. Body — 13px, secondary text, `line-height: 1.6`, `margin-bottom: 14px`
3. Actions row — `display: flex; gap: 10px`. Primary action = `btn-primary`,
   secondary action = `btn-secondary`

Always rendered above the teaser content block, never below it.

---

## 14. Org CTA Bar

Used on authenticated pages when a user has no org context and an upgrade
path is relevant.

```css
background: var(--bg-secondary);
border: 1px solid var(--border-subtle);
border-left: 3px solid var(--accent-amber);  /* amber = soft prompt, not error */
border-radius: 3px;
padding: 13px 18px;
margin-bottom: 18px;
display: flex;
align-items: center;
justify-content: space-between;
gap: 16px;
```

- Left: 13px secondary text, `line-height: 1.5`. Concise — one sentence.
- Right: `btn-primary-sm` — never `btn-primary` (full-size primary would
  dominate the page). White space on the left button is the CTA hierarchy.

---

## 15. Teaser Fade Pattern

Used when showing partial content to unauthenticated users.

Wrap the content block in a `position: relative` container with
`overflow: hidden; max-height: [N]px`. Inside, place the full content div
followed by an absolutely positioned fade overlay:

```css
/* fade overlay */
position: absolute;
bottom: 0; left: 0; right: 0;
height: 56px;
background: linear-gradient(transparent, var(--bg-primary));
pointer-events: none;
```

Below the container (not inside it): a teal mono 11px link —
`"Create an account to see the full extraction →"` — `letter-spacing: 0.04em`.

Show the Scenario Narrative (not the report summary) as teaser content —
it creates more pull toward signup than a generic executive summary.

---

## 16. Confidence Meter

Used for AI-generated confidence scores (0–1 float displayed as percentage).

```
[LABEL]
[track ——————●—————] [82%]
```

Track: `height: 4px`, `background: var(--bg-elevated)`, `border-radius: 2px`,
`flex: 1`.

Fill color by value:
- ≥ 0.70 → `var(--accent-teal)`, percentage label `var(--accent-teal-bright)`
- 0.50–0.69 → `var(--accent-amber)`, percentage label `var(--accent-amber)`
- < 0.50 → `var(--accent-red)`, percentage label `var(--accent-red)`

Percentage label: 11px mono, `min-width: 32px`, right-aligned.

---

## 17. Auto-Save Note Fields

Used for freeform note/annotation fields where explicit Save buttons
add unnecessary friction.

- Render as `Textarea` component, `rows={6}` default, vertical resize only
- `background: var(--bg-secondary)`, `border: 1px solid var(--border-active)`
- Focus state: `border-color: var(--accent-teal)`, no box shadow
- On blur: fire `PATCH` API call with updated value
- On success: show `"Saved"` in 11px mono disabled color below the textarea,
  fade out after 2000ms (`opacity` transition)
- No explicit Save or Cancel buttons
- Placeholder text describes purpose: e.g.
  `"Add notes — authoring decisions, quality observations, follow-up items…"`

---

## 18. Inline Editable Name Fields

Used for display names, record titles, and similar short editable strings
in the metadata bar.

- Default state: render as styled `<span>`, `font-weight: 500`, primary text,
  `border-bottom: 1px dashed var(--border-active)` (signals editability)
- Click: replace with `Input` component, same font size, auto-focused
- Save on blur or Enter key: fire `PATCH` API call
- Cancel on Escape: revert to original value, return to span
- No save/cancel buttons

---

## 19. Empty and Loading States

### Loading (data not yet fetched)
Use `Skeleton` component. Match the shape of the expected content:
- List items: three skeleton rows, each with two lines (title height + meta height)
- Detail panel: skeleton block for title area, three skeleton field blocks
- Tables: skeleton rows matching expected row count (use 3–4 as default)

Never show a blank panel while data is loading.

### Empty (data fetched, zero results)
Center a `FileText` or relevant Lucide icon (40px, secondary color) with:
- Primary text: short description of the empty state — h3
- Secondary text: one sentence suggesting the next action — base size
- Optional: a single action button

### Error (API call failed)
Use the standard error treatment from the page-specific doc. Always show:
- `AlertTriangle` icon (32px, red)
- Heading: `"[Action] failed"` — h3
- Detail: API error message if present, fallback generic message
- Recovery action: button to retry or return to previous state

---

## 20. Button Hierarchy on a Page

Never place two `primary` variant buttons in the same visual area.
Use this hierarchy:

| Context | Variant |
|---|---|
| Primary page action (one per view) | `primary` |
| Secondary option alongside primary | `secondary` |
| Inline panel actions, tab-level actions | `ghost` |
| Destructive actions (delete, remove) | `destructive` |
| Icon-only actions in dense layouts | `icon` |
| Compact primary CTA in banners/bars | `btn-primary-sm` (local style) |

Disabled states: always show disabled styling rather than hiding the button
when the action is temporarily unavailable — hiding removes affordance.

---

## 21. Status Badge Usage

Badges render inline, never as block elements. Use the `Badge` component
with the `status` prop. Do not render badges for `complete` status in list
items where space is at a premium — presence in the list without a badge
implies completion. Reserve badges in list items for `failed`, `pending`,
and `locked` states that require user attention.

In detail panel top bars and stat grid cells, always show the full status badge.

---

## How to Reference This Document

In page-specific docs, reference these patterns by section number:

> "Use the Field Block pattern (Patterns §3) for each extraction field."
> "Render the tab set using the Tab Pattern (Patterns §5)."
> "Apply the Auth Gate Card (Patterns §13) above the teaser content."

If a page requires a deviation from any pattern, the page-specific doc
will state this explicitly with the reason. In the absence of explicit
override, the pattern in this document is authoritative.

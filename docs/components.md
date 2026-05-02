# WarPaths Component Library
`docs/components.md`

Read this document at the start of every page build session. All reusable
components live in `src/components/`. Do not recreate any component that
exists here — use it as-is. If you need a new component, add it to
`src/components/ui/` and document it here.

---

## UI Components (`src/components/ui/`)

### Button
`Button.jsx` + `Button.module.css`

Props: `variant` (primary | secondary | ghost | destructive | icon),
`size` (sm | md), `disabled`, `loading`, `onClick`, `children`, `icon`

- **primary** — red background (`--accent-red`), white text
- **secondary** — transparent bg, `--border-active` border, primary text
- **ghost** — no bg, no border, secondary text color
- **destructive** — transparent, muted red border (`--accent-red-muted`) and red text
- **icon** — 32×32 square, no bg, icon child only
- **loading** — small spinner inline, pointer-events disabled
- **disabled** — muted colors, no pointer events on all variants

---

### Badge
`Badge.jsx` + `Badge.module.css`

Props: `status` (draft | pending | active | complete | approved | rejected |
failed | locked | validated)

Inline element. 11px IBM Plex Mono, uppercase, 2px radius, no border.
Each status maps to a bg/text token pair from tokens.css.

---

### Input
`Input.jsx` + `Input.module.css`

Props: `label`, `type`, `placeholder`, `value`, `onChange`, `error`,
`disabled`, `hint`

Label: 12px mono uppercase tracked secondary color, above field.
Field: secondary bg, `--border-subtle` border, teal focus ring.
Error: red border, red message below. Hint: secondary text below, 12px.

---

### Textarea
`Textarea.jsx` + `Textarea.module.css`

Same treatment as Input.
Additional props: `rows` (default 5), `resize` (vertical only via CSS).

---

### Select
`Select.jsx` + `Select.module.css`

Props: `label`, `options` (array of {value, label}), `value`, `onChange`,
`error`, `disabled`

Custom-styled — not the browser default. Lucide ChevronDown icon.
Dropdown panel: secondary bg, items 36px tall, hover elevated bg, selected state.

---

### Toggle
`Toggle.jsx` + `Toggle.module.css`

Props: `label`, `description`, `checked`, `onChange`, `disabled`

Track: off = `--border-active` bg, on = `--accent-teal`.
Thumb: white/primary text color. Label right. Description below in secondary.
150ms transition.

---

### Card
`Card.jsx` + `Card.module.css`

Props: `variant` (default | active | warning | stat), `onClick`, `children`

- **default** — secondary bg, subtle border
- **active** — elevated bg, 3px red left border
- **warning** — secondary bg, 3px amber left border
- **stat** — default card; large mono number + label layout for stats
- Clickable: hover darkens border, cursor pointer

---

### Table
`Table.jsx` + `Table.module.css`

Components: `Table`, `TableHead`, `TableBody`, `TableRow`, `TableCell`

TableRow props: `clickable`, `active`, `onClick`
TableCell props: `variant` (primary | secondary | mono | badge | action)

Header: elevated bg, 10px mono uppercase tracked labels.
Body rows: transparent bg, hover elevated, active has red left border.
Action cells: visible on row hover only.

---

### Modal
`Modal.jsx` + `Modal.module.css`

Props: `open`, `onClose`, `title`, `size` (default | wide), `children`, `footer`

Overlay: semi-transparent black. Panel: secondary bg, subtle border, 4px radius.
Header: title left, close (X) right. Footer: right-aligned button slot.
Animation: fade + scale, 150ms. Closes on overlay click and Escape.

---

### Drawer
`Drawer.jsx` + `Drawer.module.css`

Props: `open`, `onClose`, `title`, `width` (default 480 | wide 640), `side` (`'left' | 'right'`, default `'right'`), `children`

Slides in from the specified side. Border on inner edge uses `--border-subtle`
(left border when `side="right"`, right border when `side="left"`).
Close button top right. Animation: translate from the chosen side, 200ms.

---

### Toast / ToastContext
`Toast.jsx` + `Toast.module.css`
`src/context/ToastContext.jsx` — exports `useToast()` hook

Props: `message`, `variant` (error | success | warning | info)

Top-right position. Dark surface, left border in variant color.
Auto-dismisses after 5 seconds. Manual dismiss button. Multiple toasts stack.

Usage: `const { showToast } = useToast(); showToast('Message', 'success');`

---

### Skeleton
`Skeleton.jsx` + `Skeleton.module.css`

Props: `width`, `height`, `variant` (text | rect | circle)

Shimmer animation secondary → elevated bg, 1.5s loop.
Use as placeholder while API data loads.

---

### ProgressBar
`ProgressBar.jsx` + `ProgressBar.module.css`

Props: `label`, `active`

3px tall teal bar at top of a panel. Animates left-to-right in loop.
Label below: secondary text, 13px. Only visible when `active={true}`.
Used for long AI API calls (extraction, advisor, game eval).

---

### StepIndicator
`StepIndicator.jsx` + `StepIndicator.module.css`

Props: `steps` (array of {label, status: complete|active|upcoming})

Horizontal sequence:
- complete → teal circle + checkmark icon
- active → red circle + step number + red label text
- upcoming → dark gray circle + step number + secondary label text
Connector lines between steps: subtle color, teal when left step is complete.

---

## Board Components (`src/components/board/`)

### TensionIndicator
`TensionIndicator.jsx` + `TensionIndicator.module.css`

Props: `name`, `currentLevel` (1–7), `previousLevel`

7 horizontal segments. Colors: 1–2 teal, 3 amber, 4–7 red.
Current level: filled segment with glow. Full width, 48px including label.

### DimensionRow
`DimensionRow.jsx` + `DimensionRow.module.css`

Props: `name`, `currentValue` (1–5), `previousValue`

5-position track. Filled circle marker. Color shifts teal→amber→red by value.
Delta indicator: ↑ teal if value decreased (more stable), ↓ red if increased.
Height: 36px.

### DimensionBoard
`DimensionBoard.jsx` + `DimensionBoard.module.css`

Props: `tensionIndicator`, `dimensions`, `tensionNarrative`

Renders TensionIndicator above DimensionRow list.
Tension narrative below: italic 13px secondary, max 3 lines with expand toggle.

---

## Layout Components (`src/components/layout/`)

### Header
`Header.jsx`

See `page-design-patterns.md` §2 for the wordmark, dropdown, and unauthenticated states.

Org branding (right of wordmark): if `client.logo_url` is present, render the org logo as `<img>` — `max-height: 28px`, `max-width: 80px`, `object-fit: contain`. If absent, render the client display name in 12px secondary text. Only shown when Client context exists.

### Sidebar
`Sidebar.jsx`

Props: `items` (array of {label, icon, path, active})

220px, primary bg, right border. Items 44px tall.
Active: red left border, primary text. Hover: secondary bg.

### PageShell
`PageShell.jsx`

Props: `sidebar` (boolean), `sidebarItems`, `title`, `children`

With sidebar: flex row, sidebar 220px fixed left, content fills remainder.
Without sidebar: single column, content centered, max-width 1200px.

### ProtectedRoute
`ProtectedRoute.jsx`

Checks `sessionStorage.warpaths_token`. Redirects to `/login` if absent.
Renders children if present.

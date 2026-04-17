# WarPaths Design Direction
`docs/design-tokens.md`

Read this document at the start of every session. All visual decisions trace
back to CSS custom properties defined in `src/styles/tokens.css`. Never hardcode
a color, font, or spacing value in any component.

---

## Visual Language

Dark, high-contrast, utilitarian. This is a war game platform — not a consumer
product. Every visual choice should feel earned and purposeful. Decorative
elements are avoided; information density is prized.

- **Backgrounds are very dark** — near-black with blue-grey tint
- **Text is cool off-white** — not pure white, not warm
- **Accents are used sparingly** — red for primary actions and active states,
  teal for success/completion/positive movement, amber for warnings only
- **Monospace font** is used for labels, metadata, identifiers, and numbers
- **No gradients, no shadows, no rounded corners beyond 4px**
- **Borders instead of shadows** to separate surfaces

---

## Color Palette

### Backgrounds
| Token | Value | Use |
|---|---|---|
| `--bg-primary` | `#0A0C0F` | Page background, Header, Sidebar |
| `--bg-secondary` | `#12161C` | Cards, panels, input backgrounds |
| `--bg-elevated` | `#1A2030` | Modals, dropdowns, hover states |

### Accents
| Token | Value | Use |
|---|---|---|
| `--accent-red` | `#C41E3A` | Primary CTA, active state left border, active tab underline |
| `--accent-red-muted` | `#8B1A2A` | Destructive button border |
| `--accent-teal` | `#1A9B8A` | Success, completion, stable indicators, toggle-on |
| `--accent-teal-bright` | `#22C4B0` | Completion text, teal accent text |
| `--accent-amber` | `#D48B2A` | Warnings only — quota alerts, retry actions, org CTA border |

### Text
| Token | Value | Use |
|---|---|---|
| `--text-primary` | `#E8EDF2` | All primary content |
| `--text-secondary` | `#8A9BB0` | Labels, metadata, supporting text |
| `--text-disabled` | `#4A5568` | Disabled states, placeholder hints |

### Borders
| Token | Value | Use |
|---|---|---|
| `--border-subtle` | `#1E2A3A` | Default dividers, card borders |
| `--border-active` | `#2A3F5A` | Input borders, editable field signals |

### Status Colors
Each status has a bg + text token pair. Applied via the `Badge` component.
Statuses: `draft`, `pending`, `active`, `complete`, `rejected`, `locked`.

---

## Typography

### Fonts
- **IBM Plex Sans** (400, 500, 600) — all prose, UI text, buttons, labels
- **IBM Plex Mono** (400, 500) — all identifiers, metadata, badges, section labels,
  numeric values, the WARPATHS wordmark

Loaded via Google Fonts in `src/styles/global.css`.

### Scale
| Token | Size | Use |
|---|---|---|
| `--text-xs` | 11px | Mono metadata, badges, chips, status indicators |
| `--text-sm` | 12px | Field labels (uppercase tracked), secondary detail |
| `--text-base` | 14px | Default body text |
| `--text-md` | 15px | Slightly larger body, emphasis text |
| `--text-lg` | 18px | `h4` headings |
| `--text-xl` | 24px | `h3` headings |
| `--text-2xl` | 28px | `h2` headings |
| `--text-3xl` | 32px | `h1` headings |

### Label convention
Section labels and field labels use:
```
10–12px · IBM Plex Mono · uppercase · letter-spacing: 0.08–0.10em · var(--text-secondary)
```

---

## Spacing

8px base grid. All spacing tokens are multiples of 4px.

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |

---

## Border Radius

Minimal rounding. This is a technical platform.

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 2px | Chips, badges, tag pills |
| `--radius` | 3px | Cards, inputs, most panels |
| `--radius-md` | 4px | Modals, drawers |

---

## Transitions

| Token | Value | Use |
|---|---|---|
| `--transition-fast` | 150ms ease | Hover states, toggle thumb |
| `--transition-base` | 200ms ease | Panel open/close, drawer slide |

---

## Layout Principles

- **Never center content with `text-align: center`** except within buttons or
  empty-state panels
- **Sidebar is 220px** — reserved for future authoring pages
- **Master-detail left column is 260px** — extraction list, game list
- **Max-width: 900px** for form/detail single-column pages
- **Max-width: 1200px** for data-heavy single-column pages
- **Header is always 56px**, sticky, present on all pages including public ones
- **No box shadows** — use borders to separate surfaces

---

## Do Not

- Do not introduce Tailwind, Bootstrap, or any CSS utility library
- Do not use CSS-in-JS or styled-components
- Do not hardcode colors, fonts, or spacing values anywhere
- Do not add decorative elements (dividers with icons, gradient headers, etc.)
- Do not deviate from the border-radius scale
- Do not use animations beyond the defined transition tokens

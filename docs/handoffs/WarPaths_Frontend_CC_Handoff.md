# WarPaths Frontend — Repository Setup & Initial Build Handoff
## For use in a new Claude Code session
## April 2026

---

## Context

This is a new standalone frontend repository for the WarPaths platform. It connects
to an existing Render API backend. The backend is complete and deployed — this session
is frontend only.

**Backend base URL:** `https://warpaths-api.onrender.com`
**API documentation:** Available in the backend repo at `docs/api/` and `docs/curls.md`
**Design specification:** Provided inline in this document and in the `docs/` folder
that will be created in this session.

This frontend is being built with Claude Code. The goal is a maintainable structure
where individual pages and components can be adjusted by referencing a specific
instruction file — without risking changes to unrelated parts of the UI.

---

## Session Goals

This session does two things in order:

1. **Set up the repository structure** — create the repo scaffold, install dependencies,
   seed all instruction `.md` files, establish the design token system
2. **Build the component library** — implement every reusable component before
   any page is built

Do not build any pages this session. Pages are built in subsequent sessions,
one at a time, each referencing its own instruction file.

---

## Technology Stack

- **Framework:** React 18 with Vite
- **Styling:** CSS Modules (one `.module.css` per component) — no Tailwind, no
  styled-components. CSS variables for design tokens.
- **Routing:** React Router v6
- **HTTP client:** `axios` with a configured instance that attaches auth headers
- **State:** React context for auth state only. No Redux. Component-local state
  for everything else.
- **Icons:** Lucide React (consistent, line-weight icons)
- **Font loading:** Google Fonts (IBM Plex Sans + IBM Plex Mono)
- **No UI component library** — all components are custom-built per the design spec

---

## Part 1 — Repository Setup

### Step 1 — Initialize the project

```bash
npm create vite@latest warpaths-frontend -- --template react
cd warpaths-frontend
npm install
npm install react-router-dom axios lucide-react
```

### Step 2 — Create the folder structure

```
warpaths-frontend/
  docs/
    design-tokens.md
    components.md
    pages/
      login.md
      signup.md
      game.md
      extraction.md
      org-management.md
      leaderboard.md
      account.md
  src/
    api/
      client.js           ← axios instance with auth header injection
      auth.js             ← auth API calls
      extraction.js       ← report extraction API calls
      game.js             ← game runtime API calls
      scenario.js         ← scenario/config API calls
      user.js             ← user API calls
      leaderboard.js      ← leaderboard API calls
    components/
      ui/                 ← atomic components (Button, Badge, Card, etc.)
      layout/             ← layout components (Header, Sidebar, PageShell)
      board/              ← DimensionSnapshot board components
      game/               ← game-specific components (AdvisorPanel, ContentItem, etc.)
    context/
      AuthContext.jsx     ← user session state
    hooks/
      useApi.js           ← generic API call hook with loading/error state
      useAuth.js          ← auth context hook
    pages/
      LoginPage.jsx
      SignupPage.jsx
      GamePage.jsx
      ExtractionPage.jsx
      OrgManagementPage.jsx
      LeaderboardPage.jsx
      AccountPage.jsx
    styles/
      tokens.css          ← CSS custom properties (design tokens)
      reset.css           ← minimal CSS reset
      global.css          ← global typography and base styles
    App.jsx               ← router configuration
    main.jsx              ← entry point
  .env.example            ← VITE_API_BASE_URL=https://warpaths-api.onrender.com
  README.md
```

Create all folders and empty placeholder files. Do not write component code yet —
just the structure.

### Step 3 — Seed the design token CSS file

Create `src/styles/tokens.css` with these exact CSS custom properties:

```css
:root {
  /* Backgrounds */
  --bg-primary: #0A0C0F;
  --bg-secondary: #12161C;
  --bg-elevated: #1A2030;

  /* Accent — Red */
  --accent-red: #C41E3A;
  --accent-red-muted: #8B1A2A;

  /* Accent — Teal */
  --accent-teal: #1A9B8A;
  --accent-teal-bright: #22C4B0;

  /* Accent — Amber */
  --accent-amber: #D48B2A;

  /* Text */
  --text-primary: #E8EDF2;
  --text-secondary: #8A9BB0;
  --text-disabled: #4A5568;

  /* Borders */
  --border-subtle: #1E2A3A;
  --border-active: #2A3F5A;

  /* Status */
  --status-draft-bg: #1E2A3A;
  --status-draft-text: #8A9BB0;
  --status-pending-bg: #3A2A0A;
  --status-pending-text: #D48B2A;
  --status-active-bg: #0A2A1E;
  --status-active-text: #1A9B8A;
  --status-complete-bg: #0A2A1E;
  --status-complete-text: #22C4B0;
  --status-rejected-bg: #2A0A0A;
  --status-rejected-text: #C41E3A;
  --status-locked-bg: #1A1A1A;
  --status-locked-text: #4A5568;

  /* Typography */
  --font-sans: 'IBM Plex Sans', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;

  /* Font sizes */
  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 14px;
  --text-md: 15px;
  --text-lg: 18px;
  --text-xl: 24px;
  --text-2xl: 28px;
  --text-3xl: 32px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Border radius */
  --radius-sm: 2px;
  --radius: 3px;
  --radius-md: 4px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;

  /* Shadows — none by default, used sparingly */
  --shadow-none: none;
}
```

### Step 4 — Create the global CSS and reset

`src/styles/reset.css` — minimal reset:
```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; -webkit-font-smoothing: antialiased; }
body { background: var(--bg-primary); color: var(--text-primary); font-family: var(--font-sans); }
img { display: block; max-width: 100%; }
button { cursor: pointer; border: none; background: none; font-family: inherit; }
a { color: inherit; text-decoration: none; }
input, textarea, select { font-family: inherit; }
```

`src/styles/global.css` — base typography:
```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

h1 { font-size: var(--text-3xl); font-weight: 600; color: var(--text-primary); }
h2 { font-size: var(--text-2xl); font-weight: 600; }
h3 { font-size: var(--text-xl); font-weight: 500; }
h4 { font-size: var(--text-lg); font-weight: 500; }

p { line-height: 1.65; color: var(--text-primary); }

.mono { font-family: var(--font-mono); }
.label { font-size: var(--text-sm); color: var(--text-secondary);
         text-transform: uppercase; letter-spacing: 0.08em; }
```

### Step 5 — Configure the API client

`src/api/client.js`:
```javascript
import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://warpaths-api.onrender.com',
  timeout: 300000, // 300s — covers slow AI calls (extraction, advisor, GameEval)
});

// Attach auth token on every request if present
client.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('warpaths_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors globally
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('warpaths_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
```

Note: using `sessionStorage` not `localStorage` — token is cleared on tab close,
which is appropriate for this platform's security model.

### Step 6 — Configure routing

`src/App.jsx`:
```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import GamePage from './pages/GamePage';
import ExtractionPage from './pages/ExtractionPage';
import OrgManagementPage from './pages/OrgManagementPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AccountPage from './pages/AccountPage';
import ProtectedRoute from './components/layout/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/join" element={<SignupPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/game/:gameId" element={
            <ProtectedRoute><GamePage /></ProtectedRoute>
          } />
          <Route path="/extract" element={
            <ProtectedRoute><ExtractionPage /></ProtectedRoute>
          } />
          <Route path="/org" element={
            <ProtectedRoute><OrgManagementPage /></ProtectedRoute>
          } />
          <Route path="/account" element={
            <ProtectedRoute><AccountPage /></ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/leaderboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

### Step 7 — Seed the instruction .md files

Create each file below with exactly the content shown. These files are the
instruction source for future CC sessions. Do not abbreviate or paraphrase.

**`docs/design-tokens.md`** — paste the full contents of the Design Direction
section from the design handoff document. This is the source of truth for colors,
typography, and layout principles.

**`docs/components.md`** — paste the full contents of the Component Library
section from the design handoff document. This is the source of truth for every
reusable component.

**`docs/pages/login.md`** — create with this content:
```
# Login Page

## Who sees it
Unauthenticated users navigating directly to the platform.

## Two login paths
- Player login: email + password → user JWT → redirect to /game or /account
- Org admin login: email + password + client_id → ClientAdmin JWT → redirect to /org

## API calls
- POST /auth/login → { access_token, token_type, expires_in }
- Store token in sessionStorage as 'warpaths_token'

## Visual direction
Centered card on primary background. WarPaths wordmark above the form.
Minimal — form fields and submit only. Not an acquisition page.
Two tabs: "Player" and "Org Admin". Org Admin tab adds a client_id field.
```

**`docs/pages/signup.md`** — paste the Page 1 section from the design handoff.
**`docs/pages/game.md`** — paste the Page 2 section from the design handoff.
**`docs/pages/extraction.md`** — paste the Page 3 section from the design handoff.
**`docs/pages/org-management.md`** — paste the Page 4 section from the design handoff.
**`docs/pages/leaderboard.md`** — paste the Page 5 section from the design handoff.
**`docs/pages/account.md`** — paste the Page 6 section from the design handoff.

Confirm all files are created before proceeding to Part 2.

---

## Part 2 — Component Library Build

Read `docs/design-tokens.md` and `docs/components.md` before writing any code.
Build components in this exact order. Each component gets its own file in
`src/components/ui/` with a matching `.module.css`. Do not build the next
component until the current one is confirmed.

**The rule for all components:** use only CSS custom properties from `tokens.css`.
Never hardcode a color, font, or spacing value. Every visual decision traces
back to a token.

---

### Component 1 — Button

File: `src/components/ui/Button.jsx` + `Button.module.css`

Props: `variant` (primary | secondary | ghost | destructive | icon),
`size` (sm | md), `disabled`, `loading`, `onClick`, `children`, `icon`

- Primary: red background, white text
- Secondary: transparent, border, white text
- Ghost: no background, no border, secondary text color
- Destructive: transparent, muted red border and text
- Icon: 32×32, no background, icon only
- Loading state: show a small spinner inside the button, disable interaction
- All variants: disabled state with muted colors, no pointer events

Confirm and show rendered output before proceeding.

---

### Component 2 — Badge

File: `src/components/ui/Badge.jsx` + `Badge.module.css`

Props: `status` (draft | pending | active | complete | approved | rejected |
failed | locked | validated)

Each status maps to background and text color from tokens.
Badge is inline, 11px monospace, uppercase, no border, 2px radius.

---

### Component 3 — Input

File: `src/components/ui/Input.jsx` + `Input.module.css`

Props: `label`, `type`, `placeholder`, `value`, `onChange`, `error`,
`disabled`, `hint`

- Label above, 12px uppercase tracked, secondary color
- Input: primary background, subtle border, teal focus border with glow
- Error: red border, red error message below
- Hint: secondary text below, 12px

---

### Component 4 — Textarea

File: `src/components/ui/Textarea.jsx` + `Textarea.module.css`

Same treatment as Input. Additional props: `rows` (default 5), `resize` (vertical only).

---

### Component 5 — Select

File: `src/components/ui/Select.jsx` + `Select.module.css`

Props: `label`, `options` (array of {value, label}), `value`, `onChange`,
`error`, `disabled`

Custom-styled select — not the browser default. Chevron icon from Lucide.
Dropdown panel: secondary background, items 36px tall, hover state, selected state.

---

### Component 6 — Toggle

File: `src/components/ui/Toggle.jsx` + `Toggle.module.css`

Props: `label`, `description`, `checked`, `onChange`, `disabled`

Track: off = border color, on = teal. Thumb: primary text color.
Label to the right. Optional description below label in secondary text.
150ms transition.

---

### Component 7 — Card

File: `src/components/ui/Card.jsx` + `Card.module.css`

Props: `variant` (default | active | warning | stat), `onClick`, `children`

- Default: secondary background, subtle border
- Active: elevated background, red left border (3px)
- Warning: secondary background, amber left border (3px)
- Stat: default card with large monospace number + label layout
- Clickable cards: hover darkens border, cursor pointer

---

### Component 8 — Table

Files: `src/components/ui/Table.jsx` + `Table.module.css`

Components: `Table`, `TableHead`, `TableBody`, `TableRow`, `TableCell`

Props on TableRow: `clickable`, `active`, `onClick`
Props on TableCell: `variant` (primary | secondary | mono | badge | action)

- Header: elevated background, uppercase tracked labels
- Body rows: transparent, hover elevated, active red left border
- Action cells: visible only on row hover

---

### Component 9 — Modal

File: `src/components/ui/Modal.jsx` + `Modal.module.css`

Props: `open`, `onClose`, `title`, `size` (default | wide), `children`, `footer`

- Overlay: semi-transparent black
- Panel: secondary background, subtle border, 4px radius
- Header: title left, close button right
- Footer: right-aligned button slot
- Animation: fade in + scale up, 150ms
- Closes on overlay click and Escape key

---

### Component 10 — Drawer

File: `src/components/ui/Drawer.jsx` + `Drawer.module.css`

Props: `open`, `onClose`, `title`, `width` (default 480 | wide 640), `children`

Slides in from right. Left border. Close button top right.
Animation: translate from right, 200ms.

---

### Component 11 — Toast

File: `src/components/ui/Toast.jsx` + `Toast.module.css`
File: `src/context/ToastContext.jsx` — provides `useToast()` hook

Props: `message`, `variant` (error | success | warning | info)

- Appears top right
- Dark surface, left border in variant color
- Auto-dismisses after 5 seconds
- Manual dismiss button
- Multiple toasts stack vertically

---

### Component 12 — Skeleton

File: `src/components/ui/Skeleton.jsx` + `Skeleton.module.css`

Props: `width`, `height`, `variant` (text | rect | circle)

Shimmer animation from secondary to elevated background, 1.5s loop.
Used as placeholder while API data loads.

---

### Component 13 — ProgressBar (AI call indicator)

File: `src/components/ui/ProgressBar.jsx` + `ProgressBar.module.css`

Props: `label`, `active`

Thin bar (3px) at the top of a panel. Teal, animates left to right then loops.
Label below: secondary text, 13px.
Only visible when `active` is true.

---

### Component 14 — StepIndicator

File: `src/components/ui/StepIndicator.jsx` + `StepIndicator.module.css`

Props: `steps` (array of {label, status: complete|active|upcoming})

Horizontal sequence. Complete = teal circle + checkmark. Active = red circle +
number + red label. Upcoming = dark gray circle + number + secondary label.
Connector lines: subtle color, teal when left step is complete.

---

### Component 15 — DimensionBoard

Files: `src/components/board/DimensionBoard.jsx` + `DimensionBoard.module.css`
Files: `src/components/board/TensionIndicator.jsx` + `TensionIndicator.module.css`
Files: `src/components/board/DimensionRow.jsx` + `DimensionRow.module.css`

**TensionIndicator props:** `name`, `currentLevel` (1–7), `previousLevel`
7 horizontal segments. Colors: 1–2 teal, 3 amber, 4–7 red.
Current level: filled segment with subtle glow.
Width: full. Height: 48px including label.

**DimensionRow props:** `name`, `currentValue` (1–5), `previousValue`
5 positions. Track line. Filled circle marker. Color shifts teal→amber→red.
Delta indicator: ↑ teal if value decreased (more stable), ↓ red if increased.
(Lower = more stable in PMESII convention — confirm with spec.)
Height: 36px.

**DimensionBoard props:** `tensionIndicator`, `dimensions`, `tensionNarrative`
Renders TensionIndicator above DimensionRow list.
Tension narrative below: italic, 13px, secondary color, max 3 lines with expand.

---

### Component 16 — Layout Components

Files in `src/components/layout/`:

**Header.jsx** — persistent top bar, 56px, primary background, bottom border.
Left: wordmark text "WARPATHS" in monospace, tracked. Right: user menu dropdown
(display name + ChevronDown icon). Dropdown: secondary background, items for
My Account, Leaderboard, Log out. Org admins also see Org Management.

**Sidebar.jsx** — left navigation, 220px, primary background, right border.
Props: `items` (array of {label, icon, path, active}). Item height 44px.
Active item: red left border, primary text. Hover: secondary background.

**PageShell.jsx** — wraps page content with optional sidebar.
Props: `sidebar` (boolean), `sidebarItems`, `title`, `children`.
With sidebar: flex row, sidebar fixed left, content fills remaining width.
Without sidebar: single column, content centered with max-width 1200px.

**ProtectedRoute.jsx** — checks sessionStorage for token. Redirects to /login
if absent. Renders children if present.

---

### After all 16 components are built:

1. Run `npm run dev` and confirm the app loads without errors
2. Create a simple component showcase page at `/dev` (not in the router, just a
   local file) that renders every component in all its states side by side
3. Take a screenshot or describe what renders — confirm visual output matches
   the design direction before any page is built
4. Commit everything with message: `feat: scaffold repo and build component library`

**Do not build any page components yet.** Pages are built in separate sessions,
each reading its own instruction file from `docs/pages/`.

---

## How Future Sessions Work

Each subsequent CC session builds one page. The opening prompt for any page session
follows this pattern:

```
Read these files before starting:
- docs/design-tokens.md
- docs/components.md
- docs/pages/[page-name].md
- src/components/ui/ (scan all existing components — do not recreate them)
- src/api/client.js

Build [Page Name] at src/pages/[PageName].jsx.
Use only components from src/components/ui/ and src/components/layout/.
Do not modify any existing component files.
If a new component is needed, create it in src/components/ui/ and add it to docs/components.md.
API base URL: https://warpaths-api.onrender.com
Auth token: read from sessionStorage key 'warpaths_token'
```

This pattern ensures:
- CC reads the design constraints before writing any code
- CC uses existing components rather than inventing new ones
- New components are documented so future sessions know they exist
- No page session touches another page's code
- The component library grows incrementally without drift

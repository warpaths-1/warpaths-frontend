# Org Management Page
`src/pages/OrgManagementPage.jsx`

## Route
`/org` — ProtectedRoute (ClientAdmin only)

## Purpose
ClientAdmin interface for managing their organization: players, games,
scenarios, billing, and extraction tag library.

## Layout
PageShell with sidebar. Sidebar items navigate between sub-sections.

## Sub-sections (sidebar navigation)
- Games — list of org games with status
- Players — invite and manage org members
- Scenarios — scenario library with status
- Tags — extraction tag library (rename, delete)
- Billing — extraction quota and plan info

## Key components used
- Table (all list views)
- Badge (status on games, scenarios, players)
- Button (invite, create, delete actions)
- Modal (confirmations, invite form)
- Input (invite form fields)
- Drawer (scenario detail / edit)
- Toast (action feedback)
- Skeleton (loading states)

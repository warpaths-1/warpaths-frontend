# Account Page
`src/pages/AccountPage.jsx`

## Route
`/account` — ProtectedRoute

## Purpose
Player account settings. Display name, email, password change.

## Layout
PageShell without sidebar. Single column, max-width 900px. Centered.

## Sections
- Profile — display name (inline editable), email (read-only)
- Security — change password form
- Danger zone — delete account

## Key components used
- Input (all form fields)
- Button (save, change password, delete account)
- Modal (delete account confirmation)
- Toast (save feedback)

## API calls
All in src/api/user.js
- GET /v1/users/me — load current user
- PATCH /v1/users/:id — update display name
- POST /auth/change-password — update password
- DELETE /v1/users/:id — delete account

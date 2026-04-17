# Game Page
`src/pages/GamePage.jsx`

## Route
`/game/:gameId` — ProtectedRoute

## Purpose
The live game interface. Players interact with their assigned role,
submit actions, consult the AI advisor, and view the dimension board
showing game state after each turn.

## Layout
PageShell without sidebar. Full viewport height. Two-panel layout:
- Left: DimensionBoard + game state summary (320px)
- Right: main play area (content items, advisor panel, action submission)

## Key components used
- DimensionBoard (game state visualization)
- ProgressBar (advisor and game eval loading)
- Badge (turn status, action status)
- Button (submit action, consult advisor)
- Card (content items, advisor response)
- Modal (confirm action submission)
- Skeleton (loading states)

## API calls (game runtime)
All in src/api/game.js
- GET /v1/games/:id — load game state
- GET /v1/games/:id/content-items — load content items for current turn
- POST /v1/games/:id/advisor — consult AI advisor
- POST /v1/games/:id/actions — submit player action
- GET /v1/games/:id/eval — fetch turn evaluation (after all actions submitted)

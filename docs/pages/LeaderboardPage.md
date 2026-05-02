# Leaderboard Page
`src/pages/LeaderboardPage.jsx`

## Route
`/leaderboard` — public (no auth required)

## Purpose
Public-facing page showing top players and recent game outcomes.
Entry point for new users discovering the platform.

## Layout
PageShell without sidebar. Single column, max-width 1200px.
Header shows unauthenticated state if no token present.

## Sections
- Top players table (rank, display name, score, games played)
- Recent completed games (scenario name, date, winner)

## Key components used
- Table (leaderboard rankings, recent games)
- Badge (game status)
- Skeleton (loading states)

## API calls
All in src/api/leaderboard.js
- GET /v1/leaderboard — top players
- GET /v1/games?status=complete&limit=10 — recent games

## Visual direction
Clean data table presentation. No CTAs on this page — it's informational.
Unauthenticated users see a subtle "Play WarPaths" link in the header area.

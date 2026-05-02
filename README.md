# WarPaths Frontend

UI-only React frontend for the WarPaths wargaming platform. All business logic, persistence, and AI calls live in the backend (`warpaths-api`); this repo renders UI and calls the API for everything.

**Deployed API:** `https://warpaths-api.onrender.com`

## Entry points

- [CLAUDE.md](./CLAUDE.md) — start here. Tech stack, hard rules, repo structure.
- [docs/decisions.md](./docs/decisions.md) — durable cross-page architectural decisions.
- [docs/plans/AUTHORING-PAGE.md](./docs/plans/AUTHORING-PAGE.md) — current in-flight feature plan.

## Commands

```bash
npm run dev      # local dev server
npm run build    # production build
npm test         # test suite
```

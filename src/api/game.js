import client from './client';

/*
 * Game API — endpoints needed by GamePage and related views.
 *
 * Paths come from the warpaths-api catalogue:
 *   11_game.md · 12_turn.md · 13_dimension_snapshot.md
 *   14_content_item.md · 15_advisor_input.md · 16_player_response.md
 *
 * Groups below:
 *   1. Game lifecycle           — create/read/abandon a game, fetch eval + summary
 *   2. Turns                    — start a new turn, read turn records, fetch the full turn package
 *   3. Dimension snapshots      — per-turn snapshot and game-wide timeline
 *   4. Content items            — read, reveal, and list across the game arc
 *   5. Player response          — submit final answers, exchange scaffolding messages, read back
 *   6. Advisor inputs           — consult an advisor, list/read conversations, send follow-ups
 *
 * Excluded from this file:
 *   - Engine-only endpoints (POST /games/:id/next-turn, POST /games/:id/end) — invoked
 *     by the service layer, never by the client.
 *   - Staff-only endpoints (DELETE game, PATCH eval, PATCH/DELETE turn, PATCH content-item,
 *     PATCH dimension-snapshot, DELETE player-response) — GamePage is player-facing.
 *   - Org-controller content authoring (POST/PATCH/DELETE content-items) — belongs to
 *     the org controller UI, not the player game view.
 */

// ── 1. Game lifecycle ─────────────────────────────────────────────────────────

export const createGame = (data) =>
  client.post('/v1/games', data).then(r => r.data);

export const getGames = (params) =>
  client.get('/v1/games', { params }).then(r => r.data);

export const getGame = (id) =>
  client.get(`/v1/games/${id}`).then(r => r.data);

export const abandonGame = (id, data) =>
  client.post(`/v1/games/${id}/abandon`, data).then(r => r.data);

export const getGameEval = (id) =>
  client.get(`/v1/games/${id}/eval`).then(r => r.data);

export const getGameSummary = (id) =>
  client.get(`/v1/games/${id}/summary`).then(r => r.data);

export const getGameSummaries = (params) =>
  client.get('/v1/games/summary', { params }).then(r => r.data);

// ── 2. Turns ──────────────────────────────────────────────────────────────────

export const startTurn = (gameId, data) =>
  client.post(`/v1/games/${gameId}/turns`, data).then(r => r.data);

export const getTurns = (gameId) =>
  client.get(`/v1/games/${gameId}/turns`).then(r => r.data);

export const getTurn = (gameId, turnId) =>
  client.get(`/v1/games/${gameId}/turns/${turnId}`).then(r => r.data);

export const getTurnPackage = (gameId, turnId) =>
  client.get(`/v1/games/${gameId}/turns/${turnId}/package`).then(r => r.data);

// ── 3. Dimension snapshots ────────────────────────────────────────────────────

export const getDimensionSnapshot = (gameId, turnId) =>
  client.get(`/v1/games/${gameId}/turns/${turnId}/dimension-snapshot`).then(r => r.data);

export const getDimensionSnapshots = (gameId, params) =>
  client.get(`/v1/games/${gameId}/dimension-snapshots`, { params }).then(r => r.data);

// ── 4. Content items ──────────────────────────────────────────────────────────

export const getTurnContentItems = (gameId, turnId, params) =>
  client.get(`/v1/games/${gameId}/turns/${turnId}/content-items`, { params }).then(r => r.data);

export const getContentItem = (gameId, turnId, id) =>
  client.get(`/v1/games/${gameId}/turns/${turnId}/content-items/${id}`).then(r => r.data);

export const revealContentItem = (gameId, turnId, id) =>
  client.patch(`/v1/games/${gameId}/turns/${turnId}/content-items/${id}/reveal`).then(r => r.data);

export const getGameContentItems = (gameId, params) =>
  client.get(`/v1/games/${gameId}/content-items`, { params }).then(r => r.data);

// ── 5. Player response ────────────────────────────────────────────────────────

export const submitPlayerResponse = (gameId, turnId, data) =>
  client.post(`/v1/games/${gameId}/turns/${turnId}/player-response`, data).then(r => r.data);

export const sendScaffoldingMessage = (gameId, turnId, data) =>
  client.post(`/v1/games/${gameId}/turns/${turnId}/player-response/scaffolding-message`, data).then(r => r.data);

export const getPlayerResponse = (gameId, turnId) =>
  client.get(`/v1/games/${gameId}/turns/${turnId}/player-response`).then(r => r.data);

export const getPlayerResponses = (gameId, params) =>
  client.get(`/v1/games/${gameId}/player-responses`, { params }).then(r => r.data);

// ── 6. Advisor inputs ─────────────────────────────────────────────────────────

export const consultAdvisor = (gameId, turnId, data) =>
  client.post(`/v1/games/${gameId}/turns/${turnId}/advisor-inputs`, data).then(r => r.data);

export const getTurnAdvisorInputs = (gameId, turnId) =>
  client.get(`/v1/games/${gameId}/turns/${turnId}/advisor-inputs`).then(r => r.data);

export const getAdvisorInput = (id) =>
  client.get(`/v1/advisor-inputs/${id}`).then(r => r.data);

export const sendAdvisorMessage = (id, data) =>
  client.post(`/v1/advisor-inputs/${id}/message`, data).then(r => r.data);

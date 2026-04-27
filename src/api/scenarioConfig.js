import client from './client';

// GET /v1/scenarios/:id/configs returns { items: [...] } envelope
// (verified live 2026-04-26). Unwrap inside the function so consumers
// receive a plain array, matching listScenarios / getClientExtractions.
export const getConfigsForScenario = (scenarioId) =>
  client.get(`/v1/scenarios/${scenarioId}/configs`).then(r => r.data?.items ?? []);

// POST is nested under the parent scenario. Flat path POST
// /v1/scenario-configs returns 404 (probed 2026-04-26 — endpoint not built).
// Body shape: CreateScenarioConfigRequest in openapi.json — required
// fields are name + turn_count; everything else optional.
export const createConfig = (scenarioId, body) =>
  client.post(`/v1/scenarios/${scenarioId}/configs`, body).then(r => r.data);

export const getConfig = (configId) =>
  client.get(`/v1/scenario-configs/${configId}`).then(r => r.data);

// PATCH does NOT accept game_type or turn_count — those are immutable
// post-create per PatchScenarioConfigRequest in openapi.json. Filter
// dirty diffs to patch-allowed fields before calling.
export const updateConfig = (configId, body) =>
  client.patch(`/v1/scenario-configs/${configId}`, body).then(r => r.data);

export const submitConfigForReview = (configId) =>
  client.post(`/v1/scenario-configs/${configId}/submit-for-review`).then(r => r.data);

export const approveConfig = (configId) =>
  client.post(`/v1/scenario-configs/${configId}/approve`).then(r => r.data);

export const rejectConfig = (configId) =>
  client.post(`/v1/scenario-configs/${configId}/reject`).then(r => r.data);

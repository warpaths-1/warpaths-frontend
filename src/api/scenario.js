import client from './client';

// GET /v1/scenarios returns { items: [...] } — unwrap here to match the
// pattern in getClientExtractions / getClientTags. Catalogue 02_scenario.md
// still documents a bare array; drift flagged in docs/response-shapes.md.
export const listScenarios = (params) =>
  client.get('/v1/scenarios', { params }).then(r => r.data?.items ?? []);
export const getScenario = (id) => client.get(`/v1/scenarios/${id}`).then(r => r.data);
export const createScenario = (body) => client.post('/v1/scenarios', body).then(r => r.data);
export const updateScenario = (id, body) => client.patch(`/v1/scenarios/${id}`, body).then(r => r.data);
export const publishScenario = (id) => client.post(`/v1/scenarios/${id}/publish`).then(r => r.data);
export const archiveScenario = (id) => client.post(`/v1/scenarios/${id}/archive`).then(r => r.data);
export const deleteScenario = (id) => client.delete(`/v1/scenarios/${id}`).then(r => r.data);

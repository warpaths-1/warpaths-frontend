import client from './client';

// GET /v1/analytical-frameworks returns { items: [...] } (verified 2026-04-25).
// Server auto-scopes to platform (client_id === null) + caller's client_id —
// frontend does not pass any client_id filter.
//
// Item shape (verified 2026-04-25): id, client_id, tier, name,
// framework_description, framework_tenets, created_at, updated_at.
export const listFrameworks = () =>
  client.get('/v1/analytical-frameworks').then(r => r.data?.items ?? []);

// Response shape UNVERIFIED — assumed to match list item shape. Treat
// defensively. Update docs/response-shapes.md after first successful call.
export const getFramework = (id) =>
  client.get(`/v1/analytical-frameworks/${id}`).then(r => r.data);

// Clone endpoint not verified live yet. Caller should surface the error
// and revert local state on failure.
export const cloneFramework = (id, name) =>
  client.post(`/v1/analytical-frameworks/${id}/clone`, { name }).then(r => r.data);

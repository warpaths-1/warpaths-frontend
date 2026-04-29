// Per-config sub-object API functions. One section per child object.
// All paths are nested under /v1/scenario-configs/:config_id/.
//
// Field naming on POST/PATCH bodies follows OpenAPI exactly. Pydantic
// extra="ignore" silently drops unknown fields (verified 2026-04-24
// audit) — no defensive 422 protects us from typos here.

import client from './client';

// ── TensionIndicator ────────────────────────────────────────────────────────
// One per ScenarioConfig. Singular sub-resource. Verified against
// openapi.json 2026-04-28 — paths and CreateTensionIndicatorRequest /
// PatchTensionIndicatorRequest schemas confirmed live.

export const getTensionIndicator = (configId) =>
  client
    .get(`/v1/scenario-configs/${configId}/tension-indicator`)
    .then((r) => r.data);

export const createTensionIndicator = (configId, body) =>
  client
    .post(`/v1/scenario-configs/${configId}/tension-indicator`, body)
    .then((r) => r.data);

export const updateTensionIndicator = (configId, body) =>
  client
    .patch(`/v1/scenario-configs/${configId}/tension-indicator`, body)
    .then((r) => r.data);

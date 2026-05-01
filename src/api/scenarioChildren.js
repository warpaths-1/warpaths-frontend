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

// ── Turn1Template ───────────────────────────────────────────────────────────
// One per ScenarioConfig. Used by Step 5 only as an existence probe — once a
// Turn1Template exists, dimension_key re-derivation locks (display_name renames
// preserve the existing key). Treats 404 as "doesn't exist" → null, matching
// the Step 4 tension-indicator pattern.

export const getTurn1Template = (configId) =>
  client
    .get(`/v1/scenario-configs/${configId}/turn1-template`)
    .then((r) => r.data);

// ── DimensionDefinition ─────────────────────────────────────────────────────
// Many per ScenarioConfig (zero or more). Verified against openapi.json
// 2026-04-30 — request schemas, endpoint paths, and list/single response
// shapes confirmed live.
//
// Path asymmetry: list/create are nested under config; get/update/delete
// operate on the flat resource path. Match the OpenAPI shape exactly. There
// is no bulk-create endpoint — caller iterates client-side.

export const listDimensions = (configId) =>
  client
    .get(`/v1/scenario-configs/${configId}/dimension-definitions`)
    .then((r) => r.data?.items ?? []);

export const createDimension = (configId, body) =>
  client
    .post(`/v1/scenario-configs/${configId}/dimension-definitions`, body)
    .then((r) => r.data);

export const getDimension = (dimensionId) =>
  client
    .get(`/v1/dimension-definitions/${dimensionId}`)
    .then((r) => r.data);

export const updateDimension = (dimensionId, body) =>
  client
    .patch(`/v1/dimension-definitions/${dimensionId}`, body)
    .then((r) => r.data);

export const deleteDimension = (dimensionId) =>
  client
    .delete(`/v1/dimension-definitions/${dimensionId}`)
    .then((r) => r.data);

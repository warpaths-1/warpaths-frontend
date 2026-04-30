# TanStack Query Key Registry
All query keys used across the frontend.
Update this file when adding new queries to any page.

## ExtractionPage
| Key | Data | Invalidated by |
|---|---|---|
| ['extractions', clientId, tagId] | Extraction list | upload, delete, applyTag, removeTag, createTag |
| ['client', clientId] | Client/quota | — |
| ['extraction', reId] | Report extraction | — |
| ['clientExtraction', clientId, ceId] | Client extraction record | name patch, notes patch, applyTag, removeTag |
| ['tags', clientId] | Tag library | createTag |

## AuthoringPage
| Key | Data | Invalidated by |
|---|---|---|
| ['extractions', clientId] | Extraction picker list (no tag filter — distinct from ExtractionPage's 3-tuple key) | — |
| ['tags', clientId] | Tag library for the picker drawer's filter chip row. Shared key with ExtractionPage — cache is reused across both pages. Multi-select AND filter applied client-side. | `createTag` on ExtractionPage (if the user creates a tag there while the drawer is mounted, invalidation propagates). |
| ['extraction', reId] | Report extraction — seeded from picker click; also fetched on Step 2 mount when `scenario.source_extraction_id` is non-null (for MappingCallout and per-card capabilities_overview). Shared key with ExtractionPage so no duplicate fetch. `staleTime: Infinity` on Step 2 fetch. | — |
| ['scenario', scenarioId] | Scenario record including actors[] | `updateScenario` (Step 1 and actor PATCH) and `publishScenario` write back via `setQueryData`. Actor PATCH uses optimistic update with rollback. Also cache-seeded by the picker drawer's resume flow, and by Step 1's first `createScenario` POST in creation mode (see note below). |
| ['configs', scenarioId] | ScenarioConfig list for the scenario (envelope `{items}` unwrapped in `getConfigsForScenario`). Step 3 picks the newest `status === 'draft'` row to load into the form. | `createConfig` (nested POST) and `updateConfig` (PATCH) in Step 3 invalidate this key. |
| ['config', configId] | Single ScenarioConfig record. Cache-seeded by Step 3's first `createConfig` POST and updated in place on each `updateConfig` PATCH. | `createConfig`, `updateConfig` (Step 3). |
| ['frameworks'] | AnalyticalFramework list (envelope `{items}` unwrapped in `listFrameworks`). No `clientId` in the key — the API auto-scopes by caller (verified 2026-04-25). Used by Step 3's framework picker section + drawer. | `cloneFramework` (Phase 2; not wired in this session). |
| ['framework', frameworkId] | Single AnalyticalFramework record. Reserved key — not yet read on any built page; will be populated by `getFramework` when wiring the framework-detail flow in a later session. | — |
| ['tension', configId] | Single TensionIndicator record for the ScenarioConfig (singular sub-resource). 404 from `getTensionIndicator` is caught in the queryFn and resolved to `null` so the cache distinguishes "no record yet" from "loading" without an isError state. Cache-seeded by Step 4's first `createTensionIndicator` POST (and on each `updateTensionIndicator` PATCH). | `createTensionIndicator`, `updateTensionIndicator` (Step 4). |
| ['dimensions', configId] | DimensionDefinition list for the ScenarioConfig (zero or more — `getDimensions` unwraps the `{items}` envelope into a plain array). Cache is mutated in place by Step 5 via `setQueryData`: append on POST, replace-by-id on PATCH (including soft-lock framework-change PATCH loop), filter-by-id on DELETE. | `createDimension`, `updateDimension`, `deleteDimension` (Step 5). |

**Imperative calls (not registered query keys):**
- `listScenarios({ source_extraction_id })` — called inside the
  ExtractionPickerDrawer's `createMutation.mutationFn` to check for an
  existing Scenario before POSTing a new one (resume-or-create). Result
  is not cached under a list key; a hit seeds `['scenario', id]` with
  the returned record before navigating.
- `createScenario(body)` from Step 1 when in creation mode (`/author/new`).
  First save — any of Save & next, Save draft & exit, or implicit
  publish — fires the POST. Response is seeded into `['scenario', id]`
  by the parent `onCreated` handler before a URL replace to
  `/author/:id`.

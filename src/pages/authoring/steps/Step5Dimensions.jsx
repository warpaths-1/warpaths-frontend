// Step 5 — DimensionDefinitions. Many records per ScenarioConfig (0+).
//
// Per-row save discipline: auto-commit on blur. New rows POST when all
// required fields are filled; existing rows PATCH dirty subset only. The
// `framework` column is config-level (single dropdown above the list); rows
// inherit it invisibly. `display_order` is computed from array index on POST.
//
// Framework-change soft-lock: when dimensions exist and the user picks a new
// framework, a confirmation modal sequentially PATCHes every row's framework
// field. Cancel reverts the dropdown.
//
// Silent-drop guard: bodies contain ONLY OpenAPI-documented fields. NO
// `weight` (that belongs to EvaluationCriteria — Session 5c).
//
// Advance gate: silent. No required minimum. Save & next is always enabled
// at the parent.

import { useState, useRef, useEffect, useImperativeHandle } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Check } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Skeleton from '../../../components/ui/Skeleton';
import { useAuth } from '../../../hooks/useAuth';
import {
  listDimensions,
  createDimension,
  updateDimension,
  deleteDimension,
  getTurn1Template,
} from '../../../api/scenarioChildren';
import { getConfigsForScenario } from '../../../api/scenarioConfig';

const FRAMEWORK_OPTIONS = [
  { value: 'pmesii', label: 'PMESII' },
  { value: 'pmesii_pt', label: 'PMESII-PT' },
  { value: 'pestel', label: 'PESTEL' },
  { value: 'custom', label: 'Custom' },
];

// Canonical dimensions per framework — drives the helper text rendered below
// the framework dropdown. Source: SESSION-05b-polish.md "Canonical dimensions
// per framework value" table.
const FRAMEWORK_HELPER = {
  pmesii: {
    label: 'PMESII',
    dims: 'Political, Military, Economic, Social, Information, Infrastructure',
  },
  pmesii_pt: {
    label: 'PMESII-PT',
    dims: 'Political, Military, Economic, Social, Information, Infrastructure, Physical Environment, Time',
  },
  pestel: {
    label: 'PESTEL',
    dims: 'Political, Economic, Social, Technological, Environmental, Legal',
  },
};

const INITIAL_VALUE_OPTIONS = [
  { value: '1', label: '1 — Failing' },
  { value: '2', label: '2 — Critical' },
  { value: '3', label: '3 — Contested' },
  { value: '4', label: '4 — Manageable' },
  { value: '5', label: '5 — Stable' },
];

const PATCHABLE_FIELDS = [
  'display_name',
  'dimension_key',
  'definition_prose',
  'initial_value',
  'update_guidance',
  'framework',
  'display_order',
];

const DUPLICATE_KEY_MSG =
  'Display name produces a duplicate identifier; please choose a different name.';

let clientKeySeed = 0;
const nextClientKey = () => `draft-${++clientKeySeed}-${Date.now()}`;

function pickDraftConfig(configs) {
  const drafts = (configs ?? []).filter((c) => c.status === 'draft');
  if (drafts.length === 0) return null;
  return [...drafts].sort((a, b) =>
    (b.created_at ?? '').localeCompare(a.created_at ?? '')
  )[0];
}

// Derive dimension_key from display_name. The API requires keys matching
// /^[a-z][a-z0-9_]*$/. Steps:
//   1. Empty/null input returns '' — the row is then blocked from saving by
//      the existing display_name required-field check (isRowComplete), so
//      the empty key never reaches the API.
//   2. Unicode-normalize and strip diacritics so "Économie" → "economie".
//   3. Lowercase + collapse non-[a-z0-9] runs to single underscores.
//   4. Trim leading/trailing underscores.
//   5. If the post-processing result is empty (e.g. input was "!!!" — all
//      special characters), fall back to the literal "untitled_dimension".
//      Intentional placeholder, not a bug: the user typed something but it
//      produced an unusable slug, so we surface a visible token they can
//      see and rename rather than failing silently.
//   6. If the result starts with a digit, prefix "d_" (for "dimension") so
//      "5G Networks" → "d_5g_networks" satisfies the leading-letter rule.
function slugify(name) {
  if (!name) return '';
  const folded = String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  let key = folded
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!key) return 'untitled_dimension';
  if (/^[0-9]/.test(key)) key = 'd_' + key;
  return key;
}

function blankFields() {
  return {
    display_name: '',
    dimension_key: '',
    definition_prose: '',
    initial_value: '',
    update_guidance: '',
  };
}

function fromRecord(rec) {
  return {
    display_name: rec.display_name ?? '',
    dimension_key: rec.dimension_key ?? '',
    definition_prose: rec.definition_prose ?? '',
    initial_value: rec.initial_value != null ? String(rec.initial_value) : '',
    update_guidance: rec.update_guidance ?? '',
  };
}

function rowFromRecord(rec) {
  const fields = fromRecord(rec);
  return {
    id: rec.id,
    clientKey: rec.id,
    fields,
    initial: fields,
    status: 'idle',
    errors: {},
  };
}

function rowFromBlank() {
  const fields = blankFields();
  return {
    id: null,
    clientKey: nextClientKey(),
    fields,
    initial: fields,
    status: 'idle',
    errors: {},
  };
}

function isRowComplete(fields) {
  if (!fields.display_name?.trim()) return false;
  if (!fields.dimension_key?.trim()) return false;
  if (!fields.definition_prose?.trim()) return false;
  const lvl = parseInt(fields.initial_value, 10);
  if (!Number.isFinite(lvl) || lvl < 1 || lvl > 5) return false;
  return true;
}

function buildCreateBody(fields, framework, displayOrder) {
  const guidance = (fields.update_guidance ?? '').trim();
  return {
    framework,
    dimension_key: fields.dimension_key.trim(),
    display_name: fields.display_name.trim(),
    definition_prose: fields.definition_prose.trim(),
    initial_value: parseInt(fields.initial_value, 10),
    display_order: displayOrder,
    update_guidance: guidance === '' ? null : guidance,
  };
}

function computePatchDiff(initial, current) {
  const diff = {};
  for (const k of ['display_name', 'dimension_key', 'definition_prose', 'update_guidance']) {
    if ((current[k] ?? '') !== (initial[k] ?? '')) {
      const t = (current[k] ?? '').trim();
      diff[k] = k === 'update_guidance' && t === '' ? null : t;
    }
  }
  if (current.initial_value !== initial.initial_value) {
    const n = parseInt(current.initial_value, 10);
    if (Number.isFinite(n)) diff.initial_value = n;
  }
  return diff;
}

function parseApiErrors(err) {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) {
    const fieldErrors = {};
    for (const e of detail) {
      const last = e.loc?.[e.loc.length - 1];
      if (PATCHABLE_FIELDS.includes(last)) {
        fieldErrors[last] = e.msg || 'Invalid';
      } else {
        fieldErrors._general = e.msg || 'Invalid input.';
      }
    }
    return fieldErrors;
  }
  if (typeof detail === 'string') return { _general: detail };
  return { _general: 'Save failed. Please try again.' };
}

function SectionLabel({ children, top = true }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.10em',
        color: 'var(--text-secondary)',
        marginBottom: 'var(--space-3)',
        marginTop: top ? 'var(--space-5)' : 0,
      }}
    >
      {children}
    </div>
  );
}

function FieldRow({ children }) {
  return <div style={{ marginBottom: 'var(--space-4)' }}>{children}</div>;
}

function HelperHint({ children }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-secondary)',
        marginTop: 'var(--space-2)',
      }}
    >
      {children}
    </div>
  );
}

// Framework-specific helper text rendered below the framework dropdown.
// Format per SESSION-05b-polish.md: canonical name + dimensions list, then a
// closing sentence on a separate paragraph. Custom framework gets a
// purpose-specific blurb. Pre-selection (no framework yet) keeps the
// general categorical-tag hint.
function FrameworkHelper({ framework }) {
  if (!framework) {
    return (
      <HelperHint>
        Categorical tag applied to every dimension on this config. Distinct
        from the analytical framework picked in Step 3.
      </HelperHint>
    );
  }
  if (framework === 'custom') {
    return <HelperHint>Define your own dimensions for this game design.</HelperHint>;
  }
  const entry = FRAMEWORK_HELPER[framework];
  if (!entry) return null;
  return (
    <div
      style={{
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-secondary)',
        marginTop: 'var(--space-2)',
        lineHeight: 1.55,
      }}
    >
      <div>
        {entry.label}: {entry.dims}.
      </div>
      <div style={{ marginTop: 'var(--space-2)' }}>
        Using these categories, select and describe the dimensions relevant
        for your game design.
      </div>
    </div>
  );
}

function RequiredAsterisk() {
  return (
    <span
      aria-hidden="true"
      style={{ color: 'var(--accent-red)', marginLeft: 4 }}
    >
      *
    </span>
  );
}

function SavedIndicator({ status }) {
  if (status !== 'saved' && status !== 'saving') return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.10em',
        color:
          status === 'saving'
            ? 'var(--text-secondary)'
            : 'var(--accent-teal-bright)',
        opacity: status === 'saved' ? 1 : 0.7,
        transition: 'opacity 250ms ease',
      }}
    >
      {status === 'saving' ? (
        'Saving…'
      ) : (
        <>
          <Check size={12} /> Saved
        </>
      )}
    </span>
  );
}

export default function Step5Dimensions({
  saveRef,
  scenarioId,
  readOnly = false,
  onValidityChange,
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isStaff = user?.scope === 'bubble';

  // Resolve configId from configs cache (same pattern as Step 4).
  const configsQuery = useQuery({
    queryKey: ['configs', scenarioId],
    queryFn: () => getConfigsForScenario(scenarioId),
    enabled: Boolean(scenarioId),
  });
  const draftConfig = pickDraftConfig(configsQuery.data);
  const configId = draftConfig?.id ?? null;

  const dimensionsQuery = useQuery({
    queryKey: ['dimensions', configId],
    queryFn: () => listDimensions(configId),
    enabled: Boolean(configId),
  });

  // Existence probe only — once Turn1Template exists for this config we lock
  // dimension_key re-derivation so display_name renames preserve the existing
  // key. Treat 404 as "doesn't exist" → null. While loading, default to
  // "not locked" so the slugify-on-display_name behavior continues to run for
  // new authors; the lock kicks in once the probe resolves.
  const turn1Query = useQuery({
    queryKey: ['turn1-template', configId],
    queryFn: async () => {
      try {
        return await getTurn1Template(configId);
      } catch (err) {
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
    enabled: Boolean(configId),
    retry: false,
    staleTime: 60_000,
  });
  const dimensionKeyLocked = Boolean(turn1Query.data);

  // Local row state — combines persisted + unsaved drafts. The list array
  // order IS the display_order on POST.
  const [rows, setRows] = useState([]);
  const [framework, setFramework] = useState('');
  const seededRef = useRef(false);

  // Soft-lock confirmation modal.
  const [pendingFramework, setPendingFramework] = useState(null);

  // Sync once dimensions load.
  useEffect(() => {
    if (!configId) return;
    if (dimensionsQuery.isLoading || dimensionsQuery.isError) return;
    if (seededRef.current) return;
    const list = dimensionsQuery.data ?? [];
    const sorted = [...list].sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
    );
    setRows(sorted.map(rowFromRecord));
    if (sorted.length > 0) {
      setFramework(sorted[0].framework ?? '');
    }
    seededRef.current = true;
  }, [
    configId,
    dimensionsQuery.isLoading,
    dimensionsQuery.isError,
    dimensionsQuery.data,
  ]);

  // Silent advance — always valid. Wired so the parent contract still works.
  useEffect(() => {
    onValidityChange?.(true);
  }, [onValidityChange]);

  const savedRowCount = rows.filter((r) => r.id != null).length;

  const updateRow = (clientKey, mutator) => {
    setRows((curr) =>
      curr.map((r) => (r.clientKey === clientKey ? mutator(r) : r))
    );
  };

  const setRowField = (clientKey, key, value) => {
    setRows((curr) => {
      // Pass 1 — apply the field change to the trigger row and re-derive
      // dimension_key on display_name edits (unless Turn1Template-locked).
      const updated = curr.map((r) => {
        if (r.clientKey !== clientKey) return r;
        const nextFields = { ...r.fields, [key]: value };
        const nextErrors = { ...r.errors };
        if (nextErrors[key]) delete nextErrors[key];

        // dimension_key is no longer user-editable; derive on every
        // display_name change. Locked once Turn1Template exists for the
        // config — the existing key is preserved across renames so any
        // downstream Turn1Template content keyed on dimension_key doesn't
        // break.
        if (key === 'display_name' && !dimensionKeyLocked) {
          nextFields.dimension_key = slugify(value);
        }

        const noErrorsLeft = Object.keys(nextErrors).length === 0;
        let nextStatus = r.status;
        if (r.status === 'saved') nextStatus = 'idle';
        else if (r.status === 'error' && noErrorsLeft) nextStatus = 'idle';
        return {
          ...r,
          fields: nextFields,
          errors: nextErrors,
          status: nextStatus,
        };
      });

      // Pass 2 — recompute duplicate-key flags across ALL rows so an edit
      // that resolves a peer's collision clears the stale error on that
      // peer too. Server-side 422 still catches anything that slips
      // through; this is the immediate-feedback layer.
      return updated.map((r) => {
        const k = r.fields.dimension_key;
        const hasDup =
          Boolean(k) &&
          updated.some(
            (p) => p.clientKey !== r.clientKey && p.fields.dimension_key === k
          );
        const errorIsDup = r.errors.display_name === DUPLICATE_KEY_MSG;
        if (hasDup && !errorIsDup) {
          return {
            ...r,
            errors: { ...r.errors, display_name: DUPLICATE_KEY_MSG },
          };
        }
        if (!hasDup && errorIsDup) {
          const { display_name: _drop, ...rest } = r.errors;
          return { ...r, errors: rest };
        }
        return r;
      });
    });
  };

  // `override` is an optional partial fields map that takes precedence over
  // the closure-captured row state. Needed because Select's onChange fires a
  // microtask before React flushes the setRows update, so a closure-only read
  // would see stale fields. Input/Textarea blur events run after React has
  // flushed and don't need an override (caller passes none).
  const saveRow = async (clientKey, override = null) => {
    if (readOnly || !configId) return;
    const target = rows.find((r) => r.clientKey === clientKey);
    if (!target) return;
    const effectiveFields = override
      ? { ...target.fields, ...override }
      : target.fields;

    // Duplicate-key guard: block save when the derived dimension_key collides
    // with another row's. setRowField already surfaces this inline; block
    // here so a blur with the error visible doesn't accidentally hit the API.
    const dupKey = effectiveFields.dimension_key;
    const hasPeerCollision =
      dupKey &&
      rows.some(
        (p) => p.clientKey !== clientKey && p.fields.dimension_key === dupKey
      );
    if (hasPeerCollision) {
      updateRow(clientKey, (r) => ({
        ...r,
        status: 'error',
        errors: { ...r.errors, display_name: DUPLICATE_KEY_MSG },
      }));
      return;
    }

    if (target.id == null) {
      // New row — POST only when all required fields are filled. Silent
      // abort on incomplete state; errors aren't surfaced because new rows
      // are still being filled out (showing red errors on every blur of a
      // half-finished new row would be noise).
      if (!isRowComplete(effectiveFields)) return;
      if (!framework) return;

      const orderIndex = rows.findIndex((r) => r.clientKey === clientKey);
      const body = buildCreateBody(effectiveFields, framework, orderIndex);

      updateRow(clientKey, (r) => ({ ...r, status: 'saving', errors: {} }));
      try {
        const created = await createDimension(configId, body);
        // Cache-seed list.
        queryClient.setQueryData(['dimensions', configId], (prev) =>
          [...(prev ?? []), created]
        );
        setRows((curr) =>
          curr.map((r) =>
            r.clientKey === clientKey
              ? { ...rowFromRecord(created), status: 'saved' }
              : r
          )
        );
        setTimeout(() => {
          setRows((curr) =>
            curr.map((r) =>
              r.id === created.id && r.status === 'saved'
                ? { ...r, status: 'idle' }
                : r
            )
          );
        }, 1500);
      } catch (err) {
        updateRow(clientKey, (r) => ({
          ...r,
          status: 'error',
          errors: parseApiErrors(err),
        }));
      }
      return;
    }

    // Existing row — PATCH dirty subset.
    const diff = computePatchDiff(target.initial, effectiveFields);
    if (Object.keys(diff).length === 0) return;

    // Bug 4 gate — block PATCH when dirty changes would leave any required
    // field blank. The PATCH schema accepts nullable strings, so without
    // this gate the API silently writes empty values to required fields.
    // Surface per-field errors so the user knows why the save was blocked.
    if (!isRowComplete(effectiveFields)) {
      const fieldErrors = {};
      if (!effectiveFields.display_name?.trim()) fieldErrors.display_name = 'Required';
      if (!effectiveFields.dimension_key?.trim()) fieldErrors.dimension_key = 'Required';
      if (!effectiveFields.definition_prose?.trim()) fieldErrors.definition_prose = 'Required';
      const lvl = parseInt(effectiveFields.initial_value, 10);
      if (!Number.isFinite(lvl) || lvl < 1 || lvl > 5) fieldErrors.initial_value = 'Required';
      updateRow(clientKey, (r) => ({
        ...r,
        errors: { ...r.errors, ...fieldErrors },
        status: 'error',
      }));
      return;
    }

    updateRow(clientKey, (r) => ({ ...r, status: 'saving', errors: {} }));
    try {
      const updated = await updateDimension(target.id, diff);
      queryClient.setQueryData(['dimensions', configId], (prev) =>
        (prev ?? []).map((d) => (d.id === updated.id ? updated : d))
      );
      const refreshed = rowFromRecord(updated);
      setRows((curr) =>
        curr.map((r) =>
          r.clientKey === clientKey
            ? { ...refreshed, clientKey: r.clientKey, status: 'saved' }
            : r
        )
      );
      setTimeout(() => {
        setRows((curr) =>
          curr.map((r) =>
            r.clientKey === clientKey && r.status === 'saved'
              ? { ...r, status: 'idle' }
              : r
          )
        );
      }, 1500);
    } catch (err) {
      updateRow(clientKey, (r) => ({
        ...r,
        status: 'error',
        errors: parseApiErrors(err),
      }));
    }
  };

  const handleAddRow = () => {
    if (readOnly || !configId || !framework) return;
    setRows((curr) => [...curr, rowFromBlank()]);
  };

  const handleDeleteRow = async (clientKey) => {
    if (readOnly) return;
    const target = rows.find((r) => r.clientKey === clientKey);
    if (!target) return;
    if (target.id == null) {
      // Unsaved draft — drop locally.
      setRows((curr) => curr.filter((r) => r.clientKey !== clientKey));
      return;
    }
    updateRow(clientKey, (r) => ({ ...r, status: 'saving' }));
    try {
      await deleteDimension(target.id);
      queryClient.setQueryData(['dimensions', configId], (prev) =>
        (prev ?? []).filter((d) => d.id !== target.id)
      );
      setRows((curr) => curr.filter((r) => r.clientKey !== clientKey));
    } catch (err) {
      updateRow(clientKey, (r) => ({
        ...r,
        status: 'error',
        errors: parseApiErrors(err),
      }));
    }
  };

  // Framework dropdown handler — soft-lock when saved rows exist.
  const handleFrameworkChange = (next) => {
    if (readOnly) return;
    if (next === framework) return;
    if (savedRowCount > 0) {
      setPendingFramework(next);
      return;
    }
    setFramework(next);
  };

  const confirmFrameworkChange = async () => {
    const next = pendingFramework;
    if (!next) return;
    const targetRows = rows.filter((r) => r.id != null);
    setPendingFramework(null);
    setFramework(next);

    // Sequential PATCH per row.
    for (const target of targetRows) {
      // Show pending state.
      setRows((curr) =>
        curr.map((r) =>
          r.clientKey === target.clientKey
            ? { ...r, status: 'saving', errors: {} }
            : r
        )
      );
      try {
        const updated = await updateDimension(target.id, { framework: next });
        queryClient.setQueryData(['dimensions', configId], (prev) =>
          (prev ?? []).map((d) => (d.id === updated.id ? updated : d))
        );
        setRows((curr) =>
          curr.map((r) =>
            r.clientKey === target.clientKey
              ? {
                  ...rowFromRecord(updated),
                  clientKey: r.clientKey,
                  status: 'saved',
                }
              : r
          )
        );
      } catch (err) {
        setRows((curr) =>
          curr.map((r) =>
            r.clientKey === target.clientKey
              ? { ...r, status: 'error', errors: parseApiErrors(err) }
              : r
          )
        );
      }
    }
  };

  const cancelFrameworkChange = () => {
    setPendingFramework(null);
  };

  // Parent saveRef contract — silent advance, but flush any complete unsaved
  // drafts and dirty PATCHes.
  useImperativeHandle(
    saveRef,
    () => ({
      isDirty: () => {
        if (readOnly || !configId) return false;
        return rows.some((r) => {
          if (r.id == null) return isRowComplete(r.fields);
          return Object.keys(computePatchDiff(r.initial, r.fields)).length > 0;
        });
      },
      save: async () => {
        if (readOnly) return true;
        if (!configId) return true;
        for (const r of rows) {
          if (r.id == null) {
            if (isRowComplete(r.fields) && framework) {
              await saveRow(r.clientKey);
            }
          } else if (
            Object.keys(computePatchDiff(r.initial, r.fields)).length > 0
          ) {
            await saveRow(r.clientKey);
          }
        }
        return true;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, framework, configId, readOnly]
  );

  // ── Loading / no-config / error ─────────────────────────────────────────
  if (configsQuery.isLoading || (configId && dimensionsQuery.isLoading)) {
    return (
      <Card>
        <div style={{ padding: 'var(--space-5)' }}>
          <Skeleton height={20} width="40%" />
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Skeleton height={36} width="100%" />
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Skeleton height={120} width="100%" />
          </div>
        </div>
      </Card>
    );
  }

  if (configsQuery.isError || dimensionsQuery.isError) {
    return (
      <Card>
        <div
          style={{
            padding: 'var(--space-5)',
            color: 'var(--accent-red)',
            fontSize: 'var(--text-sm)',
          }}
        >
          Could not load dimensions. Try again.
        </div>
      </Card>
    );
  }

  if (!configId) {
    return (
      <Card>
        <div
          style={{
            padding: 'var(--space-5)',
            color: 'var(--text-secondary)',
            fontSize: 'var(--text-sm)',
          }}
        >
          Complete Step 3 (Config setup) before authoring dimensions.
        </div>
      </Card>
    );
  }

  const addDisabled = readOnly || !framework;

  return (
    <Card>
      <div style={{ padding: 'var(--space-5)' }}>
        <SectionLabel top={false}>Framework</SectionLabel>
        <FieldRow>
          <Select
            label="DIMENSION FRAMEWORK"
            options={FRAMEWORK_OPTIONS}
            value={framework}
            onChange={handleFrameworkChange}
            disabled={readOnly}
            placeholder="Select a framework…"
          />
          <FrameworkHelper framework={framework} />
        </FieldRow>

        <SectionLabel>Dimensions</SectionLabel>

        {rows.length === 0 && (
          <div
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              padding: 'var(--space-4)',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius)',
              marginBottom: 'var(--space-4)',
            }}
          >
            No dimensions yet. Add as many as the config needs (or none — the
            platform supports zero-dimension configs).
          </div>
        )}

        {rows.map((row, idx) => (
          <DimensionRow
            key={row.clientKey}
            row={row}
            index={idx}
            isStaff={isStaff}
            readOnly={readOnly}
            onFieldChange={(k, v) => setRowField(row.clientKey, k, v)}
            onCommit={(override) => saveRow(row.clientKey, override)}
            onDelete={() => handleDeleteRow(row.clientKey)}
          />
        ))}

        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button
            variant="secondary"
            onClick={handleAddRow}
            disabled={addDisabled}
          >
            Add dimension
          </Button>
          {!framework && (
            <span
              style={{
                marginLeft: 'var(--space-3)',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
              }}
            >
              Select a framework first
            </span>
          )}
        </div>
      </div>

      <Modal
        open={pendingFramework != null}
        onClose={cancelFrameworkChange}
        title="Change framework?"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="ghost" onClick={cancelFrameworkChange}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmFrameworkChange}>
              Change framework
            </Button>
          </div>
        }
      >
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-base)',
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
          }}
        >
          Change framework from{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {FRAMEWORK_OPTIONS.find((o) => o.value === framework)?.label ??
              framework}
          </strong>{' '}
          to{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {FRAMEWORK_OPTIONS.find((o) => o.value === pendingFramework)?.label ??
              pendingFramework}
          </strong>
          ? This will recategorize {savedRowCount} existing{' '}
          {savedRowCount === 1 ? 'dimension' : 'dimensions'}.
        </p>
      </Modal>
    </Card>
  );
}

// ── DimensionRow ──────────────────────────────────────────────────────────────

function DimensionRow({
  row,
  index,
  isStaff,
  readOnly,
  onFieldChange,
  onCommit,
  onDelete,
}) {
  const { fields, errors, status } = row;
  const rowSaving = status === 'saving';
  const inputsDisabled = readOnly || rowSaving;

  return (
    <div
      style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-3)',
        background: 'var(--bg-secondary)',
        opacity: rowSaving ? 0.55 : 1,
        transition: 'opacity 150ms ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-3)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.10em',
            color: 'var(--text-secondary)',
          }}
        >
          Dimension {index + 1}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <SavedIndicator status={status} />
          {!readOnly && !rowSaving && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete dimension"
              title="Delete dimension"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 2,
                padding: 4,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'inline-flex',
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {errors._general && (
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--accent-red)',
            marginBottom: 'var(--space-3)',
            padding: 'var(--space-2) var(--space-3)',
            border: '1px solid var(--accent-red-muted)',
            borderRadius: 2,
          }}
        >
          {errors._general}
        </div>
      )}

      <FieldRow>
        <Input
          label={
            <>
              DISPLAY NAME
              <RequiredAsterisk />
            </>
          }
          placeholder="e.g. Military"
          value={fields.display_name}
          onChange={(e) => onFieldChange('display_name', e.target.value)}
          onBlur={() => onCommit()}
          error={errors.display_name}
          disabled={inputsDisabled}
        />
      </FieldRow>

      <FieldRow>
        <Textarea
          label={
            <>
              DEFINITION
              <RequiredAsterisk />
            </>
          }
          rows={3}
          value={fields.definition_prose}
          onChange={(e) => onFieldChange('definition_prose', e.target.value)}
          onBlur={() => onCommit()}
          error={errors.definition_prose}
          disabled={inputsDisabled}
        />
      </FieldRow>

      <FieldRow>
        <Select
          label={
            <>
              INITIAL VALUE
              <RequiredAsterisk />
            </>
          }
          options={INITIAL_VALUE_OPTIONS}
          value={fields.initial_value}
          onChange={(v) => {
            onFieldChange('initial_value', v);
            // Select has no onBlur. Pass the new value through as an explicit
            // override so saveRow doesn't have to read closure-stale state
            // before React's setRows update has flushed.
            onCommit({ initial_value: v });
          }}
          error={errors.initial_value}
          disabled={inputsDisabled}
        />
        <HelperHint>1 = failing · 5 = stable</HelperHint>
      </FieldRow>

      {isStaff && (
        <FieldRow>
          <Textarea
            label="UPDATE GUIDANCE (STAFF ONLY)"
            rows={3}
            value={fields.update_guidance}
            onChange={(e) => onFieldChange('update_guidance', e.target.value)}
            onBlur={() => onCommit()}
            error={errors.update_guidance}
            disabled={inputsDisabled}
            hint="Optional. Hidden from ClientAdmin authors."
          />
        </FieldRow>
      )}
    </div>
  );
}

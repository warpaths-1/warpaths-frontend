// Step 4 — TensionIndicator. One record per ScenarioConfig.
//
// Save paths:
//  1. No record exists → POST /v1/scenario-configs/:config_id/tension-indicator
//     (CreateTensionIndicatorRequest body — all 10 non-image fields required).
//  2. Record exists → PATCH same path with the dirty subset. PatchTension-
//     IndicatorRequest is fully permissive (no Create-only fields), so no
//     "Fixed at create" disabled-on-re-edit logic applies here.
//
// Field name translation matters: tension_suggestion uses { name, definition,
// rationale, suggested_starting_level } but the API body uses { name,
// description, initial_value, scale_*_label }. Pre-fill maps explicitly;
// rationale has no destination and is rendered as italic helper text only
// during the pre-fill flow (suppressed on re-edit visits).

import { useState, useRef, useEffect, useImperativeHandle } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import Select from '../../../components/ui/Select';
import Skeleton from '../../../components/ui/Skeleton';
import {
  getTensionIndicator,
  createTensionIndicator,
  updateTensionIndicator,
} from '../../../api/scenarioChildren';
import { getConfigsForScenario } from '../../../api/scenarioConfig';
import { getReportExtraction } from '../../../api/extraction';

const SCALE_KEYS = [
  'scale_1_label',
  'scale_2_label',
  'scale_3_label',
  'scale_4_label',
  'scale_5_label',
  'scale_6_label',
  'scale_7_label',
];

const FORM_KEYS = [
  'name',
  'description',
  'initial_value',
  'image_url',
  ...SCALE_KEYS,
];

const INITIAL_VALUE_OPTIONS = [
  { value: '1', label: '1 — most escalated' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7 — most stable' },
];

function blankFields() {
  return {
    name: '',
    description: '',
    initial_value: '',
    image_url: '',
    scale_1_label: '',
    scale_2_label: '',
    scale_3_label: '',
    scale_4_label: '',
    scale_5_label: '',
    scale_6_label: '',
    scale_7_label: '',
  };
}

function fromTension(t) {
  return {
    name: t.name ?? '',
    description: t.description ?? '',
    initial_value: t.initial_value != null ? String(t.initial_value) : '',
    image_url: t.image_url ?? '',
    scale_1_label: t.scale_1_label ?? '',
    scale_2_label: t.scale_2_label ?? '',
    scale_3_label: t.scale_3_label ?? '',
    scale_4_label: t.scale_4_label ?? '',
    scale_5_label: t.scale_5_label ?? '',
    scale_6_label: t.scale_6_label ?? '',
    scale_7_label: t.scale_7_label ?? '',
  };
}

function clampStartingLevel(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return '';
  if (n < 1) return '1';
  if (n > 7) return '7';
  return String(n);
}

function fromSuggestion(s) {
  if (!s) return blankFields();
  return {
    ...blankFields(),
    name: s.name ?? '',
    description: s.definition ?? '',
    initial_value:
      s.suggested_starting_level != null
        ? clampStartingLevel(s.suggested_starting_level)
        : '',
  };
}

function buildCreateBody(fields) {
  const trimmedImage = (fields.image_url ?? '').trim();
  const body = {
    name: fields.name.trim(),
    description: fields.description.trim(),
    initial_value: parseInt(fields.initial_value, 10),
    image_url: trimmedImage === '' ? null : trimmedImage,
  };
  for (const k of SCALE_KEYS) body[k] = (fields[k] ?? '').trim();
  return body;
}

function computePatchDiff(initial, current) {
  const diff = {};
  for (const k of FORM_KEYS) {
    if (current[k] === initial[k]) continue;
    if (k === 'initial_value') {
      const n = parseInt(current[k], 10);
      if (Number.isFinite(n)) diff[k] = n;
    } else if (k === 'image_url') {
      const t = (current[k] ?? '').trim();
      diff[k] = t === '' ? null : t;
    } else {
      diff[k] = (current[k] ?? '').trim();
    }
  }
  return diff;
}

function pickDraftConfig(configs) {
  const drafts = (configs ?? []).filter((c) => c.status === 'draft');
  if (drafts.length === 0) return null;
  return [...drafts].sort((a, b) =>
    (b.created_at ?? '').localeCompare(a.created_at ?? '')
  )[0];
}

function isFormValid(fields) {
  if (!fields.name?.trim()) return false;
  if (!fields.description?.trim()) return false;
  const lvl = parseInt(fields.initial_value, 10);
  if (!Number.isFinite(lvl) || lvl < 1 || lvl > 7) return false;
  for (const k of SCALE_KEYS) {
    if (!(fields[k] ?? '').trim()) return false;
  }
  return true;
}

function parseApiErrors(err) {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) {
    const fieldErrors = {};
    for (const e of detail) {
      const last = e.loc?.[e.loc.length - 1];
      if (FORM_KEYS.includes(last)) {
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

// Visual-only required-field marker. Inline pattern that mirrors the
// equivalent helper in Step5Dimensions.jsx — kept page-local since the
// shared component library doesn't yet define a generic asterisk.
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

export default function Step4Tension({
  saveRef,
  scenario,
  scenarioId,
  readOnly = false,
  onValidityChange,
}) {
  const queryClient = useQueryClient();

  // Resolve configId from configs cache. Step 3's save-and-next path seeds
  // ['configs', scenarioId] with the new draft, so by the time the user lands
  // on Step 4 the config is available.
  const configsQuery = useQuery({
    queryKey: ['configs', scenarioId],
    queryFn: () => getConfigsForScenario(scenarioId),
    enabled: Boolean(scenarioId),
  });
  const draftConfig = pickDraftConfig(configsQuery.data);
  const configId = draftConfig?.id ?? null;

  // GET tension. 404 → null (no record yet). retry: false so the 404 doesn't
  // hammer the API.
  const tensionQuery = useQuery({
    queryKey: ['tension', configId],
    queryFn: async () => {
      try {
        return await getTensionIndicator(configId);
      } catch (err) {
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
    enabled: Boolean(configId),
    retry: false,
  });

  // Conditional pre-fill: only fetch the extraction if we have a source AND
  // no tension record exists yet. Once tensionQuery.data is non-null we don't
  // need the extraction at all — pre-fill won't run.
  const sourceExtractionId = scenario?.source_extraction_id ?? null;
  const tensionLoaded = !tensionQuery.isLoading && !tensionQuery.isError;
  const noTensionRecord = tensionLoaded && tensionQuery.data == null;
  const extractionQuery = useQuery({
    queryKey: ['extraction', sourceExtractionId],
    queryFn: () => getReportExtraction(sourceExtractionId),
    enabled: Boolean(sourceExtractionId) && noTensionRecord,
    staleTime: Infinity,
  });

  const [fields, setFields] = useState(blankFields);
  const [errors, setErrors] = useState({});
  const initialRef = useRef(blankFields());
  // One-shot pre-fill guard. Survives strict-mode double-mount.
  const seededRef = useRef(false);
  // Tracks whether the current form state was seeded from extraction
  // (rather than loaded from an existing record). Drives the rationale
  // helper-text visibility — suppressed on re-edit visits.
  const [showSuggestionRationale, setShowSuggestionRationale] = useState(false);

  // Sync local state once configs + tension (+ optional extraction) settle.
  useEffect(() => {
    if (configsQuery.isLoading) return;
    if (!configId) return;
    if (tensionQuery.isLoading || tensionQuery.isError) return;

    if (tensionQuery.data) {
      // Re-edit: load from API. No pre-fill, no rationale.
      const next = fromTension(tensionQuery.data);
      setFields(next);
      initialRef.current = next;
      setShowSuggestionRationale(false);
      seededRef.current = true; // prevent later pre-fill on remount
      return;
    }

    // No record yet. Maybe seed from extraction.
    if (seededRef.current) return;
    if (sourceExtractionId) {
      if (extractionQuery.isLoading || extractionQuery.isError) return;
      const ts = extractionQuery.data?.tension_suggestion;
      if (ts) {
        const seeded = fromSuggestion(ts);
        setFields(seeded);
        initialRef.current = blankFields();
        setShowSuggestionRationale(Boolean(ts.rationale));
        seededRef.current = true;
        return;
      }
    }
    // No record, no usable suggestion: blank form.
    setFields(blankFields());
    initialRef.current = blankFields();
    setShowSuggestionRationale(false);
    seededRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    configId,
    configsQuery.isLoading,
    tensionQuery.isLoading,
    tensionQuery.isError,
    tensionQuery.data?.id,
    sourceExtractionId,
    extractionQuery.isLoading,
    extractionQuery.isError,
    extractionQuery.data?.report_extraction_id,
  ]);

  // Notify parent advance gate.
  useEffect(() => {
    onValidityChange?.(isFormValid(fields));
  }, [fields, onValidityChange]);

  const setField = (key, value) => {
    setFields((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const isDirty = () => {
    if (readOnly) return false;
    if (!configId) return false;
    return Object.keys(computePatchDiff(initialRef.current, fields)).length > 0;
  };

  useImperativeHandle(
    saveRef,
    () => ({
      isDirty,
      save: async ({ draft = false } = {}) => {
        if (readOnly) return true;

        // No config yet — Step 4 cannot save without a parent config. Treat
        // a draft exit as a no-op success; treat Save & next as blocked
        // (the parent advance gate also handles this via isFormValid).
        if (!configId) {
          if (draft) return true;
          setErrors({ _general: 'Complete Step 3 (Config setup) first.' });
          return false;
        }

        if (!draft) {
          if (!isFormValid(fields)) {
            const newErrors = {};
            if (!fields.name?.trim()) newErrors.name = 'Required';
            if (!fields.description?.trim()) newErrors.description = 'Required';
            const lvl = parseInt(fields.initial_value, 10);
            if (!Number.isFinite(lvl) || lvl < 1 || lvl > 7)
              newErrors.initial_value = 'Required';
            for (const k of SCALE_KEYS) {
              if (!(fields[k] ?? '').trim()) newErrors[k] = 'Required';
            }
            setErrors(newErrors);
            return false;
          }
        }

        const recordExists = Boolean(tensionQuery.data);

        if (!recordExists) {
          // First save → POST. Skip if draft exit and form is empty.
          if (draft && !isFormValid(fields)) return true;
          try {
            const body = buildCreateBody(fields);
            const created = await createTensionIndicator(configId, body);
            queryClient.setQueryData(['tension', configId], created);
            const next = fromTension(created);
            setFields(next);
            initialRef.current = next;
            setShowSuggestionRationale(false);
            setErrors({});
            return true;
          } catch (err) {
            setErrors(parseApiErrors(err));
            return false;
          }
        }

        // PATCH path — diff only.
        const dirty = computePatchDiff(initialRef.current, fields);
        if (Object.keys(dirty).length === 0) {
          setErrors({});
          return true;
        }
        try {
          const updated = await updateTensionIndicator(configId, dirty);
          queryClient.setQueryData(['tension', configId], updated);
          queryClient.invalidateQueries({ queryKey: ['tension', configId] });
          const next = fromTension(updated);
          setFields(next);
          initialRef.current = next;
          setErrors({});
          return true;
        } catch (err) {
          setErrors(parseApiErrors(err));
          return false;
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, configId, readOnly, tensionQuery.data]
  );

  // ── Loading / error / no-config states ────────────────────────────────────
  if (configsQuery.isLoading || (configId && tensionQuery.isLoading)) {
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
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Skeleton height={36} width="100%" />
          </div>
        </div>
      </Card>
    );
  }

  if (configsQuery.isError || tensionQuery.isError) {
    return (
      <Card>
        <div
          style={{
            padding: 'var(--space-5)',
            color: 'var(--accent-red)',
            fontSize: 'var(--text-sm)',
          }}
        >
          Could not load tension indicator. Try again.
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
          Complete Step 3 (Config setup) before authoring the tension indicator.
        </div>
      </Card>
    );
  }

  const rationale =
    showSuggestionRationale &&
    extractionQuery.data?.tension_suggestion?.rationale
      ? extractionQuery.data.tension_suggestion.rationale
      : null;

  return (
    <Card>
      <div style={{ padding: 'var(--space-5)' }}>
        {errors._general && (
          <div
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--accent-red)',
              marginBottom: 'var(--space-4)',
              padding: 'var(--space-3)',
              border: '1px solid var(--accent-red-muted)',
              borderRadius: 2,
            }}
          >
            {errors._general}
          </div>
        )}

        {rationale && (
          <div
            style={{
              fontStyle: 'italic',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-5)',
              padding: 'var(--space-3) var(--space-4)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius)',
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                fontStyle: 'normal',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Extraction rationale
            </span>
            {rationale}
          </div>
        )}

        <FieldRow>
          <Input
            label={
              <>
                NAME
                <RequiredAsterisk />
              </>
            }
            placeholder="e.g. Regional Stability Index"
            value={fields.name}
            onChange={(e) => setField('name', e.target.value)}
            error={errors.name}
            disabled={readOnly}
          />
        </FieldRow>

        <FieldRow>
          <Textarea
            label={
              <>
                DESCRIPTION
                <RequiredAsterisk />
              </>
            }
            rows={3}
            value={fields.description}
            onChange={(e) => setField('description', e.target.value)}
            error={errors.description}
            disabled={readOnly}
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
            onChange={(v) => setField('initial_value', v)}
            error={errors.initial_value}
            disabled={readOnly}
          />
          <HelperHint>1 = most escalated · 7 = most stable</HelperHint>
        </FieldRow>

        <FieldRow>
          <Input
            label="IMAGE URL (OPTIONAL)"
            placeholder="https://…"
            value={fields.image_url}
            onChange={(e) => setField('image_url', e.target.value)}
            error={errors.image_url}
            disabled={readOnly}
          />
          <HelperHint>Background image shown behind the indicator on the game board.</HelperHint>
        </FieldRow>

        <SectionLabel>Scale labels</SectionLabel>
        <HelperHint>Author a label for each level. 1 = most escalated, 7 = most stable.</HelperHint>

        {SCALE_KEYS.map((key, i) => (
          <div key={key} style={{ marginTop: 'var(--space-3)' }}>
            <Input
              label={
                <>
                  {`SCALE ${i + 1} LABEL`}
                  <RequiredAsterisk />
                </>
              }
              value={fields[key]}
              onChange={(e) => setField(key, e.target.value)}
              error={errors[key]}
              disabled={readOnly}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

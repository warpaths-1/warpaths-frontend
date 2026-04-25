import { useState, useRef, useEffect, useImperativeHandle } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import Select from '../../../components/ui/Select';
import { createScenario, updateScenario } from '../../../api/scenario';
import { useAuth } from '../../../hooks/useAuth';

const HORIZON_OPTIONS = [
  { value: 'hours_to_days', label: 'Hours to days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

// tier_minimum values per docs/api/02_scenario.md. Catalogue does not enumerate
// concrete values; defaulting to free/paying_standard/paying_pro per page spec
// — flag if API rejects on PATCH.
const TIER_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'paying_standard', label: 'Paying Standard' },
  { value: 'paying_pro', label: 'Paying Pro' },
];

function toInitial(scenario) {
  return {
    title: scenario?.title ?? '',
    category: scenario?.category ?? '',
    subcategory: scenario?.subcategory ?? '',
    scenario_narrative: scenario?.scenario_narrative ?? '',
    setting: scenario?.setting ?? '',
    time_horizon: {
      planning_horizon: scenario?.time_horizon?.planning_horizon ?? '',
      incident_horizon: scenario?.time_horizon?.incident_horizon ?? '',
      notes: scenario?.time_horizon?.notes ?? '',
    },
    tier_minimum: scenario?.tier_minimum ?? '',
    availability_window_days:
      scenario?.availability_window_days != null
        ? String(scenario.availability_window_days)
        : '',
  };
}

function validate(fields) {
  const errors = {};
  if (!fields.title?.trim()) errors.title = 'Required';
  if (!fields.category?.trim()) errors.category = 'Required';
  if (!fields.subcategory?.trim()) errors.subcategory = 'Required';
  if (!fields.scenario_narrative?.trim()) errors.scenario_narrative = 'Required';
  return errors;
}

function computeDirty(initial, current) {
  const dirty = {};

  ['title', 'category', 'subcategory', 'scenario_narrative'].forEach((k) => {
    if (current[k] !== initial[k]) dirty[k] = current[k];
  });

  if (current.setting !== initial.setting) {
    dirty.setting = current.setting || null;
  }
  if (current.tier_minimum !== initial.tier_minimum) {
    dirty.tier_minimum = current.tier_minimum || null;
  }
  if (current.availability_window_days !== initial.availability_window_days) {
    dirty.availability_window_days = current.availability_window_days
      ? parseInt(current.availability_window_days, 10)
      : null;
  }

  const thChanged =
    current.time_horizon.planning_horizon !== initial.time_horizon.planning_horizon ||
    current.time_horizon.incident_horizon !== initial.time_horizon.incident_horizon ||
    current.time_horizon.notes !== initial.time_horizon.notes;
  if (thChanged) {
    dirty.time_horizon = {
      planning_horizon: current.time_horizon.planning_horizon || null,
      incident_horizon: current.time_horizon.incident_horizon || null,
      notes: current.time_horizon.notes || null,
    };
  }

  return dirty;
}

function parseApiErrors(err) {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) {
    const fieldErrors = {};
    for (const e of detail) {
      const loc = e.loc;
      if (!loc || !loc.length) continue;
      // Walk from end for nested fields (e.g. ["body", "time_horizon", "planning_horizon"])
      const last = loc[loc.length - 1];
      if (last === 'title' || last === 'category' || last === 'subcategory' ||
          last === 'scenario_narrative' || last === 'setting' ||
          last === 'tier_minimum' || last === 'availability_window_days') {
        fieldErrors[last] = e.msg || 'Invalid';
      } else if (last === 'planning_horizon' || last === 'incident_horizon' || last === 'notes') {
        fieldErrors[`time_horizon.${last}`] = e.msg || 'Invalid';
      } else {
        fieldErrors._general = e.msg || 'Invalid input.';
      }
    }
    return fieldErrors;
  }
  if (typeof detail === 'string') {
    return { _general: detail };
  }
  return { _general: 'Save failed. Please try again.' };
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.10em',
        color: 'var(--text-secondary)',
        marginBottom: 'var(--space-3)',
        marginTop: 'var(--space-4)',
      }}
    >
      {children}
    </div>
  );
}

function FieldRow({ children }) {
  return <div style={{ marginBottom: 'var(--space-4)' }}>{children}</div>;
}

function TwoCol({ left, right }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
      }}
    >
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

function buildCreateBody(fields) {
  const body = {
    source_extraction_id: null,
    title: fields.title?.trim() || 'Untitled scenario',
  };
  if (fields.category?.trim()) body.category = fields.category.trim();
  if (fields.subcategory?.trim()) body.subcategory = fields.subcategory.trim();
  if (fields.scenario_narrative?.trim())
    body.scenario_narrative = fields.scenario_narrative.trim();
  if (fields.setting?.trim()) body.setting = fields.setting.trim();

  const th = fields.time_horizon;
  if (th.planning_horizon || th.incident_horizon || th.notes?.trim()) {
    body.time_horizon = {
      planning_horizon: th.planning_horizon || null,
      incident_horizon: th.incident_horizon || null,
      notes: th.notes?.trim() || null,
    };
  }

  if (fields.tier_minimum) body.tier_minimum = fields.tier_minimum;
  if (fields.availability_window_days) {
    const n = parseInt(fields.availability_window_days, 10);
    if (!Number.isNaN(n)) body.availability_window_days = n;
  }
  return body;
}

export default function Step1Framing({
  saveRef,
  scenario,
  scenarioId,
  creationMode = false,
  onCreated,
  readOnly = false,
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isStaff = user?.scope === 'bubble';
  const [fields, setFields] = useState(() => toInitial(scenario));
  const [errors, setErrors] = useState({});
  const initialRef = useRef(toInitial(scenario));

  // Re-sync when scenario swaps (e.g. navigating between /author/:id instances)
  useEffect(() => {
    const init = toInitial(scenario);
    setFields(init);
    initialRef.current = init;
    setErrors({});
  }, [scenario?.id]);

  const setField = (key, value) => {
    setFields((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const setTimeHorizon = (key, value) => {
    setFields((f) => ({ ...f, time_horizon: { ...f.time_horizon, [key]: value } }));
    const errKey = `time_horizon.${key}`;
    if (errors[errKey]) setErrors((e) => ({ ...e, [errKey]: undefined }));
  };

  const isDirty = () => {
    if (creationMode) {
      const empty = toInitial(null);
      return JSON.stringify(empty) !== JSON.stringify(fields);
    }
    return Object.keys(computeDirty(initialRef.current, fields)).length > 0;
  };

  useImperativeHandle(
    saveRef,
    () => ({
      isDirty: () => (readOnly ? false : isDirty()),
      save: async ({ draft = false } = {}) => {
        // Archived (read-only) — no save path; treat as no-op success.
        if (readOnly) return true;

        // Creation mode — POST to create the record. Draft exit skips validation
        // and lets us POST with fallback title even when the form is empty;
        // Save & next enforces validation like normal.
        if (creationMode) {
          if (!draft) {
            const clientErrors = validate(fields);
            if (Object.keys(clientErrors).length > 0) {
              setErrors(clientErrors);
              return false;
            }
          }
          try {
            const body = buildCreateBody(fields);
            const created = await createScenario(body);
            queryClient.setQueryData(['scenario', created.id], created);
            initialRef.current = toInitial(created);
            setFields(toInitial(created));
            setErrors({});
            onCreated?.(created);
            return true;
          } catch (err) {
            setErrors(parseApiErrors(err));
            return false;
          }
        }

        if (!scenarioId) return false;
        const clientErrors = validate(fields);
        if (Object.keys(clientErrors).length > 0) {
          setErrors(clientErrors);
          return false;
        }
        const dirty = computeDirty(initialRef.current, fields);
        if (Object.keys(dirty).length === 0) {
          setErrors({});
          return true;
        }
        try {
          const updated = await updateScenario(scenarioId, dirty);
          queryClient.setQueryData(['scenario', scenarioId], updated);
          initialRef.current = toInitial(updated);
          setFields(toInitial(updated));
          setErrors({});
          return true;
        } catch (err) {
          setErrors(parseApiErrors(err));
          return false;
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, scenarioId, creationMode, readOnly]
  );

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

        <FieldRow>
          <Input
            label="TITLE"
            value={fields.title}
            onChange={(e) => setField('title', e.target.value)}
            error={errors.title}
            disabled={readOnly}
          />
        </FieldRow>

        <TwoCol
          left={
            <Input
              label="CATEGORY"
              value={fields.category}
              onChange={(e) => setField('category', e.target.value)}
              error={errors.category}
              disabled={readOnly}
            />
          }
          right={
            <Input
              label="SUBCATEGORY"
              value={fields.subcategory}
              onChange={(e) => setField('subcategory', e.target.value)}
              error={errors.subcategory}
              disabled={readOnly}
            />
          }
        />

        <FieldRow>
          <Textarea
            label="SCENARIO NARRATIVE"
            rows={10}
            value={fields.scenario_narrative}
            onChange={(e) => setField('scenario_narrative', e.target.value)}
            error={errors.scenario_narrative}
            disabled={readOnly}
          />
        </FieldRow>

        <FieldRow>
          <Textarea
            label="SETTING"
            rows={3}
            value={fields.setting}
            onChange={(e) => setField('setting', e.target.value)}
            error={errors.setting}
            disabled={readOnly}
          />
        </FieldRow>

        <SectionLabel>Time horizon</SectionLabel>

        <TwoCol
          left={
            <div>
              <Select
                label="CRISIS HORIZON"
                options={HORIZON_OPTIONS}
                value={fields.time_horizon.planning_horizon}
                onChange={(v) => setTimeHorizon('planning_horizon', v)}
                error={errors['time_horizon.planning_horizon']}
                placeholder="Select…"
                disabled={readOnly}
              />
              <HelperHint>The whole game timeframe</HelperHint>
            </div>
          }
          right={
            <div>
              <Select
                label="TURN HORIZON"
                options={HORIZON_OPTIONS}
                value={fields.time_horizon.incident_horizon}
                onChange={(v) => setTimeHorizon('incident_horizon', v)}
                error={errors['time_horizon.incident_horizon']}
                placeholder="Select…"
                disabled={readOnly}
              />
              <HelperHint>How long between each turn</HelperHint>
            </div>
          }
        />

        <FieldRow>
          <Input
            label="TIME HORIZON NOTES"
            value={fields.time_horizon.notes}
            onChange={(e) => setTimeHorizon('notes', e.target.value)}
            error={errors['time_horizon.notes']}
            disabled={readOnly}
          />
        </FieldRow>

        {isStaff && (
          <>
            <SectionLabel>Availability</SectionLabel>

            <TwoCol
              left={
                <Select
                  label="TIER MINIMUM"
                  options={TIER_OPTIONS}
                  value={fields.tier_minimum}
                  onChange={(v) => setField('tier_minimum', v)}
                  error={errors.tier_minimum}
                  placeholder="Select…"
                  disabled={readOnly}
                />
              }
              right={
                <Input
                  label="AVAILABILITY WINDOW (DAYS)"
                  type="number"
                  value={fields.availability_window_days}
                  onChange={(e) => setField('availability_window_days', e.target.value)}
                  error={errors.availability_window_days}
                  disabled={readOnly}
                />
              }
            />
          </>
        )}
      </div>
    </Card>
  );
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

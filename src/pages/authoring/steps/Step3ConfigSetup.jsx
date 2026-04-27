// Step 3 — Config setup + Framework picker.
//
// Two distinct save paths:
//  1. No draft config exists for this scenario yet → POST nested
//     /v1/scenarios/:id/configs (CreateScenarioConfigRequest body).
//  2. A draft already exists → PATCH /v1/scenario-configs/:configId with
//     a dirty-field diff. PATCH does NOT accept game_type or turn_count
//     (verified 2026-04-26 against PatchScenarioConfigRequest in
//     openapi.json) — those fields are read-only on return visits.
//
// Framework-in-use proactive check is intentionally skipped: the flat
// GET /v1/scenario-configs list endpoint returns 404 (probed
// 2026-04-26). 409 at PATCH time is the fallback — toast + revert.

import { useState, useRef, useEffect, useImperativeHandle } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import Select from '../../../components/ui/Select';
import Toggle from '../../../components/ui/Toggle';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../hooks/useAuth';
import {
  getConfigsForScenario,
  createConfig,
  updateConfig,
} from '../../../api/scenarioConfig';
import { listFrameworks } from '../../../api/framework';
import FrameworkPickerDrawer from '../FrameworkPickerDrawer';

const GAME_TYPE_OPTIONS = [
  { value: 'sage_individual', label: 'SAGE individual' },
  { value: 'org_facilitated', label: 'Org facilitated' },
];

const PATCH_FIELDS = [
  'name',
  'description',
  'analytical_framework_id',
  'requires_validation',
  'max_exchanges_per_turn',
  'minimum_runs_for_insight',
];

function pickDefaultFramework(items) {
  if (!items || items.length === 0) return null;
  const platform = items.filter((f) => f.client_id === null);
  const realism = platform.filter((f) => f.tier === 'realism');
  const sortByCreated = (a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '');
  if (realism.length > 0) return [...realism].sort(sortByCreated)[0];
  if (platform.length > 0) return [...platform].sort(sortByCreated)[0];
  return null;
}

function pickDraftConfig(configs) {
  const drafts = (configs ?? []).filter((c) => c.status === 'draft');
  if (drafts.length === 0) return null;
  return [...drafts].sort((a, b) =>
    (b.created_at ?? '').localeCompare(a.created_at ?? '')
  )[0];
}

function blankFields() {
  return {
    name: '',
    description: '',
    game_type: 'sage_individual',
    turn_count: '5',
    max_exchanges_per_turn: '3',
    minimum_runs_for_insight: '15',
    requires_validation: true,
    analytical_framework_id: null,
  };
}

function fromConfig(config) {
  return {
    name: config.name ?? '',
    description: config.description ?? '',
    game_type: config.game_type ?? 'sage_individual',
    turn_count: config.turn_count != null ? String(config.turn_count) : '5',
    max_exchanges_per_turn:
      config.max_exchanges_per_turn != null ? String(config.max_exchanges_per_turn) : '3',
    minimum_runs_for_insight:
      config.minimum_runs_for_insight != null
        ? String(config.minimum_runs_for_insight)
        : '15',
    requires_validation:
      config.requires_validation != null ? Boolean(config.requires_validation) : true,
    analytical_framework_id: config.analytical_framework_id ?? null,
  };
}

function buildCreateBody(fields, sourceExtractionId) {
  const tc = parseInt(fields.turn_count, 10);
  const mept = parseInt(fields.max_exchanges_per_turn, 10);
  const mrfi = parseInt(fields.minimum_runs_for_insight, 10);
  return {
    source_extraction_id: sourceExtractionId ?? null,
    analytical_framework_id: fields.analytical_framework_id,
    name: fields.name.trim(),
    description: fields.description?.trim() || null,
    game_type: fields.game_type,
    turn_count: Number.isFinite(tc) ? tc : 5,
    max_exchanges_per_turn: Number.isFinite(mept) ? mept : 3,
    minimum_runs_for_insight: Number.isFinite(mrfi) ? mrfi : 15,
    requires_validation: fields.requires_validation,
  };
}

function computePatchDiff(initial, current) {
  const diff = {};
  for (const key of PATCH_FIELDS) {
    if (current[key] === initial[key]) continue;
    if (key === 'name') {
      diff.name = (current.name ?? '').trim();
    } else if (key === 'description') {
      diff.description = (current.description ?? '').trim() || null;
    } else if (key === 'max_exchanges_per_turn' || key === 'minimum_runs_for_insight') {
      const n = parseInt(current[key], 10);
      if (Number.isFinite(n)) diff[key] = n;
    } else {
      diff[key] = current[key];
    }
  }
  return diff;
}

function clampTurnCount(raw) {
  if (raw === '' || raw == null) return '';
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return '';
  if (n < 3) return '3';
  if (n > 10) return '10';
  return String(n);
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
        marginTop: top ? 'var(--space-4)' : 0,
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

function parseApiErrors(err) {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) {
    const fieldErrors = {};
    for (const e of detail) {
      const last = e.loc?.[e.loc.length - 1];
      if (
        last === 'name' ||
        last === 'description' ||
        last === 'game_type' ||
        last === 'turn_count' ||
        last === 'max_exchanges_per_turn' ||
        last === 'minimum_runs_for_insight' ||
        last === 'analytical_framework_id'
      ) {
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

export default function Step3ConfigSetup({
  saveRef,
  scenario,
  scenarioId,
  readOnly = false,
  onValidityChange,
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isStaff = user?.scope === 'bubble';

  const configsQuery = useQuery({
    queryKey: ['configs', scenarioId],
    queryFn: () => getConfigsForScenario(scenarioId),
    enabled: Boolean(scenarioId),
  });

  const frameworksQuery = useQuery({
    queryKey: ['frameworks'],
    queryFn: () => listFrameworks(),
  });

  const draftConfig = pickDraftConfig(configsQuery.data);
  const configId = draftConfig?.id ?? null;
  const frameworks = frameworksQuery.data ?? [];

  const [fields, setFields] = useState(blankFields);
  const [errors, setErrors] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Hint shows only when the framework was auto-selected by the default
  // picker on this mount and the user has not opened the drawer to pick.
  const [autoSelectedDefault, setAutoSelectedDefault] = useState(false);
  const initialRef = useRef(blankFields());

  // Sync local state once configs + frameworks have loaded. Re-runs if
  // scenario swap or draft config changes id.
  useEffect(() => {
    if (configsQuery.isLoading || frameworksQuery.isLoading) return;

    let next;
    let auto = false;
    if (draftConfig) {
      next = fromConfig(draftConfig);
      // If the saved config has no framework, fill in the default but
      // mark auto so the user can change without surprise.
      if (!next.analytical_framework_id) {
        const def = pickDefaultFramework(frameworks);
        if (def) {
          next.analytical_framework_id = def.id;
          auto = true;
        }
      }
    } else {
      next = blankFields();
      const def = pickDefaultFramework(frameworks);
      if (def) {
        next.analytical_framework_id = def.id;
        auto = true;
      }
    }
    setFields(next);
    setAutoSelectedDefault(auto);
    // initialRef tracks the last-saved (or last-loaded) baseline for diffs.
    // For a not-yet-created config, the baseline is "blank" so any user
    // input shows as dirty in computePatchDiff (irrelevant for create).
    initialRef.current = draftConfig ? fromConfig(draftConfig) : blankFields();
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    configsQuery.isLoading,
    frameworksQuery.isLoading,
    draftConfig?.id,
    frameworks.length,
  ]);

  // Notify parent of advance-gate validity (name + framework present).
  useEffect(() => {
    const valid = Boolean(fields.name?.trim()) && Boolean(fields.analytical_framework_id);
    onValidityChange?.(valid);
  }, [fields.name, fields.analytical_framework_id, onValidityChange]);

  const setField = (key, value) => {
    setFields((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handlePickFramework = (id) => {
    setFields((f) => ({ ...f, analytical_framework_id: id }));
    setAutoSelectedDefault(false);
    setDrawerOpen(false);
  };

  const isDirty = () => {
    if (readOnly) return false;
    if (!configId) {
      // Pre-create: dirty when any user-controlled field deviates from
      // the blank baseline. Treat any non-empty name/description as dirty.
      return (
        Boolean(fields.name?.trim()) ||
        Boolean(fields.description?.trim()) ||
        fields.game_type !== 'sage_individual' ||
        fields.turn_count !== '5' ||
        fields.max_exchanges_per_turn !== '3'
      );
    }
    return Object.keys(computePatchDiff(initialRef.current, fields)).length > 0;
  };

  useImperativeHandle(
    saveRef,
    () => ({
      isDirty,
      save: async ({ draft = false } = {}) => {
        if (readOnly) return true;

        // Draft exit with no scenario or an empty pre-create form: no-op success.
        if (!configId && draft) {
          if (!fields.name?.trim()) return true;
        }

        // Validation only enforced on Save & next.
        if (!draft) {
          const newErrors = {};
          const trimmedName = fields.name?.trim();
          if (!trimmedName) newErrors.name = 'Required';
          if (!fields.analytical_framework_id) newErrors.analytical_framework_id = 'Pick a framework';
          const tc = parseInt(fields.turn_count, 10);
          if (!Number.isFinite(tc) || tc < 3 || tc > 10)
            newErrors.turn_count = 'Must be 3–10';
          if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return false;
          }
        }

        if (!configId) {
          // CREATE — nested POST.
          if (!fields.name?.trim()) {
            setErrors({ name: 'Required' });
            return false;
          }
          try {
            const body = buildCreateBody(fields, scenario?.source_extraction_id);
            const created = await createConfig(scenarioId, body);
            queryClient.setQueryData(['config', created.id], created);
            queryClient.invalidateQueries({ queryKey: ['configs', scenarioId] });
            initialRef.current = fromConfig(created);
            setFields(fromConfig(created));
            setAutoSelectedDefault(false);
            setErrors({});
            return true;
          } catch (err) {
            setErrors(parseApiErrors(err));
            return false;
          }
        }

        // PATCH path — diff to allowed fields only. game_type and
        // turn_count are immutable post-create.
        const dirty = computePatchDiff(initialRef.current, fields);
        if (Object.keys(dirty).length === 0) {
          setErrors({});
          return true;
        }
        try {
          const updated = await updateConfig(configId, dirty);
          queryClient.setQueryData(['config', configId], updated);
          queryClient.invalidateQueries({ queryKey: ['configs', scenarioId] });
          initialRef.current = fromConfig(updated);
          setFields(fromConfig(updated));
          setAutoSelectedDefault(false);
          setErrors({});
          return true;
        } catch (err) {
          // 409 — framework is in use on a validated/active config. Revert
          // local framework selection to the last-saved value and toast.
          // TODO 2026-04-26: replace 409-fallback with proactive check once
          // GET /v1/scenario-configs?analytical_framework_id=… is built.
          if (err?.response?.status === 409) {
            showToast(
              'Framework is in use on validated configs. Reverting selection.',
              'error'
            );
            setFields((f) => ({
              ...f,
              analytical_framework_id: initialRef.current.analytical_framework_id,
            }));
          } else {
            setErrors(parseApiErrors(err));
          }
          return false;
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, configId, scenarioId, readOnly]
  );

  // ── Loading / error ────────────────────────────────────────────────────────
  if (configsQuery.isLoading || frameworksQuery.isLoading) {
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

  if (configsQuery.isError || frameworksQuery.isError) {
    return (
      <Card>
        <div
          style={{
            padding: 'var(--space-5)',
            color: 'var(--accent-red)',
            fontSize: 'var(--text-sm)',
          }}
        >
          Could not load configuration. Try again.
        </div>
      </Card>
    );
  }

  // ── Selected framework display ─────────────────────────────────────────────
  const selectedFramework = frameworks.find(
    (f) => f.id === fields.analytical_framework_id
  );
  const noFrameworks = frameworks.length === 0;
  // Field is editable on first visit (no config yet); read-only on return.
  const turnCountDisabled = readOnly || Boolean(configId);
  const gameTypeDisabled = readOnly || Boolean(configId);
  const fixedHint = 'Fixed at create';

  return (
    <>
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
              label="NAME"
              placeholder="e.g. Realism — Baseline"
              value={fields.name}
              onChange={(e) => setField('name', e.target.value)}
              error={errors.name}
              disabled={readOnly}
            />
          </FieldRow>

          <FieldRow>
            <Textarea
              label="DESCRIPTION"
              rows={3}
              value={fields.description}
              onChange={(e) => setField('description', e.target.value)}
              error={errors.description}
              disabled={readOnly}
            />
          </FieldRow>

          <TwoCol
            left={
              <div>
                <Select
                  label="GAME TYPE"
                  options={GAME_TYPE_OPTIONS}
                  value={fields.game_type}
                  onChange={(v) => setField('game_type', v)}
                  error={errors.game_type}
                  disabled={gameTypeDisabled}
                />
                {gameTypeDisabled && !readOnly && <HelperHint>{fixedHint}</HelperHint>}
              </div>
            }
            right={
              <div>
                <Input
                  label="TURN COUNT"
                  type="number"
                  value={fields.turn_count}
                  onChange={(e) => setField('turn_count', e.target.value)}
                  onBlur={(e) => setField('turn_count', clampTurnCount(e.target.value))}
                  error={errors.turn_count}
                  disabled={turnCountDisabled}
                />
                {turnCountDisabled && !readOnly ? (
                  <HelperHint>{fixedHint}</HelperHint>
                ) : (
                  <HelperHint>Between 3 and 10</HelperHint>
                )}
              </div>
            }
          />

          <FieldRow>
            <Input
              label="MAX EXCHANGES PER TURN"
              type="number"
              value={fields.max_exchanges_per_turn}
              onChange={(e) => setField('max_exchanges_per_turn', e.target.value)}
              error={errors.max_exchanges_per_turn}
              disabled={readOnly}
            />
          </FieldRow>

          {isStaff && (
            <>
              <SectionLabel>Staff settings</SectionLabel>
              <FieldRow>
                <Input
                  label="MINIMUM RUNS FOR INSIGHT"
                  type="number"
                  value={fields.minimum_runs_for_insight}
                  onChange={(e) =>
                    setField('minimum_runs_for_insight', e.target.value)
                  }
                  error={errors.minimum_runs_for_insight}
                  disabled={readOnly}
                />
              </FieldRow>
              <FieldRow>
                <Toggle
                  label="REQUIRES VALIDATION"
                  description="Config must be validated before use"
                  checked={fields.requires_validation}
                  onChange={(e) => setField('requires_validation', e.target.checked)}
                  disabled={readOnly}
                />
              </FieldRow>
            </>
          )}

          <SectionLabel>Analytical framework</SectionLabel>

          {noFrameworks && (
            <div
              style={{
                padding: 'var(--space-4)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius)',
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
              }}
            >
              No frameworks available. Contact staff.
            </div>
          )}

          {!noFrameworks && (
            <>
              {autoSelectedDefault && selectedFramework && (
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent-teal-bright)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  Using: Realism (platform default)
                </div>
              )}

              {selectedFramework ? (
                <div
                  style={{
                    padding: 'var(--space-4)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--space-3)',
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 'var(--text-base)',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {selectedFramework.name}
                    </div>
                    {selectedFramework.tier && (
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: 'var(--text-secondary)',
                          padding: '2px 6px',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 2,
                        }}
                      >
                        {selectedFramework.tier}
                      </span>
                    )}
                  </div>
                  {selectedFramework.framework_description && (
                    <div
                      style={{
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.4,
                      }}
                    >
                      {selectedFramework.framework_description}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    padding: 'var(--space-4)',
                    border: '1px dashed var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--text-secondary)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  No framework selected.
                </div>
              )}

              {errors.analytical_framework_id && (
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--accent-red)',
                    marginTop: 'var(--space-2)',
                  }}
                >
                  {errors.analytical_framework_id}
                </div>
              )}

              <div style={{ marginTop: 'var(--space-3)' }}>
                <Button
                  variant="ghost"
                  onClick={() => setDrawerOpen(true)}
                  disabled={readOnly}
                >
                  Change framework
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      <FrameworkPickerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        frameworks={frameworks}
        currentClientId={user?.client_id}
        selectedId={fields.analytical_framework_id}
        isStaff={isStaff}
        onSelect={handlePickFramework}
      />
    </>
  );
}

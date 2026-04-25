// Scope-gating convention: staff-only fields are rendered conditionally
// via `{scope === 'bubble' && <Field />}`, not via disabled state or CSS
// hiding. Preserves form round-trip of field values if the scope-shown
// value was previously set. See Step1Framing.jsx for the established
// pattern (tier_minimum, availability_window_days).

import { useState, useImperativeHandle } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { useToast } from '../../../context/ToastContext';
import { updateScenario, publishScenario } from '../../../api/scenario';
import { getReportExtraction } from '../../../api/extraction';
import ActorCard from '../ActorCard';
import ActorEditor from '../ActorEditor';
import styles from './Step2Actors.module.css';

const STEP1_FIELDS = ['title', 'scenario_narrative', 'category', 'subcategory'];

function parsePublishErrors(err) {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) {
    const hasStep1Error = detail.some((e) => {
      const last = e.loc?.[e.loc.length - 1];
      return STEP1_FIELDS.includes(String(last));
    });
    return {
      isStep1: hasStep1Error,
      message: hasStep1Error
        ? 'Required Step 1 fields are missing. Return to Step 1 to complete them.'
        : detail[0]?.msg || 'Publish failed. Please try again.',
    };
  }
  if (typeof detail === 'string') {
    return { isStep1: false, message: detail };
  }
  return { isStep1: false, message: 'Publish failed. Please try again.' };
}

export default function Step2Actors({ saveRef, scenario, scenarioId, onNavigateToStep1 }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const actors = scenario?.actors ?? [];

  // Fetch extraction for MappingCallout — alternative approach: survives reload,
  // matched by actor index. Key shared with ExtractionPage cache so no duplicate
  // fetch when already loaded from the picker.
  const { data: extraction } = useQuery({
    queryKey: ['extraction', scenario?.source_extraction_id],
    queryFn: () => getReportExtraction(scenario.source_extraction_id),
    enabled: Boolean(scenario?.source_extraction_id),
    staleTime: Infinity,
  });

  // Editor state — editorKey forces remount (fresh form) on every open
  const [editorKey, setEditorKey] = useState(0);
  const [editorState, setEditorState] = useState({ open: false, actorIndex: null });
  const [removeState, setRemoveState] = useState(null);
  const [publishError, setPublishError] = useState(null); // { message, isStep1 }

  const openAdd = () => {
    setEditorKey((k) => k + 1);
    setEditorState({ open: true, actorIndex: null });
    setPublishError(null);
  };

  const openEdit = (idx) => {
    setEditorKey((k) => k + 1);
    setEditorState({ open: true, actorIndex: idx });
    setPublishError(null);
  };

  const closeEditor = () => setEditorState((s) => ({ ...s, open: false }));

  // Actors PATCH — replaces the full array on every change (API contract)
  const patchActors = useMutation({
    mutationFn: (newActors) => updateScenario(scenarioId, { actors: newActors }),
    onMutate: async (newActors) => {
      await queryClient.cancelQueries({ queryKey: ['scenario', scenarioId] });
      const previous = queryClient.getQueryData(['scenario', scenarioId]);
      queryClient.setQueryData(['scenario', scenarioId], (old) =>
        old ? { ...old, actors: newActors } : old
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['scenario', scenarioId], context.previous);
      showToast('Failed to save actor. Please try again.', 'error');
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['scenario', scenarioId], updated);
    },
  });

  const handleActorSave = (actorFields) => {
    let newActors;
    if (editorState.actorIndex !== null) {
      newActors = actors.map((a, i) => (i === editorState.actorIndex ? actorFields : a));
    } else {
      newActors = [...actors, actorFields];
    }
    patchActors.mutate(newActors);
    closeEditor();
  };

  const openRemove = (idx) => {
    setRemoveState({ actorIndex: idx, actor: actors[idx] });
  };

  const confirmRemove = () => {
    const newActors = actors.filter((_, i) => i !== removeState.actorIndex);
    patchActors.mutate(newActors);
    setRemoveState(null);
  };

  // Exposed to AuthoringEditor via saveRef — handles advance gate + implicit publish
  useImperativeHandle(
    saveRef,
    () => ({
      // Actor mutations PATCH immediately on add/edit/remove, so the step
      // has no unsaved local state to discard. Cancel is always safe from here.
      isDirty: () => false,
      save: async ({ draft = false } = {}) => {
        setPublishError(null);

        // Draft-exit path — actor PATCHes already fire on each add/edit/remove
        // via patchActors.mutate(). Nothing to do here; skip the advance gate
        // and the implicit publish.
        if (draft) return true;

        if (actors.length < 3) return false;

        // No scenario or already published — just advance
        if (!scenarioId || scenario?.status !== 'draft') return true;

        // Client-side Step 1 check before hitting the server
        const { title, scenario_narrative, category, subcategory } = scenario;
        if (
          !title?.trim() ||
          !scenario_narrative?.trim() ||
          !category?.trim() ||
          !subcategory?.trim()
        ) {
          setPublishError({
            message: 'Required Step 1 fields are missing. Return to Step 1 to complete them.',
            isStep1: true,
          });
          return false;
        }

        try {
          const updated = await publishScenario(scenarioId);
          queryClient.setQueryData(['scenario', scenarioId], updated);
          return true;
        } catch (err) {
          setPublishError(parsePublishErrors(err));
          return false;
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actors, scenarioId, scenario]
  );

  const isCountMet = actors.length >= 3;
  const editingActor =
    editorState.actorIndex !== null ? actors[editorState.actorIndex] : null;
  const editingSuggestion =
    editorState.actorIndex !== null
      ? (extraction?.actor_suggestions?.[editorState.actorIndex] ?? null)
      : null;
  const capabilitiesOverview = editingSuggestion?.capabilities_overview ?? null;
  // current_posture from the extraction is a narrative string, NOT the enum.
  // Surfaced via MappingCallout so the author can pick the matching enum value.
  const postureNarrative = editingSuggestion?.current_posture ?? null;

  return (
    <>
      <Card>
        <div className={styles.inner}>
          {/* Header row */}
          <div className={styles.header}>
            <span className={styles.headerLabel}>Actors</span>
            <span className={isCountMet ? styles.countChipMet : styles.countChip}>
              {actors.length}/3 minimum
            </span>
          </div>

          {/* Actor list */}
          {actors.length > 0 && (
            <div className={styles.actorList}>
              {actors.map((actor, idx) => (
                <ActorCard
                  key={idx}
                  actor={actor}
                  capabilitiesOverview={
                    extraction?.actor_suggestions?.[idx]?.capabilities_overview ?? null
                  }
                  onEdit={() => openEdit(idx)}
                  onRemove={() => openRemove(idx)}
                />
              ))}
            </div>
          )}

          {/* Add actor */}
          <Button variant="ghost" onClick={openAdd}>
            + Add actor
          </Button>

          {/* Publish error banner */}
          {publishError && (
            <div className={styles.errorBanner}>
              {publishError.message}
              {publishError.isStep1 && onNavigateToStep1 && (
                <>
                  {' '}
                  <button
                    type="button"
                    className={styles.errorLink}
                    onClick={onNavigateToStep1}
                  >
                    Return to Step 1
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Actor editor drawer — keyed to force fresh mount on every open */}
      <ActorEditor
        key={editorKey}
        open={editorState.open}
        onClose={closeEditor}
        actor={editingActor}
        capabilitiesOverview={capabilitiesOverview}
        postureNarrative={postureNarrative}
        onSave={handleActorSave}
      />

      {/* Remove confirmation modal */}
      <Modal
        open={Boolean(removeState)}
        onClose={() => setRemoveState(null)}
        title="Remove actor"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="ghost" onClick={() => setRemoveState(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemove}>
              Remove
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
          <strong style={{ color: 'var(--text-primary)' }}>{removeState?.actor?.name}</strong>{' '}
          will be removed from the scenario. This cannot be undone.
        </p>
      </Modal>
    </>
  );
}

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import Drawer from '../../components/ui/Drawer';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import Toggle from '../../components/ui/Toggle';
import MappingCallout from './MappingCallout';
import styles from './ActorEditor.module.css';

const PRIORITY_OPTIONS = [
  { value: '1', label: 'High' },
  { value: '2', label: 'Medium' },
  { value: '3', label: 'Low' },
];

function emptyFields() {
  return {
    name: '',
    role: '',
    goals: [],
    behavior: '',
    history: '',
    constraints: '',
    current_posture: 'observing',
    is_visible_to_player: false,
    relationships_overview: '',
  };
}

function fromActor(actor) {
  return {
    name: actor.name ?? '',
    role: actor.role ?? '',
    goals: (actor.goals ?? []).map((g) => ({
      label: g.label ?? '',
      description: g.description ?? '',
      priority: g.priority ?? 2,
    })),
    behavior: actor.behavior ?? '',
    history: actor.history ?? '',
    constraints: actor.constraints ?? '',
    current_posture: actor.current_posture || 'observing',
    is_visible_to_player: actor.is_visible_to_player ?? false,
    relationships_overview: actor.relationships_overview ?? '',
  };
}

function isGoalValid(g) {
  return g.label.trim().length > 0 && g.description.trim().length > 0;
}

const POSTURE_OPTIONS = [
  { value: 'dormant',       label: 'Dormant' },
  { value: 'observing',     label: 'Observing' },
  { value: 'active',        label: 'Active' },
  { value: 'escalating',    label: 'Escalating' },
  { value: 'de_escalating', label: 'De-escalating' },
  { value: 'engaged',       label: 'Engaged' },
];

// ActorEditor is always mounted with a fresh key when opened so state
// resets automatically. No useEffect needed to sync external actor prop.
export default function ActorEditor({ open, onClose, actor, capabilitiesOverview, postureNarrative, onSave }) {
  const isEdit = Boolean(actor);
  const drawerTitle = isEdit ? `Edit actor — ${actor?.name || ''}` : 'Add actor';

  const [fields, setFields] = useState(() => (actor ? fromActor(actor) : emptyFields()));
  const [nameError, setNameError] = useState('');

  const setField = (key, value) => {
    setFields((f) => ({ ...f, [key]: value }));
    if (key === 'name') setNameError('');
  };

  const addGoal = () => {
    setFields((f) => ({
      ...f,
      goals: [...f.goals, { label: '', description: '', priority: 2 }],
    }));
  };

  const updateGoal = (idx, key, value) => {
    setFields((f) => ({
      ...f,
      goals: f.goals.map((g, i) => (i === idx ? { ...g, [key]: value } : g)),
    }));
  };

  const removeGoal = (idx) => {
    setFields((f) => ({
      ...f,
      goals: f.goals.filter((_, i) => i !== idx),
    }));
  };

  const allGoalsValid = fields.goals.every(isGoalValid);
  const canSave = fields.name.trim().length > 0 && allGoalsValid;

  const handleSave = () => {
    if (!fields.name?.trim()) {
      setNameError('Required');
      return;
    }
    if (!allGoalsValid) return;
    const out = {
      ...fields,
      goals: fields.goals.map((g) => ({
        label: g.label.trim(),
        description: g.description.trim(),
        priority: Number(g.priority),
      })),
    };
    onSave(out);
  };

  return (
    <Drawer open={open} onClose={onClose} title={drawerTitle} width={640} side="right">
      <div className={styles.shell}>
        <div className={styles.body}>
          <MappingCallout
            capabilitiesOverview={capabilitiesOverview}
            postureNarrative={postureNarrative}
          />

          <div className={styles.fieldRow}>
            <Input
              label="NAME"
              value={fields.name}
              onChange={(e) => setField('name', e.target.value)}
              error={nameError}
            />
          </div>

          <div className={styles.fieldRow}>
            <Input
              label="ROLE"
              value={fields.role}
              onChange={(e) => setField('role', e.target.value)}
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.sectionLabel}>GOALS</div>
            {fields.goals.map((goal, idx) => {
              const invalid = !isGoalValid(goal);
              return (
                <div key={idx} className={styles.goalBlock}>
                  <div className={styles.goalLabelRow}>
                    <div className={styles.goalLabelWrap}>
                      <Input
                        value={goal.label}
                        onChange={(e) => updateGoal(idx, 'label', e.target.value)}
                        placeholder="Label (short name)"
                      />
                    </div>
                    <button
                      type="button"
                      className={styles.goalTrash}
                      onClick={() => removeGoal(idx)}
                      title="Remove goal"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <Textarea
                    rows={2}
                    value={goal.description}
                    onChange={(e) => updateGoal(idx, 'description', e.target.value)}
                    placeholder="Description"
                  />
                  <div className={styles.goalPriorityWrap}>
                    <Select
                      label="PRIORITY"
                      options={PRIORITY_OPTIONS}
                      value={String(goal.priority)}
                      onChange={(v) => updateGoal(idx, 'priority', v)}
                    />
                  </div>
                  {invalid && (
                    <div className={styles.goalError}>
                      Label and description required
                    </div>
                  )}
                </div>
              );
            })}
            <Button variant="ghost" size="sm" onClick={addGoal}>
              + Add goal
            </Button>
          </div>

          <div className={styles.fieldRow}>
            <Textarea
              label="BEHAVIOR"
              rows={3}
              value={fields.behavior}
              onChange={(e) => setField('behavior', e.target.value)}
            />
          </div>

          <div className={styles.fieldRow}>
            <Textarea
              label="HISTORY"
              rows={3}
              value={fields.history}
              onChange={(e) => setField('history', e.target.value)}
            />
          </div>

          <div className={styles.fieldRow}>
            <Textarea
              label="CONSTRAINTS"
              rows={3}
              value={fields.constraints}
              onChange={(e) => setField('constraints', e.target.value)}
            />
            <div className={styles.aiHint}>AI-only — not shown to players</div>
          </div>

          <div className={styles.fieldRow}>
            <Select
              label="CURRENT POSTURE"
              options={POSTURE_OPTIONS}
              value={fields.current_posture}
              onChange={(v) => setField('current_posture', v)}
            />
            <div className={styles.aiHint}>What the actor is currently doing in the scenario.</div>
          </div>

          <div className={styles.fieldRow}>
            <Toggle
              label="Visible to player"
              checked={fields.is_visible_to_player}
              onChange={(e) => setField('is_visible_to_player', e.target.checked)}
            />
          </div>

          <div className={styles.fieldRow}>
            <Textarea
              label="RELATIONSHIPS OVERVIEW"
              rows={3}
              value={fields.relationships_overview}
              onChange={(e) => setField('relationships_overview', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!canSave}>
            Save actor
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

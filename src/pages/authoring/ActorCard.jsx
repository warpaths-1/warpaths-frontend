import { useState } from 'react';
import { Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import styles from './ActorCard.module.css';

const POSTURE_LABELS = {
  dormant: 'Dormant',
  observing: 'Observing',
  active: 'Active',
  escalating: 'Escalating',
  de_escalating: 'De-escalating',
  engaged: 'Engaged',
};

function NotSet() {
  return <span className={styles.notSet}>Not set</span>;
}

function Section({ label, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>{label}</div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  );
}

export default function ActorCard({ actor, capabilitiesOverview, onEdit, onRemove }) {
  const [expanded, setExpanded] = useState(false);

  const stop = (e) => e.stopPropagation();
  const toggle = () => setExpanded((v) => !v);

  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  const postureLabel = actor.current_posture
    ? POSTURE_LABELS[actor.current_posture] ?? actor.current_posture
    : null;

  const goals = actor.goal_items ?? [];

  return (
    <Card variant="default">
      <button
        type="button"
        className={styles.headerBtn}
        onClick={toggle}
        aria-expanded={expanded}
      >
        <ChevronIcon size={16} className={styles.chevron} />
        <div className={styles.main}>
          <div className={styles.name}>{actor.name}</div>
        </div>
        <div className={styles.meta}>
          {actor.role && <span className={styles.roleBadge}>{actor.role}</span>}
          {actor.is_visible_to_player && (
            <span className={styles.visibleDot}>● Visible to player</span>
          )}
        </div>
        <div className={styles.actions} onClick={stop}>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <button
            type="button"
            className={styles.trashBtn}
            onClick={onRemove}
            title="Remove actor"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </button>

      {expanded && (
        <div className={styles.detail}>
          <Section label="GOALS">
            {goals.length > 0 ? (
              <ol className={styles.goalList}>
                {goals.map((g, i) => (
                  <li key={i}>
                    {g.goal || <NotSet />}
                    {g.priority != null && (
                      <span className={styles.goalPriority}>
                        {' '}
                        (priority {g.priority})
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <NotSet />
            )}
          </Section>

          <Section label="CURRENT POSTURE">
            {postureLabel ?? <NotSet />}
          </Section>

          <Section label="BEHAVIOR">
            {actor.behavior ? actor.behavior : <NotSet />}
          </Section>

          <Section label="HISTORY">
            {actor.history ? actor.history : <NotSet />}
          </Section>

          <Section label="CONSTRAINTS">
            {actor.constraints ? actor.constraints : <NotSet />}
          </Section>

          {capabilitiesOverview && (
            <Section label="CAPABILITIES OVERVIEW (FROM EXTRACTION)">
              {capabilitiesOverview}
            </Section>
          )}

          <Section label="RELATIONSHIPS">
            {actor.relationships_overview ? actor.relationships_overview : <NotSet />}
          </Section>
        </div>
      )}
    </Card>
  );
}

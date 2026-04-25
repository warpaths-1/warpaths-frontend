import Button from '../../components/ui/Button';
import styles from './StepFooter.module.css';

const TOTAL_STEPS = 11;

function formatSavedAt(date) {
  if (!date) return null;
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function StepFooter({
  currentStep,
  mode,
  onBack,
  onSaveNext,
  onSaveExit,
  onCancel,
  onToggleMode,
  savedAt,
  saving = false,
  saveNextDisabled = false,
  saveNextTooltip,
  modeToggleDisabled = false,
  modeToggleTooltip,
}) {
  const isFirst = currentStep === 1;
  const isLast = currentStep === TOTAL_STEPS;
  const primaryLabel = isLast ? 'Save' : 'Save & next';
  const modeLinkLabel = mode === 'stepped' ? 'Edit freely' : 'Back to steps';

  const stepText = `Step ${currentStep} of ${TOTAL_STEPS}`;
  const savedText = savedAt ? ` · Saved ${formatSavedAt(savedAt)}` : '';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        marginTop: 'var(--space-8)',
        paddingTop: 'var(--space-5)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <Button variant="ghost" disabled={saving} onClick={onSaveExit}>
        Save draft & exit
      </Button>

      <Button
        variant="ghost"
        disabled={saving}
        onClick={onCancel}
        className={styles.cancelBtn}
      >
        Cancel
      </Button>

      <Button variant="ghost" disabled={isFirst || saving} onClick={onBack}>
        Back
      </Button>

      <div
        style={{
          flex: 1,
          textAlign: 'center',
          fontSize: 'var(--text-xs)',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)',
        }}
      >
        {stepText}
        {savedText}
      </div>

      <span title={saveNextDisabled && saveNextTooltip ? saveNextTooltip : undefined}>
        <Button
          variant="primary"
          onClick={onSaveNext}
          disabled={saving || saveNextDisabled}
          loading={saving}
        >
          {primaryLabel}
        </Button>
      </span>

      <span title={modeToggleDisabled && modeToggleTooltip ? modeToggleTooltip : undefined}>
        <button
          type="button"
          onClick={onToggleMode}
          disabled={saving || modeToggleDisabled}
          style={{
            background: 'none',
            border: 'none',
            padding: 'var(--space-2) var(--space-3)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            cursor: saving || modeToggleDisabled ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-sans)',
            opacity: saving || modeToggleDisabled ? 0.6 : 1,
          }}
        >
          {modeLinkLabel}
        </button>
      </span>
    </div>
  );
}

import { Fragment } from 'react';
import { Check } from 'lucide-react';
import styles from './StepIndicator.module.css';

export default function StepIndicator({ steps = [] }) {
  return (
    <div className={styles.wrapper}>
      {steps.map((step, i) => (
        <Fragment key={i}>
          <div className={[styles.step, styles[step.status]].join(' ')}>
            <div className={styles.circle}>
              {step.status === 'complete' ? <Check size={12} /> : i + 1}
            </div>
            <span className={styles.stepLabel}>{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={[
                styles.connector,
                step.status === 'complete' ? styles.connectorComplete : '',
              ].filter(Boolean).join(' ')}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

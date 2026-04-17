import styles from './ProgressBar.module.css';

export default function ProgressBar({ label, active }) {
  if (!active) return null;
  return (
    <div className={styles.wrapper}>
      <div className={styles.track}>
        <div className={styles.fill} />
      </div>
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}

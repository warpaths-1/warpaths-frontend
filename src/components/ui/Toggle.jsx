import styles from './Toggle.module.css';

export default function Toggle({ label, description, checked, onChange, disabled = false }) {
  return (
    <label className={[styles.wrapper, disabled ? styles.disabled : ''].join(' ')}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className={[styles.track, checked ? styles.trackOn : ''].join(' ')}>
        <span className={[styles.thumb, checked ? styles.thumbOn : ''].join(' ')} />
      </span>
      {(label || description) && (
        <span className={styles.text}>
          {label && <span className={styles.label}>{label}</span>}
          {description && <span className={styles.description}>{description}</span>}
        </span>
      )}
    </label>
  );
}

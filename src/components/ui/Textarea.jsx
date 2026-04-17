import styles from './Textarea.module.css';

export default function Textarea({
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  hint,
  rows = 5,
  name,
  id,
}) {
  const fieldId = id || name;
  return (
    <div className={styles.wrapper}>
      {label && (
        <label className={styles.label} htmlFor={fieldId}>
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        rows={rows}
        className={[styles.textarea, error ? styles.textareaError : ''].filter(Boolean).join(' ')}
      />
      {error && <span className={styles.error}>{error}</span>}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}

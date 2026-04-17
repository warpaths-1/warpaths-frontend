import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Select.module.css';

export default function Select({
  label,
  options = [],
  value,
  onChange,
  error,
  disabled = false,
  placeholder = 'Select…',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className={styles.wrapper} ref={ref}>
      {label && <span className={styles.label}>{label}</span>}
      <button
        type="button"
        className={[
          styles.trigger,
          open ? styles.triggerOpen : '',
          error ? styles.triggerError : '',
          disabled ? styles.disabled : '',
        ].filter(Boolean).join(' ')}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        <span className={selected ? '' : styles.placeholder}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={[styles.chevron, open ? styles.chevronOpen : ''].join(' ')}
        />
      </button>
      {open && (
        <div className={styles.dropdown}>
          {options.map(opt => (
            <div
              key={opt.value}
              className={[styles.option, opt.value === value ? styles.optionSelected : ''].join(' ')}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}

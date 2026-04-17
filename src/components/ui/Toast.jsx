import { X } from 'lucide-react';
import styles from './Toast.module.css';

export function ToastItem({ message, variant = 'info', onDismiss }) {
  return (
    <div className={[styles.toast, styles[variant]].join(' ')} role="alert">
      <span className={styles.message}>{message}</span>
      <button className={styles.dismissBtn} onClick={onDismiss} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className={styles.container}>
      {toasts.map(t => (
        <ToastItem key={t.id} message={t.message} variant={t.variant} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

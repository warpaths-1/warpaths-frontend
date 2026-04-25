import { useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './Drawer.module.css';

export default function Drawer({ open, onClose, title, width = 480, side = 'right', children }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const panelClass = width >= 640 ? styles.panelWide : styles.panelDefault;
  const sideClass = side === 'left' ? styles.panelLeft : styles.panelRight;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={[styles.panel, panelClass, sideClass].join(' ')}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </>
  );
}

import styles from './Skeleton.module.css';

export default function Skeleton({ width, height, variant = 'rect', className = '' }) {
  return (
    <div
      className={[styles.skeleton, styles[variant], className].filter(Boolean).join(' ')}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

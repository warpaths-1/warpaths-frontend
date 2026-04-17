import styles from './Card.module.css';

export default function Card({ variant = 'default', onClick, children, className = '' }) {
  return (
    <div
      className={[
        styles.card,
        styles[variant] || '',
        onClick ? styles.clickable : '',
        className,
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

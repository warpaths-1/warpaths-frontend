import styles from './DimensionRow.module.css';

const dotColor = (pos, current) => {
  if (pos !== current) return styles.dotEmpty;
  if (current <= 2) return styles.dotTeal;
  if (current === 3) return styles.dotAmber;
  return styles.dotRed;
};

export default function DimensionRow({ name, currentValue, previousValue }) {
  const delta = previousValue != null ? currentValue - previousValue : null;

  return (
    <div className={styles.wrapper}>
      <span className={styles.name}>{name}</span>
      <div className={styles.track}>
        <div className={styles.positions}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={[styles.dot, dotColor(i + 1, currentValue)].join(' ')} />
          ))}
        </div>
      </div>
      <span className={styles.delta}>
        {delta != null && delta !== 0 && (
          <span className={delta < 0 ? styles.deltaUp : styles.deltaDown}>
            {delta < 0 ? '↑' : '↓'}
          </span>
        )}
      </span>
    </div>
  );
}

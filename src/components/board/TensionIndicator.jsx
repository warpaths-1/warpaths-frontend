import styles from './TensionIndicator.module.css';

const SEGMENT_COLOR = (level) => {
  if (level <= 2) return styles.teal;
  if (level === 3) return styles.amber;
  return styles.red;
};

export default function TensionIndicator({ name, currentLevel, previousLevel }) {
  return (
    <div className={styles.wrapper}>
      {name && <span className={styles.name}>{name}</span>}
      <div className={styles.segments}>
        {Array.from({ length: 7 }, (_, i) => {
          const level = i + 1;
          const isCurrent = level === currentLevel;
          const colorClass = isCurrent ? SEGMENT_COLOR(level) : '';
          return (
            <div
              key={level}
              className={[styles.segment, colorClass, isCurrent ? styles.current : ''].filter(Boolean).join(' ')}
            />
          );
        })}
      </div>
    </div>
  );
}

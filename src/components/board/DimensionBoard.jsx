import { useState } from 'react';
import TensionIndicator from './TensionIndicator';
import DimensionRow from './DimensionRow';
import styles from './DimensionBoard.module.css';

export default function DimensionBoard({ tensionIndicator, dimensions = [], tensionNarrative }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.wrapper}>
      {tensionIndicator && (
        <TensionIndicator
          name={tensionIndicator.name}
          currentLevel={tensionIndicator.currentLevel}
          previousLevel={tensionIndicator.previousLevel}
        />
      )}
      <div className={styles.dimensions}>
        {dimensions.map((dim, i) => (
          <DimensionRow
            key={i}
            name={dim.name}
            currentValue={dim.currentValue}
            previousValue={dim.previousValue}
          />
        ))}
      </div>
      {tensionNarrative && (
        <div className={styles.narrativeWrapper}>
          <p className={[styles.narrative, expanded ? '' : styles.narrativeCollapsed].join(' ')}>
            {tensionNarrative}
          </p>
          <span className={styles.expandBtn} onClick={() => setExpanded(e => !e)}>
            {expanded ? 'Show less' : 'Show more'}
          </span>
        </div>
      )}
    </div>
  );
}

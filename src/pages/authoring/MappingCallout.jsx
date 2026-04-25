import styles from './MappingCallout.module.css';

export default function MappingCallout({ capabilitiesOverview, postureNarrative }) {
  if (!capabilitiesOverview && !postureNarrative) return null;
  return (
    <div className={styles.callout}>
      <div className={styles.header}>FROM EXTRACTION</div>

      {capabilitiesOverview && (
        <div className={styles.section}>
          <div className={styles.fieldLabel}>CAPABILITIES OVERVIEW</div>
          <div className={styles.body}>{capabilitiesOverview}</div>
        </div>
      )}

      {postureNarrative && (
        <div className={styles.section}>
          <div className={styles.fieldLabel}>POSTURE (suggested)</div>
          <div className={styles.body}>{postureNarrative}</div>
        </div>
      )}
    </div>
  );
}

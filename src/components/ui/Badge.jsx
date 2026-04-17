import styles from './Badge.module.css';

export default function Badge({ status }) {
  return (
    <span className={[styles.badge, styles[status] || styles.draft].join(' ')}>
      {status}
    </span>
  );
}

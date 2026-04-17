import styles from './Table.module.css';

export function Table({ children, className = '' }) {
  return (
    <table className={[styles.table, className].join(' ')}>
      {children}
    </table>
  );
}

export function TableHead({ children }) {
  return <thead className={styles.thead}>{children}</thead>;
}

export function TableBody({ children }) {
  return <tbody className={styles.tbody}>{children}</tbody>;
}

export function TableRow({ children, clickable, active, onClick }) {
  return (
    <tr
      className={[clickable ? styles.clickable : '', active ? styles.active : ''].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, variant, as = 'td' }) {
  const Tag = as;
  if (as === 'th') {
    return <th className={styles.th}>{children}</th>;
  }
  return (
    <td className={[styles.td, variant ? styles[variant] : ''].filter(Boolean).join(' ')}>
      {children}
    </td>
  );
}

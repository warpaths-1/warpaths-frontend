import { Link } from 'react-router-dom';
import styles from './Sidebar.module.css';

export default function Sidebar({ items = [] }) {
  return (
    <nav className={styles.sidebar}>
      {items.map((item, i) => (
        <Link
          key={i}
          to={item.path}
          className={[styles.item, item.active ? styles.active : ''].join(' ')}
        >
          {item.icon && item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

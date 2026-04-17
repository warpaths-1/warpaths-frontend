import Header from './Header';
import Sidebar from './Sidebar';
import styles from './PageShell.module.css';

export default function PageShell({
  sidebar = false,
  sidebarItems = [],
  maxWidth = 'lg',
  children,
}) {
  return (
    <div className={styles.shell}>
      <Header />
      <div className={styles.body}>
        {sidebar && <Sidebar items={sidebarItems} />}
        <div className={[styles.content, sidebar ? styles.contentFill : styles.contentCentered].join(' ')}>
          {sidebar ? children : (
            <div className={[styles.inner, maxWidth === 'md' ? styles.maxMd : styles.maxLg].join(' ')}>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

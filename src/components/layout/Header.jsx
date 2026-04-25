import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import styles from './Header.module.css';

export default function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isOrgAdmin = user?.role === 'client_admin';

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.brand}>
        <svg
          className={styles.hexMark}
          width="30"
          height="29"
          viewBox="0 0 50 48"
          aria-hidden="true"
        >
          <polygon
            points="25,1 1,12 1,36 25,47 49,36 49,12"
            fill="var(--bg-secondary)"
            stroke="var(--accent-red)"
            strokeWidth="2"
          />
          <text
            x="21"
            y="38"
            textAnchor="middle"
            fontFamily="Black Ops One"
            fontStyle="italic"
            fontSize="36"
            fill="var(--accent-red)"
          >
            W
          </text>
        </svg>
        <span className={styles.wordmark}>WARPATHS</span>
      </Link>
      <div className={styles.right} ref={ref}>
        {user ? (
          <>
            <button className={styles.userBtn} onClick={() => setOpen(o => !o)}>
              {user.display_name || user.email}
              <ChevronDown size={12} />
            </button>
            {open && (
              <div className={styles.dropdown}>
                <Link to="/account" className={styles.dropdownItem} onClick={() => setOpen(false)}>
                  My Account
                </Link>
                <Link to="/leaderboard" className={styles.dropdownItem} onClick={() => setOpen(false)}>
                  Leaderboard
                </Link>
                {isOrgAdmin && (
                  <Link to="/org" className={styles.dropdownItem} onClick={() => setOpen(false)}>
                    Org Management
                  </Link>
                )}
                <button className={[styles.dropdownItem, styles.destructive].join(' ')} onClick={handleLogout}>
                  Log out
                </button>
              </div>
            )}
          </>
        ) : (
          <span className={styles.notSignedIn}>Not signed in</span>
        )}
      </div>
    </header>
  );
}

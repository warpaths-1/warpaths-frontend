import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import PageShell from '../components/layout/PageShell';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { login as loginApi } from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login: contextLogin } = useAuth();
  const hasToken = typeof window !== 'undefined' && !!sessionStorage.getItem('warpaths_token');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    if (hasToken) navigate('/extract', { replace: true });
  }, [hasToken, navigate]);

  const mutation = useMutation({
    mutationFn: async ({ email, password, client_id }) => {
      const tokenResp = await loginApi({ email, password, client_id });
      const accessToken = tokenResp.access_token;
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const user = {
        id: payload.sub,
        client_id: payload.client_id,
        scope: payload.scope,
        role: payload.scope,
      };
      return { accessToken, user };
    },
    onSuccess: ({ accessToken, user }) => {
      contextLogin(accessToken, user);
      navigate('/extract');
    },
  });

  const handleSubmit = () => {
    mutation.mutate({ email, password, client_id: clientId });
  };

  const errorMessage = (() => {
    if (!mutation.isError) return null;
    const status = mutation.error?.response?.status;
    if (status === 401) return 'Invalid email or password.';
    if (status === 403) return "You don't have admin access to this organization.";
    return 'Something went wrong. Please try again.';
  })();

  const disabled = mutation.isPending;

  if (hasToken) return null;

  return (
    <PageShell sidebar={false} maxWidth="md">
      <div className={styles.root}>
        <div className={styles.logo}>
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
        </div>
        <div className={styles.card}>
          <h1 className={styles.title}>Admin Login</h1>
          <p className={styles.subtitle}>Sign in to manage your organization</p>
          <div className={styles.fields}>
            <Input
              label="EMAIL"
              type="email"
              placeholder="admin@yourorg.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={disabled}
              name="email"
            />
            <Input
              label="PASSWORD"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={disabled}
              name="password"
            />
            <Input
              label="CLIENT ID"
              type="text"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={disabled}
              hint="Your organization's client identifier"
              name="client_id"
            />
          </div>
          <div className={styles.submitWrap}>
            <Button
              variant="primary"
              loading={mutation.isPending}
              disabled={disabled}
              onClick={handleSubmit}
            >
              Sign In
            </Button>
          </div>
          {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
        </div>
      </div>
    </PageShell>
  );
}

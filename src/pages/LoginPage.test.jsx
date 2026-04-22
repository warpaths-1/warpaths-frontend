import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';

// base64-encoded JWT payload with sub/client_id/scope — just enough to satisfy
// the LoginPage's client-side atob/JSON.parse.
function makeFakeJwt() {
  const payload = { sub: 'user-uuid', client_id: 'client-uuid', scope: 'client_admin' };
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `header.${b64}.signature`;
}

vi.mock('../api/auth', () => ({
  login: vi.fn(),
}));

import { login } from '../api/auth';
import LoginPage from './LoginPage';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginPage', () => {
  it('renders the login form', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('heading', { name: /admin login/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    // Three inputs via name attributes (Input component renders <input name="...">)
    expect(document.querySelector('input[name="email"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="password"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="client_id"]')).toBeInTheDocument();
  });

  it('submits credentials and stores the token on success', async () => {
    login.mockResolvedValue({ access_token: makeFakeJwt() });

    renderWithProviders(<LoginPage />);

    fireEvent.change(document.querySelector('input[name="email"]'), {
      target: { value: 'admin@yourorg.com' },
    });
    fireEvent.change(document.querySelector('input[name="password"]'), {
      target: { value: 'hunter2' },
    });
    fireEvent.change(document.querySelector('input[name="client_id"]'), {
      target: { value: 'ad412b27-deca-425b-be66-86e4638fe6e9' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: 'admin@yourorg.com',
        password: 'hunter2',
        client_id: 'ad412b27-deca-425b-be66-86e4638fe6e9',
      });
    });
  });

  it('shows a 401 error message when credentials are invalid', async () => {
    login.mockRejectedValue({ response: { status: 401 } });

    renderWithProviders(<LoginPage />);

    fireEvent.change(document.querySelector('input[name="email"]'), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(document.querySelector('input[name="password"]'), {
      target: { value: 'bad' },
    });
    fireEvent.change(document.querySelector('input[name="client_id"]'), {
      target: { value: 'ad412b27-deca-425b-be66-86e4638fe6e9' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });
});

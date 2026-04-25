import { createContext, useState } from 'react';

export const AuthContext = createContext(null);

function userFromToken(tokenValue) {
  try {
    const payload = JSON.parse(atob(tokenValue.split('.')[1]));
    return {
      id: payload.sub,
      client_id: payload.client_id,
      scope: payload.scope,
      role: payload.scope,
    };
  } catch {
    return null;
  }
}

function readStoredToken() {
  if (typeof window === 'undefined') return { token: null, user: null };
  const stored = sessionStorage.getItem('warpaths_token');
  if (!stored) return { token: null, user: null };
  const user = userFromToken(stored);
  if (!user) {
    sessionStorage.removeItem('warpaths_token');
    return { token: null, user: null };
  }
  return { token: stored, user };
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(readStoredToken);

  const login = (tokenValue, userData) => {
    sessionStorage.setItem('warpaths_token', tokenValue);
    setState({ token: tokenValue, user: userData });
  };

  const logout = () => {
    sessionStorage.removeItem('warpaths_token');
    setState({ token: null, user: null });
  };

  const setUser = (userData) => {
    setState((prev) => ({ ...prev, user: userData }));
  };

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        setUser,
        token: state.token,
        login,
        logout,
        isLoading: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

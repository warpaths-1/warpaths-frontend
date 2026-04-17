import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => sessionStorage.getItem('warpaths_token'));

  const login = (tokenValue, userData) => {
    sessionStorage.setItem('warpaths_token', tokenValue);
    setToken(tokenValue);
    setUser(userData);
  };

  const logout = () => {
    sessionStorage.removeItem('warpaths_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

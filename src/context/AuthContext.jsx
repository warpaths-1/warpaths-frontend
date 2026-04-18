import { createContext, useState, useEffect } from 'react';
import { getUser } from '../api/user';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => sessionStorage.getItem('warpaths_token'));

  useEffect(() => {
    const storedToken = sessionStorage.getItem('warpaths_token');
    if (!storedToken) return;
    const payload = JSON.parse(atob(storedToken.split('.')[1]));
    const userId = payload.sub;
    getUser(userId).then(setUser).catch(() => {});
  }, []);

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

import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/axiosInstance';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user: u } = data.data;
    localStorage.setItem('accessToken',   accessToken);
    localStorage.setItem('refreshToken',  refreshToken);
    localStorage.setItem('tenantSlug',    u.tenantSlug);
    localStorage.setItem('restaurantId',  'rest-demo-001');   // mock default
    localStorage.setItem('user',          JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

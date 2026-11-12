import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, refreshAccess, setAccessToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const setSession = useCallback((data) => {
    setAccessToken(data?.accessToken || null);
    setAdmin(data?.admin || null);
  }, []);

  // Al cargar: restaura la sesión con la cookie de refresh (compartida entre llamadas simultáneas, p. ej. StrictMode).
  useEffect(() => {
    let cancelled = false;
    refreshAccess()
      .then((d) => { if (!cancelled) setSession(d); })
      .catch(() => { if (!cancelled) setSession(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [setSession]);

  const login = useCallback(async ({ email, password }) => {
    const data = await api.login({ email, password });
    setSession(data);
    return data.admin;
  }, [setSession]);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* cerramos la sesión local igual */ }
    setSession(null);
  }, [setSession]);

  const value = useMemo(() => ({ admin, loading, login, logout }), [admin, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

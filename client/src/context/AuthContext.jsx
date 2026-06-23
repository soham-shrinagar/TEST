import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);
const STORAGE_KEY = 'csUser';
const LEGACY_STORAGE_KEY = 'imUser';

const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch {
    return null;
  }
};

const readStoredUser = () => {
  const storedRaw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!storedRaw) return null;

  try {
    const stored = JSON.parse(storedRaw) || null;
    if (!stored?.token) return stored;

    const decoded = parseJwt(stored.token);
    if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return null;
    }

    if (localStorage.getItem(LEGACY_STORAGE_KEY) && !localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, storedRaw);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }

    return stored;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(!readStoredUser());

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      if (user?.token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/session');
        if (mounted) {
          setUser(data);
        }
      } catch {
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = (userData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Local logout should still succeed if the server session is already gone.
    }

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser((currentUser) => {
      const updated = { ...(currentUser || {}), ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const value = useMemo(() => ({ user, loading, login, logout, updateUser }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

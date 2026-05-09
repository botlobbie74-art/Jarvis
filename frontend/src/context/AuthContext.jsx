import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore session from local token OR handle Supabase OAuth callback
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          try {
            const { data } = await api.post('/auth/supabase-exchange', {
              access_token: session.access_token,
              email: session.user?.email,
              name: session.user?.user_metadata?.full_name || session.user?.user_metadata?.name || session.user?.email?.split('@')[0],
            });
            localStorage.setItem('jarvis_token', data.access_token);
            setUser(data.user);
            setLoading(false);
            return;
          } catch (_) {}
        }

        const token = localStorage.getItem('jarvis_token');
        if (!token) { setLoading(false); return; }
        await api.get('/auth/me')
          .then((r) => setUser(r.data))
          .catch(() => localStorage.removeItem('jarvis_token'))
          .finally(() => setLoading(false));
      } catch (e) {
        console.error("Auth init failed", e);
        setLoading(false);
      }
    };
    init();

    // Listen for Supabase auth state changes (OAuth popup callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.access_token) {
        try {
          const { data } = await api.post('/auth/supabase-exchange', {
            access_token: session.access_token,
            email: session.user?.email,
            name: session.user?.user_metadata?.full_name || session.user?.user_metadata?.name || session.user?.email?.split('@')[0],
          });
          localStorage.setItem('jarvis_token', data.access_token);
          setUser(data.user);
        } catch (_) {}
      }
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('jarvis_token', data.access_token);
    setUser(data.user);
    return data.user;
  };

  const signup = async (name, email, password) => {
    const { data } = await api.post('/auth/signup', { name, email, password });
    localStorage.setItem('jarvis_token', data.access_token);
    setUser(data.user);
    return data.user;
  };

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/app' },
    });
  };

  const loginWithGithub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin + '/app' },
    });
  };

  const logout = async () => {
    localStorage.removeItem('jarvis_token');
    await supabase.auth.signOut().catch(() => {});
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch (_) {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, loginWithGoogle, loginWithGithub, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

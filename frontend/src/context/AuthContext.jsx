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
      // Check if we're returning from a Supabase OAuth callback
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        try {
          const { data } = await api.post('/auth/supabase-exchange', {
            access_token: session.access_token,
            email: session.user?.email,
            name: session.user?.user_metadata?.full_name || session.user?.user_metadata?.name || session.user?.email?.split('@')[0],
          });
          localStorage.setItem('wingman_token', data.access_token);
          setUser(data.user);
          setLoading(false);
          return;
        } catch (_) {}
      }

      // Fallback: standard JWT token
      const token = localStorage.getItem('wingman_token');
      if (!token) { setLoading(false); return; }
      api.get('/auth/me')
        .then((r) => setUser(r.data))
        .catch(() => localStorage.removeItem('wingman_token'))
        .finally(() => setLoading(false));
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
          localStorage.setItem('wingman_token', data.access_token);
          setUser(data.user);
        } catch (_) {}
      }
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('wingman_token', data.access_token);
    setUser(data.user);
    return data.user;
  };

  const signup = async (name, email, password) => {
    const { data } = await api.post('/auth/signup', { name, email, password });
    localStorage.setItem('wingman_token', data.access_token);
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
    localStorage.removeItem('wingman_token');
    await supabase.auth.signOut().catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, loginWithGoogle, loginWithGithub }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

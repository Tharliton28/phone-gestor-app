import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) {
          setSession(data.session);
          setUser(data.session?.user ?? null);
        }
      } catch (err) {
        if (mounted) {
          setAuthError(err.message ?? 'Erro ao carregar sessão.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    setAuthError(null);

    if (!isSupabaseConfigured()) {
      const message =
        'Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env';
      setAuthError(message);
      return { error: { message } };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthError(error.message);
      return { error };
    }

    setSession(data.session);
    setUser(data.user);
    return { data, error: null };
  }, []);

  const signUp = useCallback(async (email, password, { nome } = {}) => {
    setAuthError(null);

    if (!isSupabaseConfigured()) {
      const message =
        'Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env';
      setAuthError(message);
      return { data: null, error: { message } };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome: nome?.trim() || email.split('@')[0],
        },
      },
    });

    if (error) {
      setAuthError(error.message);
      return { data: null, error };
    }

    if (data.session) {
      setSession(data.session);
      setUser(data.user);
    }

    return { data, error: null };
  }, []);

  const signOut = useCallback(async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      return { error };
    }
    setSession(null);
    setUser(null);
    return { error: null };
  }, []);

  const resetPassword = useCallback(async (email) => {
    setAuthError(null);

    if (!isSupabaseConfigured()) {
      const message = 'Supabase não configurado.';
      setAuthError(message);
      return { error: { message } };
    }

    const redirectTo = `${window.location.origin}/login`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      setAuthError(error.message);
    }

    return { error };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      authError,
      isAuthenticated: Boolean(session),
      isSupabaseConfigured: isSupabaseConfigured(),
      signIn,
      signUp,
      signOut,
      resetPassword,
      clearAuthError: () => setAuthError(null),
    }),
    [session, user, loading, authError, signIn, signUp, signOut, resetPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}

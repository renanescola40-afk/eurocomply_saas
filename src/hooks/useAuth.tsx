'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { locales, type Locale } from '@/lib/i18n/routing';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    metadata?: { name?: string; company_name?: string }
  ) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getCurrentLocalePrefix = () => {
    if (typeof window === 'undefined') return '';
    const segments = window.location.pathname.split('/').filter(Boolean);
    const currentLocale = segments[0] as Locale | undefined;
    return locales.includes(currentLocale as Locale) ? `/${currentLocale}` : '';
  };

  // EMAIL LOGIN
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error: error as Error | null };
    } catch (e) {
      return { error: e as Error };
    }
  }, []);

  // SIGN UP
  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      metadata?: { name?: string; company_name?: string }
    ) => {
      try {
        const localePrefix = getCurrentLocalePrefix();

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
            emailRedirectTo:
              typeof window !== 'undefined'
                ? `${window.location.origin}${localePrefix}/dashboard`
                : undefined,
          },
        });

        return { error: error as Error | null };
      } catch (e) {
        return { error: e as Error };
      }
    },
    []
  );

  // GOOGLE LOGIN (VERSÃO CORRIGIDA)
  const signInWithGoogle = useCallback(async () => {
    try {
      const localePrefix = getCurrentLocalePrefix();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            prompt: 'select_account',
          },
          redirectTo:
            typeof window !== 'undefined'
              ? `${window.location.origin}${localePrefix}/dashboard`
              : undefined,
        },
      });

      return { error: error as Error | null };
    } catch (e) {
      return { error: e as Error };
    }
  }, []);

  // SIGN OUT
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error: error as Error | null };
    } catch (e) {
      return { error: e as Error };
    }
  }, []);

  // RESET PASSWORD
  const resetPassword = useCallback(async (email: string) => {
    try {
      const localePrefix = getCurrentLocalePrefix();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}${localePrefix}/auth/callback`
            : undefined,
      });

      return { error: error as Error | null };
    } catch (e) {
      return { error: e as Error };
    }
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

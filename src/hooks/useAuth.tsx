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

const DEFAULT_APP_URL = 'https://eurocomply-saas.vercel.app';

function getAppOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (typeof window === 'undefined') {
    return DEFAULT_APP_URL;
  }

  const currentOrigin = window.location.origin;
  const currentHost = window.location.hostname;

  if (
    currentHost.endsWith('.vercel.app') &&
    currentHost !== 'eurocomply-saas.vercel.app'
  ) {
    return DEFAULT_APP_URL;
  }

  return currentOrigin;
}

function getCurrentLocalePrefix() {
  if (typeof window === 'undefined') return '/pt';
  const segments = window.location.pathname.split('/').filter(Boolean);
  const currentLocale = segments[0] as Locale | undefined;
  return locales.includes(currentLocale as Locale) ? `/${currentLocale}` : '/pt';
}

function getAuthCallbackUrl(nextPath = '/pt/dashboard') {
  const origin = getAppOrigin();
  const callbackUrl = new URL('/auth/callback', origin);
  callbackUrl.searchParams.set('next', nextPath);
  return callbackUrl.toString();
}

function getLocalizedPath(path: string) {
  const localePrefix = getCurrentLocalePrefix();
  return `${localePrefix}${path.startsWith('/') ? path : `/${path}`}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        setSession(session);
        setUser(session?.user ?? null);
      } catch (e) {
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: unknown, session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error as Error | null };
    } catch (e) {
      return { error: e as Error };
    }
  }, []);

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      metadata?: { name?: string; company_name?: string }
    ) => {
      try {
        const nextPath = getLocalizedPath('/dashboard');
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
            emailRedirectTo: getAuthCallbackUrl(nextPath),
          },
        });

        return { error: error as Error | null };
      } catch (e) {
        return { error: e as Error };
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      const nextPath = getLocalizedPath('/dashboard');
      const redirectTo = getAuthCallbackUrl(nextPath);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        const errorCode = (error as any)?.error_code || error.message;
        const isProviderDisabled = error.message?.includes('provider is not enabled')
          || error.message?.includes('Unsupported provider')
          || errorCode === 'validation_failed';

        const isRedirectMismatch = error.message?.includes('redirect')
          || error.message?.includes('callback')
          || errorCode === 'invalid_redirect_uri';

        if (isProviderDisabled) {
          return {
            error: new Error(
              'Google OAuth ainda não está ativado no Supabase. Ative o provider Google em Authentication > Sign In / Providers.'
            ) as Error,
          };
        }

        if (isRedirectMismatch) {
          return {
            error: new Error(
              `Erro de configuração: adicione esta URL nos Redirect URLs do Supabase: ${redirectTo}`
            ) as Error,
          };
        }

        return { error: error as Error | null };
      }

      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error: error as Error | null };
    } catch (e) {
      return { error: e as Error };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthCallbackUrl(getLocalizedPath('/auth/callback')),
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

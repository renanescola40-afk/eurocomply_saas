'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { locales, type Locale } from '@/lib/i18n/routing';
import type { User, Session } from '@supabase/supabase-js';

type SignupMetadata = {
  name?: string;
  company_name?: string;
  requested_plan?: string;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    metadata?: SignupMetadata
  ) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const DEFAULT_APP_URL = 'http://localhost:3000';
const AUTH_DASHBOARD_PATH = '/dashboard/organizations';

function getAppOrigin() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  return DEFAULT_APP_URL;
}

function getCurrentLocale() {
  if (typeof window === 'undefined') return 'pt' as Locale;
  const segments = window.location.pathname.split('/').filter(Boolean);
  const currentLocale = segments[0] as Locale | undefined;
  return locales.includes(currentLocale as Locale) ? currentLocale as Locale : 'pt';
}

function getCurrentLocalePrefix() {
  return `/${getCurrentLocale()}`;
}

function getAuthCallbackUrl(nextPath = '/pt/dashboard/organizations') {
  const origin = getAppOrigin();
  const callbackUrl = new URL('/auth/callback', origin);
  callbackUrl.searchParams.set('next', nextPath);
  return callbackUrl.toString();
}

function getLocalizedPath(path: string) {
  const localePrefix = getCurrentLocalePrefix();
  return `${localePrefix}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getLocalizedDashboardPath() {
  return getLocalizedPath(AUTH_DASHBOARD_PATH);
}

function appendRequestedPlan(path: string, requestedPlan?: string) {
  if (!requestedPlan) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}plan=${encodeURIComponent(requestedPlan)}`;
}

function isPublicAuthPath(pathname: string) {
  const localePrefix = getCurrentLocalePrefix();
  return pathname === localePrefix || pathname === `${localePrefix}/login` || pathname === `${localePrefix}/signup`;
}

function redirectAuthenticatedUser() {
  if (typeof window === 'undefined') return;

  if (isPublicAuthPath(window.location.pathname)) {
    window.location.replace(getLocalizedDashboardPath());
  }
}

function getGoogleOAuthEntryUrl() {
  const entryUrl = new URL('/auth/google', getAppOrigin());
  const locale = getCurrentLocale();
  const nextPath = getLocalizedDashboardPath();

  entryUrl.searchParams.set('locale', locale);
  entryUrl.searchParams.set('next', nextPath);

  return entryUrl.toString();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const { data } = await supabase.auth.getSession();
        const currentSession = data.session;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession) {
          redirectAuthenticatedUser();
        }
      } catch (e) {
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: unknown, currentSession: Session | null) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);

      if (currentSession) {
        redirectAuthenticatedUser();
      }
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
      metadata?: SignupMetadata
    ) => {
      try {
        const nextPath = appendRequestedPlan(getLocalizedDashboardPath(), metadata?.requested_plan);
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
      if (typeof window === 'undefined') {
        return { error: new Error('Google OAuth must start in the browser.') };
      }

      window.location.assign(getGoogleOAuthEntryUrl());
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
        redirectTo: getAuthCallbackUrl(getLocalizedPath('/atualizar-senha')),
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

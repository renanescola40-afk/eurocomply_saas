'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type SignupMetadata = {
  name?: string;
  company_name?: string;
  requested_plan?: string;
};

type OAuthOptions = {
  next?: string;
};

type AppUser = User & {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  imageUrl?: string | null;
};

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, metadata?: SignupMetadata) => Promise<{ error: Error | null }>;
  signInWithGoogle: (options?: OAuthOptions) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getLocaleFromWindow() {
  if (typeof window === 'undefined') return 'pt';
  return window.location.pathname.split('/').filter(Boolean)[0] ?? 'pt';
}

function getLocalizedPath(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `/${getLocaleFromWindow()}${normalizedPath}`;
}

function getRedirectUrl(path = '/onboarding') {
  if (typeof window === 'undefined') return getLocalizedPath(path);
  return new URL(getLocalizedPath(path), window.location.origin).toString();
}

function getRootAuthCallbackUrl(next?: string) {
  const locale = getLocaleFromWindow();
  const callbackUrl = new URL('/auth/callback', window.location.origin);
  callbackUrl.searchParams.set('locale', locale);
  if (next && next.startsWith(`/${locale}/`) && !next.startsWith('//') && !next.includes('://')) {
    callbackUrl.searchParams.set('next', next);
  }
  return callbackUrl.toString();
}

function readMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeUser(user: User | null): AppUser | null {
  if (!user) return null;
  const metadata = user.user_metadata ?? {};
  const fullName = readMetadataString(metadata, 'full_name') ?? readMetadataString(metadata, 'name');
  const nameParts = fullName?.split(/\s+/).filter(Boolean) ?? [];
  const inferredLastName = nameParts.slice(1).join(' ') || null;
  return {
    ...user,
    firstName: readMetadataString(metadata, 'first_name') ?? nameParts[0] ?? null,
    lastName: readMetadataString(metadata, 'last_name') ?? inferredLastName,
    fullName,
    imageUrl: readMetadataString(metadata, 'avatar_url') ?? readMetadataString(metadata, 'picture'),
  };
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error || 'Authentication error'));
}

export function getLocalizedDashboardPath() {
  return getLocalizedPath('/dashboard/organizations');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then((result: { data: { session: Session | null } }) => {
      if (!mounted) return;
      const nextSession = result.data.session ?? null;
      setSession(nextSession);
      setUser(normalizeUser(nextSession?.user ?? null));
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event: string, nextSession: Session | null) => {
      setSession(nextSession ?? null);
      setUser(normalizeUser(nextSession?.user ?? null));
      setLoading(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? toError(error) : null };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, metadata?: SignupMetadata) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getRedirectUrl('/onboarding'),
        data: {
          name: metadata?.name,
          full_name: metadata?.name,
          company_name: metadata?.company_name,
          requested_plan: metadata?.requested_plan,
        },
      },
    });
    return { error: error ? toError(error) : null };
  }, []);

  const signInWithGoogle = useCallback(async (options?: OAuthOptions) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getRootAuthCallbackUrl(options?.next) },
    });
    return { error: error ? toError(error) : null };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (!error && typeof window !== 'undefined') window.location.assign(getLocalizedPath('/login'));
    return { error: error ? toError(error) : null };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: getRedirectUrl('/reset-password') });
    return { error: error ? toError(error) : null };
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
  }), [loading, resetPassword, session, signInWithEmail, signInWithGoogle, signOut, signUpWithEmail, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

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
  signUpWithEmail: (email: string, password: string, metadata?: { name?: string; company_name?: string }) => Promise<{ error: Error | null }>;
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
    async function loadSession() {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        setSession(session);
        setUser(session?.user ?? null);
      } catch (e) {
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

  const getCurrentLocalePrefix = () => {
    if (typeof window === 'undefined') return '';
    const segments = window.location.pathname.split('/').filter(Boolean);
    const currentLocale = segments[0] as Locale | undefined;
    return locales.includes(currentLocale as Locale) ? `/${currentLocale}` : '';
  };

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error as Error | null };
    } catch (e) {
      return { error: e as Error };
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, metadata?: { name?: string; company_name?: string }) => {
    try {
      const localePrefix = getCurrentLocalePrefix();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}${localePrefix}/dashboard` : undefined,
        },
      });
      return { error: error as Error | null };
    } catch (e) {
      return { error: e as Error };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const localePrefix = getCurrentLocalePrefix();
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}${localePrefix}/dashboard` 
        : undefined;

      // Validação de redirect URL
      if (!redirectUrl) {
        throw new Error('Redirect URL não disponível');
      }

      // Log para debug
      console.info('[OAuth] Iniciando login com Google', {
        redirectUrl,
        timestamp: new Date().toISOString(),
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            prompt: 'select_account',
          },
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      // ==========================================
      // TRATAMENTO DE ERROS ESPECÍFICOS DO OAUTH
      // ==========================================
      if (error) {
        const errorCode = (error as any)?.error_code || error.message;
        const isProviderDisabled = error.message?.includes('provider is not enabled') 
          || error.message?.includes('Unsupported provider')
          || errorCode === 'validation_failed';
        
        const isRedirectMismatch = error.message?.includes('redirect') 
          || error.message?.includes('callback')
          || errorCode === 'invalid_redirect_uri';

        console.error('[OAuth] Erro ao tentar login:', {
          message: error.message,
          errorCode,
          isProviderDisabled,
          isRedirectMismatch,
          fullError: error,
        });

        if (isProviderDisabled) {
          return {
            error: new Error(
              '❌ Google OAuth ainda não está ativado no Supabase. ' +
              'Entre em contato com o administrador para ativar o provider.'
            ) as Error,
          };
        }

        if (isRedirectMismatch) {
          return {
            error: new Error(
              '❌ Erro de configuração: O redirect URI não coincide com o configurado no Google Console. ' +
              `URL esperada: ${redirectUrl}`
            ) as Error,
          };
        }

        return { error: error as Error | null };
      }

      if (data?.url && typeof window !== 'undefined') {
        console.info('[OAuth] URL de autorização recebida, abrindo popup');
        const popupWindow = window.open(data.url, 'google-login', 'width=500,height=650');
        
        if (!popupWindow) {
          throw new Error('Não foi possível abrir o popup de login. Verifique se pop-ups estão bloqueados.');
        }

        // Listener com timeout para fechar popup automáticamente
        const listeners: any[] = [];
        const timeoutId = setTimeout(() => {
          popupWindow.close();
          listeners.forEach(l => l.subscription.unsubscribe());
          console.warn('[OAuth] Popup fechado por timeout');
        }, 5 * 60 * 1000); // 5 minutos

        const { data: listener } = supabase.auth.onAuthStateChange((event: unknown, session: Session | null) => {
          console.info('[OAuth] Auth state mudou:', event);
          
          if (event === 'SIGNED_IN' && session) {
            clearTimeout(timeoutId);
            popupWindow?.close();
            listener.subscription.unsubscribe();
            console.info('[OAuth] Login bem-sucedido, redirecionando');
            window.location.href = redirectUrl;
          } else if (event === 'USER_UPDATED') {
            // Usuário foi criado/atualizado
            console.info('[OAuth] Usuário atualizado, aguardando confirmação');
          }
        });

        listeners.push({ subscription: listener.subscription });
      }

      return { error: null };
    } catch (e) {
      const error = e as Error;
      console.error('[OAuth] Erro não tratado:', {
        message: error.message,
        stack: error.stack,
      });
      return { error };
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
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      });
      return { error: error as Error | null };
    } catch (e) {
      return { error: e as Error };
    }
  }, []);

  const value = {
    user,
    session,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

'use client';

import React, { createContext, useCallback, useContext, useMemo } from 'react';
import {
  useClerk,
  useSession,
  useSignIn,
  useSignUp,
  useUser,
} from '@clerk/nextjs';

type SignupMetadata = {
  name?: string;
  company_name?: string;
  requested_plan?: string;
};

type ClerkCompatUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  imageUrl: string;
  user_metadata: Record<string, unknown>;
  publicMetadata: Record<string, unknown>;
};

type ClerkCompatSession = {
  id: string;
} | null;

interface AuthContextType {
  user: ClerkCompatUser | null;
  session: ClerkCompatSession;
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

function getPrimaryEmail(user: ReturnType<typeof useUser>['user']) {
  return user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null;
}

function getLocalizedPath(path: string) {
  if (typeof window === 'undefined') return `/pt${path.startsWith('/') ? path : `/${path}`}`;
  const segments = window.location.pathname.split('/').filter(Boolean);
  const locale = segments[0] ?? 'pt';
  return `/${locale}${path.startsWith('/') ? path : `/${path}`}`;
}

function getRedirectUrl(path = '/dashboard/organizations') {
  if (typeof window === 'undefined') return getLocalizedPath(path);
  return new URL(getLocalizedPath(path), window.location.origin).toString();
}

export function getLocalizedDashboardPath() {
  return getLocalizedPath('/dashboard/organizations');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const { session: clerkSession, isLoaded: sessionLoaded } = useSession();
  const { signOut: clerkSignOut } = useClerk();
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

  const user = useMemo<ClerkCompatUser | null>(() => {
    if (!clerkUser) return null;

    const publicMetadata = clerkUser.publicMetadata as Record<string, unknown>;
    const userMetadata = {
      ...publicMetadata,
      email: getPrimaryEmail(clerkUser),
      name: clerkUser.fullName,
      full_name: clerkUser.fullName,
      first_name: clerkUser.firstName,
      last_name: clerkUser.lastName,
    } satisfies Record<string, unknown>;

    return {
      id: clerkUser.id,
      email: getPrimaryEmail(clerkUser),
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      fullName: clerkUser.fullName,
      imageUrl: clerkUser.imageUrl,
      user_metadata: userMetadata,
      publicMetadata,
    };
  }, [clerkUser]);

  const session = useMemo<ClerkCompatSession>(() => {
    if (!clerkSession) return null;
    return { id: clerkSession.id };
  }, [clerkSession]);

  const loading = !userLoaded || !sessionLoaded;

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      if (!signInLoaded || !signIn || !setSignInActive) {
        return { error: new Error('Clerk sign-in is not ready yet') };
      }

      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status !== 'complete') {
        return { error: new Error('Additional sign-in verification is required') };
      }

      await setSignInActive({ session: result.createdSessionId });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [setSignInActive, signIn, signInLoaded]);

  const signUpWithEmail = useCallback(async (
    email: string,
    password: string,
    metadata?: SignupMetadata,
  ) => {
    try {
      if (!signUpLoaded || !signUp || !setSignUpActive) {
        return { error: new Error('Clerk sign-up is not ready yet') };
      }

      const nameParts = metadata?.name?.trim().split(/\s+/).filter(Boolean) ?? [];
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || undefined;

      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
        unsafeMetadata: {
          company_name: metadata?.company_name,
          requested_plan: metadata?.requested_plan,
        },
      });

      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        return { error: null };
      }

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [setSignUpActive, signUp, signUpLoaded]);

  const signInWithGoogle = useCallback(async () => {
    try {
      if (!signInLoaded || !signIn) {
        return { error: new Error('Clerk sign-in is not ready yet') };
      }

      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: getRedirectUrl('/login'),
        redirectUrlComplete: getRedirectUrl('/dashboard/organizations'),
      });

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [signIn, signInLoaded]);

  const signOut = useCallback(async () => {
    try {
      await clerkSignOut({ redirectUrl: '/' });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [clerkSignOut]);

  const resetPassword = useCallback(async () => {
    return {
      error: new Error('Use Clerk account recovery from the sign-in page.'),
    };
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

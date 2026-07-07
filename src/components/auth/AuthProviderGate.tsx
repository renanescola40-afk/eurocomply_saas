'use client';

import { usePathname } from 'next/navigation';

import { AuthProvider } from '@/hooks/useAuth';

const AUTH_PROVIDER_SEGMENTS = new Set([
  'login',
  'signup',
  'register',
  'reset-password',
  'onboarding',
  'checkout',
  'billing',
  'dashboard',
  'settings',
  'team',
  'profile',
]);

function needsAuthProvider(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const routeSegment = segments[1] ?? segments[0] ?? '';
  return AUTH_PROVIDER_SEGMENTS.has(routeSegment);
}

export function AuthProviderGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';

  if (!needsAuthProvider(pathname)) {
    return <>{children}</>;
  }

  return <AuthProvider>{children}</AuthProvider>;
}

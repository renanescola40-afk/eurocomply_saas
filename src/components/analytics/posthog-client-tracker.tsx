'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

type PostHogBrowserClient = {
  capture: (eventName: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
};

declare global {
  interface Window {
    posthog?: PostHogBrowserClient;
  }
}

function withPostHog(callback: (posthog: PostHogBrowserClient) => void, retries = 12) {
  if (typeof window === 'undefined') return;

  if (window.posthog) {
    callback(window.posthog);
    return;
  }

  if (retries > 0) {
    window.setTimeout(() => withPostHog(callback, retries - 1), 250);
  }
}

function getSanitizedCurrentUrl(pathname: string) {
  if (typeof window === 'undefined') return pathname || '/';
  return `${window.location.origin}${pathname || '/'}`;
}

export function PostHogClientTracker() {
  const pathname = usePathname() ?? '/';
  const { user, loading } = useAuth();
  const identifiedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    withPostHog((posthog) => {
      posthog.capture('$pageview', {
        $current_url: getSanitizedCurrentUrl(pathname),
        path: pathname,
        source: 'next_app_router',
      });
    });
  }, [pathname]);

  useEffect(() => {
    const handlePageLeave = () => {
      withPostHog((posthog) => {
        posthog.capture('$pageleave', {
          $current_url: getSanitizedCurrentUrl(pathname),
          path: pathname,
          source: 'next_app_router',
        });
      }, 1);
    };

    window.addEventListener('pagehide', handlePageLeave);
    return () => window.removeEventListener('pagehide', handlePageLeave);
  }, [pathname]);

  useEffect(() => {
    if (loading) return;

    if (!user?.id) {
      if (identifiedUserIdRef.current) {
        withPostHog((posthog) => posthog.reset());
        identifiedUserIdRef.current = null;
      }
      return;
    }

    if (identifiedUserIdRef.current === user.id) return;

    withPostHog((posthog) => {
      posthog.identify(user.id, {
        email: user.email ?? undefined,
        name: user.fullName ?? undefined,
        first_name: user.firstName ?? undefined,
        last_name: user.lastName ?? undefined,
        app: 'risck-comply',
      });
      identifiedUserIdRef.current = user.id;
    });
  }, [loading, user?.email, user?.firstName, user?.fullName, user?.id, user?.lastName]);

  return null;
}

'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  analyticsEvents,
  captureAnalyticsEvent,
  initPostHog,
  updateSessionRecordingForPath,
} from '@/lib/analytics/posthog-client';

type PostHogAnalyticsProviderProps = {
  children: React.ReactNode;
};

function getLocaleFromPath(pathname: string) {
  const [, maybeLocale] = pathname.split('/');
  return maybeLocale || 'en';
}

export function PostHogAnalyticsProvider({ children }: PostHogAnalyticsProviderProps) {
  const pathname = usePathname() || '/';
  const openedDashboardPathsRef = useRef(new Set<string>());

  useEffect(() => {
    initPostHog(pathname);
    updateSessionRecordingForPath(pathname);
  }, [pathname]);

  useEffect(() => {
    const isDashboard = /\/dashboard(\/|$)/.test(pathname);
    if (!isDashboard || openedDashboardPathsRef.current.has(pathname)) return;

    openedDashboardPathsRef.current.add(pathname);
    captureAnalyticsEvent(analyticsEvents.dashboardOpened, {
      path: pathname,
      locale: getLocaleFromPath(pathname),
      auth_provider: 'supabase',
    });
  }, [pathname]);

  return <>{children}</>;
}

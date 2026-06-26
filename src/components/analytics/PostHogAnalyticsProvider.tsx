'use client';

import { useEffect, useRef } from 'react';
import { useAuth, useOrganization } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import {
  analyticsEvents,
  captureAnalyticsEvent,
  groupAnalyticsOrganization,
  identifyAnalyticsUser,
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
  const { isSignedIn, userId, orgId, orgRole } = useAuth();
  const { organization } = useOrganization();
  const previousUserIdRef = useRef<string | null>(null);
  const previousOrgIdRef = useRef<string | null>(null);
  const openedDashboardPathsRef = useRef(new Set<string>());

  useEffect(() => {
    initPostHog(pathname);
    updateSessionRecordingForPath(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!isSignedIn || !userId) return;

    identifyAnalyticsUser(userId, {
      has_organization: Boolean(orgId),
      role: orgRole ?? null,
    });

    if (previousUserIdRef.current !== userId) {
      captureAnalyticsEvent(previousUserIdRef.current ? analyticsEvents.userSignedIn : analyticsEvents.userSignedIn, {
        source: 'clerk_client_session',
        has_organization: Boolean(orgId),
      });
      previousUserIdRef.current = userId;
    }
  }, [isSignedIn, orgId, orgRole, userId]);

  useEffect(() => {
    if (!orgId) return;

    groupAnalyticsOrganization(orgId, {
      clerk_org_id: orgId,
      organization_id: organization?.publicMetadata?.organizationId as string | undefined,
    });

    if (previousOrgIdRef.current && previousOrgIdRef.current !== orgId) {
      captureAnalyticsEvent(analyticsEvents.organizationSwitched, {
        clerk_org_id: orgId,
        source: 'clerk_active_organization',
      });
    }

    previousOrgIdRef.current = orgId;
  }, [orgId, organization?.publicMetadata]);

  useEffect(() => {
    const isDashboard = /\/dashboard(\/|$)/.test(pathname);
    if (!isDashboard || openedDashboardPathsRef.current.has(pathname)) return;

    openedDashboardPathsRef.current.add(pathname);
    captureAnalyticsEvent(analyticsEvents.dashboardOpened, {
      path: pathname,
      locale: getLocaleFromPath(pathname),
      clerk_org_id: orgId ?? null,
    });
  }, [orgId, pathname]);

  return <>{children}</>;
}

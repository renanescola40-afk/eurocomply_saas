'use client';

import { useEffect } from 'react';

import { analyticsEvents, captureAnalyticsEvent } from '@/lib/analytics/posthog-client';

type Props = {
  progress: number;
  hasOrganization: boolean;
  hasMembers: boolean;
  hasDocuments: boolean;
  hasRisks: boolean;
  hasVendors: boolean;
  hasDashboardOpened: boolean;
};

export function OnboardingTelemetry({
  progress,
  hasOrganization,
  hasMembers,
  hasDocuments,
  hasRisks,
  hasVendors,
  hasDashboardOpened,
}: Props) {
  useEffect(() => {
    captureAnalyticsEvent(analyticsEvents.onboardingChecklistViewed, {
      source: 'onboarding_progress_card',
      has_organization: hasOrganization,
      has_members: hasMembers,
      has_documents: hasDocuments,
      has_risks: hasRisks,
      has_vendors: hasVendors,
      has_dashboard_opened: hasDashboardOpened,
      onboarding_progress: progress,
    });
  }, [progress, hasOrganization, hasMembers, hasDocuments, hasRisks, hasVendors, hasDashboardOpened]);

  return null;
}

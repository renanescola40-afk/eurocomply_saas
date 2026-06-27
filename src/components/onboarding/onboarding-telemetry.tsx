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

export function OnboardingTelemetry(props: Props) {
  useEffect(() => {
    captureAnalyticsEvent(analyticsEvents.onboardingChecklistViewed, {
      source: 'onboarding_progress_card',
      has_organization: props.hasOrganization,
      has_members: props.hasMembers,
      has_documents: props.hasDocuments,
      has_risks: props.hasRisks,
      has_vendors: props.hasVendors,
      has_dashboard_opened: props.hasDashboardOpened,
      onboarding_progress: props.progress,
    });
  }, [props]);

  return null;
}

import { analyticsEvents, buildGroupProperties, sanitizeAnalyticsProperties, type AnalyticsEventName, type AnalyticsProperties } from './events';

const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com';

type ServerCaptureInput = {
  event: AnalyticsEventName;
  distinctId: string;
  organizationId?: string | null;
  clerkOrgId?: string | null;
  properties?: AnalyticsProperties;
};

function getPostHogKey() {
  return process.env.POSTHOG_KEY?.trim() || process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || '';
}

function getPostHogHost() {
  return process.env.POSTHOG_HOST?.trim() || process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST;
}

export async function captureServerAnalytics(input: ServerCaptureInput) {
  const apiKey = getPostHogKey();

  if (!apiKey || !input.distinctId) return;

  const groups = buildGroupProperties(input.organizationId, input.clerkOrgId);
  const properties = sanitizeAnalyticsProperties({
    schema_version: 1,
    event_source: 'server',
    organization_id: input.organizationId ?? null,
    clerk_org_id: input.clerkOrgId ?? null,
    ...input.properties,
  });

  try {
    await fetch(`${getPostHogHost().replace(/\/$/, '')}/capture/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        event: input.event,
        distinct_id: input.distinctId,
        properties: {
          ...properties,
          ...(groups ? { $groups: { company: groups.company } } : {}),
        },
      }),
      cache: 'no-store',
    });
  } catch {
    // Analytics must never block product or billing flows.
  }
}

export { analyticsEvents };

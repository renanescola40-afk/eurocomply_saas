import { createAdminClient } from '@/lib/supabase/admin';

export type NormalizedOnboardingStatus = 'not_started' | 'in_progress' | 'completed';

export function normalizeOnboardingStatus(value: unknown): NormalizedOnboardingStatus {
  return value === 'completed' || value === 'in_progress' || value === 'not_started' ? value : 'not_started';
}

export function isOrganizationOnboardingCompleted(input: {
  onboarding_status?: string | null;
  onboarding_completed_at?: string | null;
}) {
  return normalizeOnboardingStatus(input.onboarding_status) === 'completed' && Boolean(input.onboarding_completed_at);
}

type OrganizationSummary = {
  id: string;
  name: string;
  slug: string | null;
  onboarding_status: NormalizedOnboardingStatus;
  onboarding_completed_at: string | null;
  selected_plan: string | null;
};

type RawOrganizationMembership = {
  organization_id: string;
  role: string;
  status?: string | null;
  organizations:
    | {
        id: string;
        name: string;
        slug: string | null;
        onboarding_status?: string | null;
        onboarding_completed_at?: string | null;
        selected_plan?: string | null;
      }
    | Array<{
        id: string;
        name: string;
        slug: string | null;
        onboarding_status?: string | null;
        onboarding_completed_at?: string | null;
        selected_plan?: string | null;
      }>
    | null;
};

type QueryError = { code?: string; message?: string } | null;

export type CurrentOrganizationMembership = {
  organization_id: string;
  id: string;
  role: string;
  name: string;
  slug: string | null;
  onboarding_status: NormalizedOnboardingStatus;
  onboarding_completed_at: string | null;
  selected_plan: string | null;
  is_onboarding_completed: boolean;
  organization: OrganizationSummary;
  organizations: OrganizationSummary;
};

function isExpectedSchemaFallback(error: QueryError) {
  return error?.code === '42P01'
    || error?.code === '42703'
    || error?.code === 'PGRST200'
    || error?.code === 'PGRST204'
    || error?.code === 'PGRST205';
}

function isMissingMembershipStatusColumn(error: QueryError) {
  return error?.code === '42703' || error?.code === 'PGRST204';
}

function normalizeMembership(membership: RawOrganizationMembership): CurrentOrganizationMembership | null {
  // Status-aware queries already filter at the provider boundary, but keep a
  // second fail-closed check here so suspended/deprovisioned memberships can
  // never become tenant context if a provider/query regression drops the filter.
  if (membership.status != null && membership.status.trim().toLowerCase() !== 'active') {
    return null;
  }

  const organization = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;
  if (!organization) return null;

  const onboardingStatus = normalizeOnboardingStatus(organization.onboarding_status);
  const onboardingCompletedAt = organization.onboarding_completed_at ?? null;
  const selectedPlan = organization.selected_plan ?? null;
  const normalizedOrganization: OrganizationSummary = {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    onboarding_status: onboardingStatus,
    onboarding_completed_at: onboardingCompletedAt,
    selected_plan: selectedPlan,
  };

  return {
    organization_id: membership.organization_id,
    id: organization.id,
    role: membership.role,
    name: organization.name,
    slug: organization.slug,
    onboarding_status: onboardingStatus,
    onboarding_completed_at: onboardingCompletedAt,
    selected_plan: selectedPlan,
    is_onboarding_completed: isOrganizationOnboardingCompleted({ onboarding_status: onboardingStatus, onboarding_completed_at: onboardingCompletedAt }),
    organization: normalizedOrganization,
    organizations: normalizedOrganization,
  };
}

function normalizeMemberships(data: unknown) {
  return ((data ?? []) as RawOrganizationMembership[])
    .map(normalizeMembership)
    .filter((membership): membership is CurrentOrganizationMembership => Boolean(membership));
}

export async function getUserOrganizationMemberships(userId: string, options: { limit?: number } = {}) {
  const supabase = createAdminClient();
  const safeLimit = Math.max(1, Math.min(options.limit ?? 25, 100));

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role, status, organizations(id, name, slug, onboarding_status, onboarding_completed_at, selected_plan)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .range(0, safeLimit - 1);

  if (!error) {
    return normalizeMemberships(data);
  }

  if (isExpectedSchemaFallback(error)) {
    console.warn('[organization] membership_onboarding_columns_unavailable', { code: error.code ?? 'unknown' });

    // Keep active membership authority even when optional onboarding columns are
    // unavailable. This fallback deliberately retains the status projection and
    // filter so a suspended row cannot regain read access through schema drift.
    const statusAwareFallback = await supabase
      .from('organization_members')
      .select('organization_id, role, status, organizations(id, name, slug)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .range(0, safeLimit - 1);

    if (!statusAwareFallback.error) {
      return normalizeMemberships(statusAwareFallback.data);
    }

    // Legacy compatibility is permitted only when the membership status column
    // itself is unavailable. Any other provider/query failure remains closed.
    if (!isMissingMembershipStatusColumn(statusAwareFallback.error)) {
      console.warn('[organization] memberships_status_aware_fallback_failed', { code: statusAwareFallback.error.code ?? 'unknown' });
      throw new Error('organization_memberships_unavailable');
    }

    const legacy = await supabase
      .from('organization_members')
      .select('organization_id, role, organizations(id, name, slug)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .range(0, safeLimit - 1);

    if (!legacy.error) {
      return normalizeMemberships(legacy.data);
    }

    console.warn('[organization] memberships_fallback_lookup_failed', { code: legacy.error.code ?? 'unknown' });
    throw new Error('organization_memberships_unavailable');
  }

  console.warn('[organization] memberships_lookup_failed', { code: error.code ?? 'unknown' });
  throw new Error('organization_memberships_unavailable');
}

export async function getCurrentOrganizationForUser(userId: string, slug?: string, _activeLegacyOrgId?: string | null) {
  const memberships = await getUserOrganizationMemberships(userId);

  if (slug) {
    return memberships.find((membership) => membership.slug === slug) ?? null;
  }

  return memberships.find((membership) => membership.is_onboarding_completed) ?? memberships[0] ?? null;
}

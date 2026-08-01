import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
};

type RawOrganizationMembership = {
  organization_id: string;
  role: string;
  organizations:
    | {
        id: string;
        name: string;
        slug: string | null;
        onboarding_status?: string | null;
        onboarding_completed_at?: string | null;
      }
    | Array<{
        id: string;
        name: string;
        slug: string | null;
        onboarding_status?: string | null;
        onboarding_completed_at?: string | null;
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
  is_onboarding_completed: boolean;
  organization: OrganizationSummary;
  organizations: OrganizationSummary;
};

function isExpectedSchemaFallback(error: QueryError) {
  return error?.code === '42P01' || error?.code === '42703' || error?.code === 'PGRST204' || error?.code === 'PGRST205';
}

async function getMembershipClient() {
  const admin = tryCreateAdminClient();
  if (admin) return admin;

  // Reading the signed-in user's own memberships should remain available even
  // when a preview/production deployment is missing the service-role secret.
  return createServerSupabaseClient();
}

function normalizeMembership(membership: RawOrganizationMembership): CurrentOrganizationMembership | null {
  const organization = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;
  if (!organization) return null;

  const onboardingStatus = normalizeOnboardingStatus(organization.onboarding_status);
  const onboardingCompletedAt = organization.onboarding_completed_at ?? null;
  const normalizedOrganization: OrganizationSummary = {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    onboarding_status: onboardingStatus,
    onboarding_completed_at: onboardingCompletedAt,
  };

  return {
    organization_id: membership.organization_id,
    id: organization.id,
    role: membership.role,
    name: organization.name,
    slug: organization.slug,
    onboarding_status: onboardingStatus,
    onboarding_completed_at: onboardingCompletedAt,
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
  const supabase = await getMembershipClient();
  const safeLimit = Math.max(1, Math.min(options.limit ?? 25, 100));

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(id, name, slug, onboarding_status, onboarding_completed_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .range(0, safeLimit - 1);

  if (!error) {
    return normalizeMemberships(data);
  }

  if (isExpectedSchemaFallback(error)) {
    console.warn('[organization] membership_onboarding_columns_unavailable', { code: error.code ?? 'unknown' });
    const fallback = await supabase
      .from('organization_members')
      .select('organization_id, role, organizations(id, name, slug)')
      .eq('user_id', userId)
      .range(0, safeLimit - 1);

    if (!fallback.error) {
      return normalizeMemberships(fallback.data);
    }

    console.warn('[organization] memberships_fallback_lookup_failed', { code: fallback.error.code ?? 'unknown' });
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

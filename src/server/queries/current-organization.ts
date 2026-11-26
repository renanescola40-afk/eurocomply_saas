import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseOrganizationRole } from '@/lib/security/permissions';
import { enforceMandatoryEnterpriseSsoAccess } from '@/server/security/enterprise-sso-access';

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

async function finalizeTenantMemberships(data: unknown) {
  return enforceMandatoryEnterpriseSsoAccess(normalizeMemberships(data));
}

const QA_ORIGIN = 'https://zrxrrfbllsxtleyxjpsz.supabase.co';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRestrictedQaOrganizationReader() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL === QA_ORIGIN
    && !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    && process.env.VERCEL_ENV !== 'production';
}

/** Own live-AAL2 context only. The reviewed SQL enforces active membership and
 * mandatory SAML binding before returning any tenant fields; it is not paid
 * product authority or a replacement for transactional mutation checks.
 * A failed/unavailable RPC must never fall back to a privileged client. */
async function readRestrictedQaMemberships(userId: string, safeLimit: number): Promise<CurrentOrganizationMembership[]> {
  const unavailable = () => new Error('organization_memberships_unavailable');
  if (!UUID.test(userId) || !Number.isInteger(safeLimit) || safeLimit < 1 || safeLimit > 100) throw unavailable();
  const supabase = await createServerSupabaseClient();
  const { data: identity, error: identityError } = await supabase.auth.getUser();
  if (identityError || identity.user?.id !== userId || identity.user?.is_anonymous !== false) throw unavailable();
  const { data, error } = await supabase.rpc('get_my_qa_organization_context');
  if (error || !Array.isArray(data) || data.length > 100) throw unavailable();
  const seen = new Set<string>();
  const memberships: CurrentOrganizationMembership[] = [];
  for (const value of data as unknown[]) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw unavailable();
    const row = value as Record<string, unknown>;
    if (Object.keys(row).length !== 8 || typeof row.organization_id !== 'string' || !UUID.test(row.organization_id)
      || typeof row.role !== 'string' || !parseOrganizationRole(row.role) || row.status !== 'active'
      || typeof row.name !== 'string' || !row.name.trim()
      || !(row.slug === null || typeof row.slug === 'string')
      || typeof row.onboarding_status !== 'string' || !['not_started','in_progress','completed'].includes(row.onboarding_status)
      || !(row.onboarding_completed_at === null || (typeof row.onboarding_completed_at === 'string' && Number.isFinite(Date.parse(row.onboarding_completed_at))))
      || !(row.selected_plan === null || typeof row.selected_plan === 'string')) throw unavailable();
    const id = row.organization_id.toLowerCase();
    if (seen.has(id)) throw unavailable();
    seen.add(id);
    const membership = normalizeMembership({
      organization_id: id, role: row.role, status: 'active',
      organizations: {
        id, name: row.name, slug: row.slug as string | null,
        onboarding_status: row.onboarding_status as string,
        onboarding_completed_at: row.onboarding_completed_at as string | null,
        selected_plan: row.selected_plan as string | null,
      },
    });
    if (!membership) throw unavailable();
    memberships.push(membership);
  }
  return memberships.slice(0, safeLimit);
}

export async function getUserOrganizationMemberships(userId: string, options: { limit?: number } = {}) {
  const safeLimit = Math.max(1, Math.min(options.limit ?? 25, 100));
  if (isRestrictedQaOrganizationReader()) return readRestrictedQaMemberships(userId, safeLimit);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role, status, organizations(id, name, slug, onboarding_status, onboarding_completed_at, selected_plan)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .range(0, safeLimit - 1);

  if (!error) {
    return finalizeTenantMemberships(data);
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
      return finalizeTenantMemberships(statusAwareFallback.data);
    }

    // A PostgREST schema-cache miss is not proof that the underlying column is
    // absent. The legacy status-less read is allowed only after the pre-existing
    // database introspection RPC proves directly from information_schema that
    // organization_members.status does not exist. Probe failure or a true result
    // remains fail-closed.
    if (!isMissingMembershipStatusColumn(statusAwareFallback.error)) {
      console.warn('[organization] memberships_status_aware_fallback_failed', { code: statusAwareFallback.error.code ?? 'unknown' });
      throw new Error('organization_memberships_unavailable');
    }

    const statusCapability = await supabase.rpc('live_rls_validation_has_column', {
      table_name: 'organization_members',
      column_name: 'status',
    });

    if (statusCapability.error || statusCapability.data !== false) {
      console.warn('[organization] membership_status_capability_probe_failed_closed', {
        code: statusCapability.error?.code ?? 'status_column_present',
      });
      throw new Error('organization_memberships_unavailable');
    }

    const legacy = await supabase
      .from('organization_members')
      .select('organization_id, role, organizations(id, name, slug)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .range(0, safeLimit - 1);

    if (!legacy.error) {
      return finalizeTenantMemberships(legacy.data);
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

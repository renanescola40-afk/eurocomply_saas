import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const uuidSchema = z.string().uuid();

export type OrganizationMembershipLike = {
  organization_id: string;
};

export type MandatorySsoPolicyRow = {
  organization_id?: unknown;
  supabase_provider_id?: unknown;
  enforce_sso?: unknown;
  status?: unknown;
  protocol?: unknown;
};

type SupabaseClaimsApi = {
  getClaims?: () => Promise<{
    data?: { claims?: Record<string, unknown> | null } | null;
    error?: { code?: string; message?: string } | null;
  }>;
};

type QueryError = { code?: string; message?: string } | null;

function isMissingSsoSchema(error: QueryError) {
  return error?.code === '42P01'
    || error?.code === '42703'
    || error?.code === 'PGRST200'
    || error?.code === 'PGRST204'
    || error?.code === 'PGRST205';
}

export function extractTrustedSamlProviderId(claims: Record<string, unknown> | null | undefined) {
  const amr = claims?.amr;
  if (!Array.isArray(amr)) return null;

  for (const value of amr) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const entry = value as Record<string, unknown>;
    const method = typeof entry.method === 'string' ? entry.method : '';
    const provider = uuidSchema.safeParse(entry.provider);
    if (method === 'sso/saml' && provider.success) return provider.data;
  }

  return null;
}

export function filterMembershipsByMandatorySso<T extends OrganizationMembershipLike>(
  memberships: T[],
  policyRows: MandatorySsoPolicyRow[],
  sessionProviderId: string | null,
): T[] {
  const membershipOrganizations = new Set(memberships.map((membership) => membership.organization_id));
  const mandatoryProviders = new Map<string, Set<string> | null>();

  for (const row of policyRows) {
    if (row.enforce_sso !== true || row.status !== 'active' || row.protocol !== 'saml') continue;

    const organizationId = uuidSchema.safeParse(row.organization_id);
    if (!organizationId.success || !membershipOrganizations.has(organizationId.data)) continue;

    const providerId = uuidSchema.safeParse(row.supabase_provider_id);
    if (!providerId.success) {
      // An active mandatory policy without a valid provider binding is unsafe.
      // Mark only that tenant as unavailable instead of weakening enforcement.
      mandatoryProviders.set(organizationId.data, null);
      continue;
    }

    const existing = mandatoryProviders.get(organizationId.data);
    if (existing === null) continue;
    const providers = existing ?? new Set<string>();
    providers.add(providerId.data);
    mandatoryProviders.set(organizationId.data, providers);
  }

  if (mandatoryProviders.size === 0) return memberships;

  return memberships.filter((membership) => {
    if (!mandatoryProviders.has(membership.organization_id)) return true;
    const providers = mandatoryProviders.get(membership.organization_id);
    return providers instanceof Set
      && sessionProviderId !== null
      && providers.has(sessionProviderId);
  });
}

export async function enforceMandatoryEnterpriseSsoAccess<T extends OrganizationMembershipLike>(
  memberships: T[],
): Promise<T[]> {
  if (memberships.length === 0) return memberships;

  const admin = createAdminClient();
  const organizationIds = [...new Set(memberships.map((membership) => membership.organization_id))];
  const policyLookup = await admin
    .from('enterprise_identity_connections')
    .select('organization_id,supabase_provider_id,enforce_sso,status,protocol')
    .in('organization_id', organizationIds)
    .eq('status', 'active')
    .eq('protocol', 'saml')
    .eq('enforce_sso', true);

  if (policyLookup.error) {
    if (isMissingSsoSchema(policyLookup.error)) {
      const capability = await admin.rpc('live_rls_validation_has_column', {
        table_name: 'enterprise_identity_connections',
        column_name: 'enforce_sso',
      });

      // Pre-promotion compatibility is allowed only when Postgres itself proves
      // that the mandatory-SSO policy column is absent. A cache miss is not proof.
      if (!capability.error && capability.data === false) {
        return memberships;
      }
    }

    console.warn('[enterprise-sso] mandatory_policy_lookup_failed_closed', {
      code: policyLookup.error.code ?? 'unknown',
    });
    throw new Error('enterprise_sso_policy_unavailable');
  }

  const policyRows = (policyLookup.data ?? []) as MandatorySsoPolicyRow[];
  if (policyRows.length === 0) return memberships;

  const supabase = await createServerSupabaseClient();
  const auth = supabase.auth as typeof supabase.auth & SupabaseClaimsApi;
  if (typeof auth.getClaims !== 'function') {
    console.warn('[enterprise-sso] mandatory_session_claims_unavailable');
    return filterMembershipsByMandatorySso(memberships, policyRows, null);
  }

  const { data, error } = await auth.getClaims();
  if (error || !data?.claims) {
    console.warn('[enterprise-sso] mandatory_session_claims_missing', {
      code: error?.code ?? 'claims_missing',
    });
    return filterMembershipsByMandatorySso(memberships, policyRows, null);
  }

  return filterMembershipsByMandatorySso(
    memberships,
    policyRows,
    extractTrustedSamlProviderId(data.claims),
  );
}

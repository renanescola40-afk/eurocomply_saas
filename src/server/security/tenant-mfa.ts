import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/security/audit-log';

export class TenantMfaError extends Error {
  status: 403 | 503;
  code: 'tenant_mfa_required' | 'tenant_mfa_check_failed';

  constructor(code: TenantMfaError['code'], status: TenantMfaError['status']) {
    super(code);
    this.name = 'TenantMfaError';
    this.code = code;
    this.status = status;
  }
}

type TenantMfaRow = {
  require_mfa_for_all_users: boolean | null;
};

type MfaApi = {
  getAuthenticatorAssuranceLevel: () => Promise<{
    data?: { currentLevel?: string | null } | null;
    error?: { message?: string } | null;
  }>;
};

const ISOLATED_QA_URL = 'https://zrxrrfbllsxtleyxjpsz.supabase.co';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRestrictedQaMfaReader() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL === ISOLATED_QA_URL
    && !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    && process.env.VERCEL_ENV !== 'production';
}

/**
 * #2764 / #2767: consume the existing own-identity policy-discovery RPC.
 * This is NOT a membership, role, SSO, billing or inventory authorization
 * boundary. The separately reviewed SQL checks signed identity and live session.
 * Missing/denied RPC, unexpected rows and unknown orgs fail closed.
 */
async function readOwnQaMfaPolicy(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  organizationId: string,
): Promise<boolean> {
  const unavailable = () => new TenantMfaError('tenant_mfa_check_failed', 503);
  if (!UUID.test(organizationId)) throw unavailable();

  const { data: identity, error: identityError } = await supabase.auth.getUser();
  if (identityError || !identity.user || identity.user.is_anonymous) throw unavailable();

  const { data, error } = await supabase.rpc('get_my_mfa_bootstrap_context');
  if (error || !Array.isArray(data) || data.length > 20) throw unavailable();

  const ownPolicies = new Map<string, boolean>();
  for (const candidate of data as unknown[]) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw unavailable();
    const row = candidate as Record<string, unknown>;
    if (Object.keys(row).length !== 2 || typeof row.organization_id !== 'string'
      || !UUID.test(row.organization_id)
      || typeof row.require_mfa_for_all_users !== 'boolean') throw unavailable();
    const id = row.organization_id.toLowerCase();
    if (ownPolicies.has(id)) throw unavailable();
    ownPolicies.set(id, row.require_mfa_for_all_users);
  }
  const policy = ownPolicies.get(organizationId.toLowerCase());
  if (typeof policy !== 'boolean') throw unavailable();
  return policy;
}

export async function getTenantMfaSessionState(organizationId: string) {
  try {
    // Never fall back to an unverified policy when the isolated QA capability
    // is absent. All existing configured/admin-backed environments are unchanged.
    const restrictedQa = isRestrictedQaMfaReader();
    const qaClient = restrictedQa ? await createServerSupabaseClient() : null;
    let required: boolean;
    if (qaClient) {
      required = await readOwnQaMfaPolicy(qaClient, organizationId);
    } else {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('organization_security_settings')
        .select('require_mfa_for_all_users')
        .eq('organization_id', organizationId)
        .maybeSingle<TenantMfaRow>();

      if (error || typeof data?.require_mfa_for_all_users !== 'boolean') {
        // A missing or malformed tenant policy cannot grant product access.
        throw new TenantMfaError('tenant_mfa_check_failed', 503);
      }
      required = data.require_mfa_for_all_users;
    }
    if (!required) {
      return { required: false, satisfied: true, assuranceLevel: null as string | null };
    }

    const supabase = qaClient ?? await createServerSupabaseClient();
    const mfa = (supabase.auth as unknown as { mfa?: MfaApi }).mfa;

    if (!mfa?.getAuthenticatorAssuranceLevel) {
      throw new TenantMfaError('tenant_mfa_check_failed', 503);
    }

    const assurance = await mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error) {
      throw new TenantMfaError('tenant_mfa_check_failed', 503);
    }

    const assuranceLevel = assurance.data?.currentLevel ?? null;
    return {
      required: true,
      satisfied: assuranceLevel === 'aal2',
      assuranceLevel,
    };
  } catch (error) {
    if (error instanceof TenantMfaError) throw error;
    throw new TenantMfaError('tenant_mfa_check_failed', 503);
  }
}

export async function requireTenantMfaForOrganization(organizationId: string) {
  const state = await getTenantMfaSessionState(organizationId);
  if (state.required && !state.satisfied) {
    throw new TenantMfaError('tenant_mfa_required', 403);
  }
  return state;
}


export async function recordTenantMfaDenial(organizationId: string, userId: string | null | undefined, surface: string) {
  try {
    await writeAuditLog({
      action: 'security.failure',
      organizationId,
      actorUserId: userId ?? null,
      entityType: 'tenant_mfa_policy',
      entityId: organizationId,
      metadata: {
        securityEvent: 'tenant_mfa.denied',
        reason: 'aal2_required',
        surface,
      },
    });
  } catch {
    // Authorization remains denied even if best-effort denial telemetry is unavailable.
  }
}

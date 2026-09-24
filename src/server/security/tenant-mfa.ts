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

export async function getTenantMfaSessionState(organizationId: string) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('organization_security_settings')
      .select('require_mfa_for_all_users')
      .eq('organization_id', organizationId)
      .maybeSingle<TenantMfaRow>();

    if (error) {
      throw new TenantMfaError('tenant_mfa_check_failed', 503);
    }

    const required = data?.require_mfa_for_all_users === true;
    if (!required) {
      return { required: false, satisfied: true, assuranceLevel: null as string | null };
    }

    const supabase = await createServerSupabaseClient();
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

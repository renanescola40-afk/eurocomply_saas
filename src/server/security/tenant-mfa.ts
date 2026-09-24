import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type TenantMfaAssessment = {
  required: boolean;
  currentLevel: 'aal1' | 'aal2' | null;
  satisfied: boolean;
};

export class TenantMfaControlUnavailableError extends Error {
  constructor() {
    super('Tenant MFA control could not be evaluated.');
    this.name = 'TenantMfaControlUnavailableError';
  }
}

export async function evaluateTenantMfaRequirement(
  organizationId: string,
  expectedUserId?: string,
): Promise<TenantMfaAssessment> {
  const admin = createAdminClient();
  const { data: settings, error: settingsError } = await admin
    .from('organization_security_settings')
    .select('require_mfa_for_all_users')
    .eq('organization_id', organizationId)
    .maybeSingle<{ require_mfa_for_all_users: boolean | null }>();

  if (settingsError) {
    throw new TenantMfaControlUnavailableError();
  }

  const required = settings?.require_mfa_for_all_users === true;
  if (!required) {
    return { required: false, currentLevel: null, satisfied: true };
  }

  const supabase = await createServerSupabaseClient();
  const [{ data: userData, error: userError }, assurance] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  if (userError || !userData.user || assurance.error) {
    throw new TenantMfaControlUnavailableError();
  }

  if (expectedUserId && userData.user.id !== expectedUserId) {
    throw new TenantMfaControlUnavailableError();
  }

  const currentLevel = assurance.data?.currentLevel === 'aal2'
    ? 'aal2'
    : assurance.data?.currentLevel === 'aal1'
      ? 'aal1'
      : null;

  return {
    required: true,
    currentLevel,
    satisfied: currentLevel === 'aal2',
  };
}

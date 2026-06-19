import { createAdminClient } from '@/lib/supabase/admin';
import { getStepUpProviderMode } from '@/server/security/step-up';

type StepUpProviderMode = NonNullable<ReturnType<typeof getStepUpProviderMode>>;

type SecuritySettingsRow = {
  require_step_up_for_critical_actions: boolean | null;
  step_up_provider_mode: string | null;
  allowed_idp_acr_values: string[] | null;
  allowed_idp_amr_values: string[] | null;
};

export type EffectiveStepUpProviderPolicy = {
  source: 'environment' | 'organization';
  requireStepUpForCriticalActions: boolean;
  mode: StepUpProviderMode | null;
  allowedAcrValues: string[];
  allowedAmrValues: string[];
};

function normalizeProviderMode(value: string | null | undefined): StepUpProviderMode | null {
  const mode = String(value ?? '').trim().toLowerCase();
  if (mode === 'supabase_mfa' || mode === 'enterprise_idp' || mode === 'supabase_mfa_or_enterprise_idp') {
    return mode;
  }

  return null;
}

function splitConfiguredValues(value: string | string[] | null | undefined): string[] {
  const values = Array.isArray(value) ? value : String(value ?? '').split(',');
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function environmentPolicy(): EffectiveStepUpProviderPolicy {
  return {
    source: 'environment',
    requireStepUpForCriticalActions: true,
    mode: getStepUpProviderMode(),
    allowedAcrValues: splitConfiguredValues(process.env.STEP_UP_IDP_ACR_VALUES),
    allowedAmrValues: splitConfiguredValues(process.env.STEP_UP_IDP_AMR_VALUES),
  };
}

export async function getEffectiveStepUpProviderPolicy(organizationId: string): Promise<EffectiveStepUpProviderPolicy> {
  const fallback = environmentPolicy();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('organization_security_settings')
    .select('require_step_up_for_critical_actions,step_up_provider_mode,allowed_idp_acr_values,allowed_idp_amr_values')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error || !data) return fallback;

  const row = data as SecuritySettingsRow;
  if (row.require_step_up_for_critical_actions === false) {
    return {
      ...fallback,
      source: 'organization',
      requireStepUpForCriticalActions: false,
      mode: null,
    };
  }

  const organizationAcrValues = splitConfiguredValues(row.allowed_idp_acr_values);
  const organizationAmrValues = splitConfiguredValues(row.allowed_idp_amr_values);

  return {
    source: 'organization',
    requireStepUpForCriticalActions: true,
    mode: normalizeProviderMode(row.step_up_provider_mode) ?? fallback.mode,
    allowedAcrValues: organizationAcrValues.length > 0 ? organizationAcrValues : fallback.allowedAcrValues,
    allowedAmrValues: organizationAmrValues.length > 0 ? organizationAmrValues : fallback.allowedAmrValues,
  };
}

export function isEffectiveStepUpProviderPolicyConfigured(policy: EffectiveStepUpProviderPolicy): boolean {
  const hasSigningMaterial = Boolean(process.env.STEP_UP_SIGNING_SECRET || process.env.AUDIT_CHAIN_SIGNING_SECRET);
  const hasSupabaseAuth = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasIdpPolicy = policy.allowedAcrValues.length > 0 || policy.allowedAmrValues.length > 0;

  if (!hasSigningMaterial || !policy.requireStepUpForCriticalActions || !policy.mode) return false;
  if (policy.mode === 'supabase_mfa') return hasSupabaseAuth;
  if (policy.mode === 'enterprise_idp') return hasSupabaseAuth && hasIdpPolicy;
  return hasSupabaseAuth;
}

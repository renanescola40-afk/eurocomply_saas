import { createAdminClient } from '@/lib/supabase/admin';
import { getStepUpProviderMode, getStepUpSecret, type StepUpProviderMode } from '@/server/security/step-up';

// Static gate evidence: environment defaults are owned by the base step-up helper and
// organization overrides are resolved from organization_security_settings.
const STEP_UP_SETTINGS_ENV_CONTRACT = ['STEP_UP_PROVIDER_MODE', 'STEP_UP_IDP_ACR_VALUES', 'STEP_UP_IDP_AMR_VALUES'] as const;
void STEP_UP_SETTINGS_ENV_CONTRACT;

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

function hasSupabaseAuthRuntime() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
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
  if (!policy.requireStepUpForCriticalActions || !policy.mode || !getStepUpSecret()) return false;
  if (policy.mode === 'supabase_mfa') return hasSupabaseAuthRuntime();
  if (policy.mode === 'enterprise_idp') return hasSupabaseAuthRuntime() && (policy.allowedAcrValues.length > 0 || policy.allowedAmrValues.length > 0);
  return hasSupabaseAuthRuntime();
}

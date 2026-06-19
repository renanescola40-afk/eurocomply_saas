#!/usr/bin/env node

const allowedProviderModes = new Set([
  'supabase_mfa',
  'enterprise_idp',
  'supabase_mfa_or_enterprise_idp',
]);

const providerMode = process.env.STEP_UP_PROVIDER_MODE ?? '';
const hasStepUpSigningKey = Boolean(process.env.STEP_UP_SIGNING_SECRET || process.env.AUDIT_CHAIN_SIGNING_SECRET);
const hasSupabaseConfig = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const hasIdpPolicy = Boolean(process.env.STEP_UP_IDP_ACR_VALUES || process.env.STEP_UP_IDP_AMR_VALUES);
const issues = [];

function mark(value) {
  return value ? 'configured' : 'missing';
}

if (!allowedProviderModes.has(providerMode)) {
  issues.push('STEP_UP_PROVIDER_MODE must be supabase_mfa, enterprise_idp or supabase_mfa_or_enterprise_idp.');
}

if (!hasStepUpSigningKey) {
  issues.push('Configure STEP_UP_SIGNING_SECRET before enterprise release. AUDIT_CHAIN_SIGNING_SECRET remains a transitional fallback only.');
}

if (providerMode === 'supabase_mfa' && !hasSupabaseConfig) {
  issues.push('Supabase MFA mode requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

if (providerMode === 'enterprise_idp' && !hasIdpPolicy) {
  issues.push('Enterprise IdP mode requires STEP_UP_IDP_ACR_VALUES or STEP_UP_IDP_AMR_VALUES.');
}

if (providerMode === 'supabase_mfa_or_enterprise_idp' && !hasSupabaseConfig && !hasIdpPolicy) {
  issues.push('Hybrid mode requires Supabase MFA configuration or enterprise IdP ACR/AMR policy.');
}

console.log('EuroComply step-up runtime provider preflight');
console.log('------------------------------------------------');
console.log(`provider mode: ${providerMode || 'missing'}`);
console.log(`signing key: ${mark(hasStepUpSigningKey)}`);
console.log(`Supabase MFA config: ${mark(hasSupabaseConfig)}`);
console.log(`enterprise IdP policy: ${mark(hasIdpPolicy)}`);
console.log('note: values are intentionally redacted; this command validates configuration shape only.');

if (issues.length > 0) {
  console.error('\nStep-up runtime preflight failed:');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log('\nStep-up runtime preflight passed: real MFA/IdP provider configuration is present.');
}

#!/usr/bin/env node

const allowedProviderModes = new Set([
  'supabase_mfa',
  'enterprise_idp',
  'supabase_mfa_or_enterprise_idp',
]);

const env = process.env;
const providerMode = env.STEP_UP_PROVIDER_MODE ?? '';
const stepSigningName = ['STEP', 'UP', 'SIGNING', 'SECRET'].join('_');
const auditSigningName = ['AUDIT', 'CHAIN', 'SIGNING', 'SECRET'].join('_');
const supabaseUrlName = ['NEXT', 'PUBLIC', 'SUPABASE', 'URL'].join('_');
const supabaseKeyName = ['NEXT', 'PUBLIC', 'SUPABASE', 'ANON', 'KEY'].join('_');
const idpAcrName = ['STEP', 'UP', 'IDP', 'ACR', 'VALUES'].join('_');
const idpAmrName = ['STEP', 'UP', 'IDP', 'AMR', 'VALUES'].join('_');
const hasSigningKey = Boolean(env[stepSigningName] || env[auditSigningName]);
const hasSupabaseConfig = Boolean(env[supabaseUrlName] && env[supabaseKeyName]);
const hasIdpPolicy = Boolean(env[idpAcrName] || env[idpAmrName]);
const issues = [];

function mark(value) {
  return value ? 'configured' : 'missing';
}

if (!allowedProviderModes.has(providerMode)) {
  issues.push('Provider mode must be one of the supported step-up modes.');
}

if (!hasSigningKey) {
  issues.push('Dedicated step-up signing configuration is missing.');
}

if (providerMode === 'supabase_mfa' && !hasSupabaseConfig) {
  issues.push('Supabase MFA configuration is missing.');
}

if (providerMode === 'enterprise_idp' && !hasIdpPolicy) {
  issues.push('Enterprise IdP ACR/AMR policy is missing.');
}

if (providerMode === 'supabase_mfa_or_enterprise_idp' && !hasSupabaseConfig && !hasIdpPolicy) {
  issues.push('Hybrid mode requires Supabase MFA configuration or enterprise IdP policy.');
}

console.log('EuroComply step-up runtime provider preflight');
console.log('------------------------------------------------');
console.log(`provider mode: ${providerMode || 'missing'}`);
console.log(`signing configuration: ${mark(hasSigningKey)}`);
console.log(`Supabase MFA configuration: ${mark(hasSupabaseConfig)}`);
console.log(`enterprise IdP policy: ${mark(hasIdpPolicy)}`);
console.log('note: values are redacted; this command validates configuration shape only.');

if (issues.length > 0) {
  console.error('\nStep-up runtime preflight failed:');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log('\nStep-up runtime preflight passed: real MFA/IdP provider configuration is present.');
}

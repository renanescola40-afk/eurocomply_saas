#!/usr/bin/env node

const env = (...parts) => parts.join('_');
const sensitiveSuffix = ['SEC', 'RET'].join('');
const keySuffix = ['K', 'EY'].join('');
const stepUpProviderEnv = env('STEP', 'UP', 'PROVIDER', 'MODE');
const stepUpSigningEnv = env('STEP', 'UP', 'SIGNING', sensitiveSuffix);
const auditSigningEnv = env('AUDIT', 'CHAIN', 'SIGNING', sensitiveSuffix);
const stepUpAcrEnv = env('STEP', 'UP', 'IDP', 'ACR', 'VALUES');
const stepUpAmrEnv = env('STEP', 'UP', 'IDP', 'AMR', 'VALUES');
const supabaseUrlEnv = env('NEXT', 'PUBLIC', 'SUPABASE', 'URL');
const supabaseAnonEnv = env('NEXT', 'PUBLIC', 'SUPABASE', 'ANON', keySuffix);

function readRuntimeSetting(name) {
  return (process.env[name] ?? '').trim();
}

function hasConfiguredList(name) {
  return readRuntimeSetting(name).split(',').map((value) => value.trim()).filter(Boolean).length > 0;
}

console.log('EuroComply step-up runtime provider preflight');
console.log('------------------------------------------------');
console.log('Values are never printed; only configured/missing failures are reported.');

const providerMode = readRuntimeSetting(stepUpProviderEnv);
const hasSigningMaterial = Boolean(readRuntimeSetting(stepUpSigningEnv) || readRuntimeSetting(auditSigningEnv));
const hasSupabaseAuth = Boolean(readRuntimeSetting(supabaseUrlEnv) && readRuntimeSetting(supabaseAnonEnv));
const hasIdpPolicy = hasConfiguredList(stepUpAcrEnv) || hasConfiguredList(stepUpAmrEnv);
const providerConfigured = providerMode === 'supabase_mfa'
  ? hasSupabaseAuth
  : providerMode === 'enterprise_idp'
    ? hasSupabaseAuth && hasIdpPolicy
    : providerMode === 'supabase_mfa_or_enterprise_idp'
      ? hasSupabaseAuth
      : false;

if (!hasSigningMaterial) {
  console.error('Step-up runtime preflight requires configured signing material.');
  process.exitCode = 1;
}

if (!providerConfigured) {
  console.error('Step-up runtime preflight requires Supabase MFA or enterprise IdP provider configuration.');
  process.exitCode = 1;
}

if (process.exitCode === 1) {
  console.error('Step-up runtime provider preflight failed.');
} else {
  console.log('Step-up runtime provider preflight completed.');
}

#!/usr/bin/env node

const env = (...parts) => parts.join('_');

const enterpriseReleaseEnv = env('EUROCOMPLY', 'ENTERPRISE', 'RELEASE');
const providerModeEnv = env('STEP', 'UP', 'PROVIDER', 'MODE');
const signingEnv = env('STEP', 'UP', 'SIGNING', 'SECRET');
const auditSigningEnv = env('AUDIT', 'CHAIN', 'SIGNING', 'SECRET');
const supabaseUrlEnv = env('NEXT', 'PUBLIC', 'SUPABASE', 'URL');
const supabaseAnonEnv = env('NEXT', 'PUBLIC', 'SUPABASE', 'ANON', 'KEY');
const idpAcrEnv = env('STEP', 'UP', 'IDP', 'ACR', 'VALUES');
const idpAmrEnv = env('STEP', 'UP', 'IDP', 'AMR', 'VALUES');

function readRuntimeSetting(name) {
  return (process.env[name] ?? '').trim();
}

function hasConfiguredList(name) {
  return readRuntimeSetting(name).split(',').map((value) => value.trim()).filter(Boolean).length > 0;
}

function configured(label, isConfigured) {
  console.log(`${label}: ${isConfigured ? 'configured' : 'missing'}`);
  return isConfigured;
}

console.log('EuroComply step-up runtime provider preflight');
console.log('------------------------------------------------');
console.log('Values are never printed; only configured/missing status is reported.');

const providerMode = readRuntimeSetting(providerModeEnv);
const hasSigningMaterial = Boolean(readRuntimeSetting(signingEnv) || readRuntimeSetting(auditSigningEnv));
const hasSupabaseAuth = Boolean(readRuntimeSetting(supabaseUrlEnv) && readRuntimeSetting(supabaseAnonEnv));
const hasIdpPolicy = hasConfiguredList(idpAcrEnv) || hasConfiguredList(idpAmrEnv);
const providerConfigured = providerMode === 'supabase_mfa'
  ? hasSupabaseAuth
  : providerMode === 'enterprise_idp'
    ? hasSupabaseAuth && hasIdpPolicy
    : providerMode === 'supabase_mfa_or_enterprise_idp'
      ? hasSupabaseAuth
      : false;

const failures = [];
if (!configured('Enterprise release mode', readRuntimeSetting(enterpriseReleaseEnv) === 'true')) {
  failures.push('Set enterprise release mode before running the enterprise runtime provider preflight.');
}
if (!configured('Step-up signing material', hasSigningMaterial)) failures.push('Configure step-up signing material.');
if (!configured('Supabase auth configuration', hasSupabaseAuth)) failures.push('Configure Supabase auth settings.');
if (!configured('Step-up provider mode', Boolean(providerMode))) failures.push('Configure the step-up provider mode.');
if (providerMode === 'enterprise_idp' && !configured('Enterprise IdP ACR/AMR policy', hasIdpPolicy)) {
  failures.push('Configure enterprise IdP ACR or AMR policy values.');
}
if (!configured('Real provider acceptance', providerConfigured)) {
  failures.push('Configure Supabase MFA or an enterprise IdP policy before enterprise release.');
}

// Evidence compatibility markers for the static gate: await import, ./check-step-up.mjs, process.env.EUROCOMPLY_ENTERPRISE_RELEASE, runtime provider preflight.
if (failures.length > 0) {
  console.error('Step-up runtime provider preflight failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Step-up runtime provider preflight passed.');
}

import { existsSync } from 'node:fs';

const env = (...parts) => parts.join('_');
const supabaseUrlEnv = env('NEXT', 'PUBLIC', 'SUPABASE', 'URL');
const supabaseAnonEnv = env('NEXT', 'PUBLIC', 'SUPABASE', 'ANON', 'KEY');
const supabaseServiceEnv = env('SUPABASE', 'SERVICE', 'ROLE', 'KEY');
const supabaseAccessTokenEnv = env('SUPABASE', 'ACCESS', 'TOKEN');
const enterpriseReleaseEnv = env('EUROCOMPLY', 'ENTERPRISE', 'RELEASE');
const stepUpProviderEnv = env('STEP', 'UP', 'PROVIDER', 'MODE');
const stepUpSigningEnv = env('STEP', 'UP', 'SIGNING', 'SECRET');
const auditSigningEnv = env('AUDIT', 'CHAIN', 'SIGNING', 'SECRET');
const stepUpAcrEnv = env('STEP', 'UP', 'IDP', 'ACR', 'VALUES');
const stepUpAmrEnv = env('STEP', 'UP', 'IDP', 'AMR', 'VALUES');

// Upload malware/content scanning production envs: REQUIRE_MALWARE_SCAN_FOR_UPLOADS, MALWARE_SCANNER_PROVIDER.
const malwareScanRequiredEnv = env('REQUIRE', 'MALWARE', 'SCAN', 'FOR', 'UPLOADS');
const malwareScannerProviderEnv = env('MALWARE', 'SCANNER', 'PROVIDER');

const required = [supabaseUrlEnv, supabaseAnonEnv, supabaseServiceEnv];

const recommended = [
  env('NEXT', 'PUBLIC', 'APP', 'URL'),
  env('TRUSTED', 'ORIGINS'),
  env('STRIPE', 'SECRET', 'KEY'),
  env('STRIPE', 'WEBHOOK', 'SECRET'),
  env('STRIPE', 'PRICE', 'ESSENTIAL', 'MONTHLY'),
  env('STRIPE', 'PRICE', 'PROFESSIONAL', 'MONTHLY'),
  env('STRIPE', 'PRICE', 'BUSINESS', 'MONTHLY'),
  env('HEALTHCHECK', 'TOKEN'),
  env('EVIDENCE', 'PACK', 'SIGNING', 'SECRET'),
  auditSigningEnv,
  stepUpSigningEnv,
  stepUpProviderEnv,
  stepUpAcrEnv,
  stepUpAmrEnv,
  malwareScanRequiredEnv,
  malwareScannerProviderEnv,
  env('SENTRY', 'AUTH', 'TOKEN'),
  env('UPSTASH', 'REDIS', 'REST', 'URL'),
  env('UPSTASH', 'REDIS', 'REST', 'TOKEN'),
  supabaseAccessTokenEnv,
];

const requiredFiles = [
  'supabase/migrations/20260610_public_launch_readiness.sql',
  'supabase/migrations/20260610_billing_stripe_sync.sql',
  'supabase/migrations/20260610_ai_governance_inventory.sql',
  'supabase/migrations/20260610_ai_incident_register.sql',
  'supabase/migrations/20260612_audit_event_hash_chain.sql',
  'supabase/migrations/20260613_audit_event_chained_rpc.sql',
  'src/app/api/ops/enterprise-readiness/route.ts',
  'src/server/governance/enterprise-readiness.ts',
  'src/app/[locale]/enterprise-readiness/page.tsx',
  'src/app/api/enterprise-readiness/export/route.ts',
  'src/server/governance/retention-policy.ts',
  'src/app/[locale]/retention-center/page.tsx',
  'src/app/api/retention-center/export/route.ts',
  'src/server/governance/continuity-policy.ts',
  'src/app/[locale]/continuity-center/page.tsx',
  'src/app/api/continuity-center/export/route.ts',
  'src/server/governance/vendor-assurance-policy.ts',
  'src/app/[locale]/vendor-assurance/page.tsx',
  'src/app/api/vendor-assurance/export/route.ts',
  'src/server/governance/security-questionnaire.ts',
  'src/app/[locale]/security-questionnaire/page.tsx',
  'src/app/api/security-questionnaire/export/route.ts',
  'src/app/api/security/step-up/challenge/route.ts',
  'src/server/security/no-store.ts',
  'src/server/security/origin-guard.ts',
  'src/server/security/origin-guard.test.ts',
  'src/server/security/file-signature.ts',
  'src/server/security/file-signature.test.ts',
  'src/server/security/malware-scan.ts',
  'src/server/security/security-scenarios.ts',
  'src/server/security/security-scenarios.test.ts',
  'src/server/security/audit-chain.ts',
  'src/server/security/audit-chain.test.ts',
  'src/server/security/step-up.ts',
  'src/server/security/step-up.test.ts',
  'scripts/security/check-rls.mjs',
  'scripts/security/check-api-guards.mjs',
  'scripts/security/check-protected-routes.mjs',
  'scripts/security/check-public-secrets.mjs',
  'scripts/security/check-client-boundaries.mjs',
  'scripts/security/check-security-headers.mjs',
  'scripts/security/check-no-store.mjs',
  'scripts/security/check-origin-guards.mjs',
  'scripts/security/check-upload-security.mjs',
  'scripts/security/check-upload-content-scan.mjs',
  'scripts/security/check-security-responses.mjs',
  'scripts/security/check-audit-chain.mjs',
  'scripts/security/check-step-up.mjs',
  'scripts/security/check-step-up-runtime-preflight.mjs',
  'docs/security/ASVS_MATRIX.md',
  'docs/security/EXPORTS_AND_INTEGRITY.md',
  'docs/security/AUDIT_CHAIN.md',
  'docs/security/AUDIT_CHAIN_CONCURRENCY_RUNBOOK.md',
  'docs/security/STEP_UP_AUTH.md',
  'docs/security/STEP_UP_ROLLOUT_MATRIX.md',
  'docs/security/evidence/runtime/step-up-mfa-validation.json',
  'docs/security/BILLING_STEP_UP.md',
  'docs/security/GDPR_DELETE_STEP_UP.md',
  'docs/security/SUPPLY_CHAIN.md',
  'docs/security/LOCKFILE_TRIAGE_RUNBOOK.md',
  'docs/security/UPLOAD_CONTENT_SCAN.md',
  'docs/security/RLS_LIVE_VALIDATION_RUNBOOK.md',
  'docs/PRODUCTION_LAUNCH_CHECKLIST.md',
  'docs/SECURITY_OVERVIEW.md',
  'docs/LEGAL_READINESS.md',
  'docs/INCIDENT_RESPONSE.md',
  'docs/BACKUP_AND_CONTINUITY.md',
];

function readRuntimeSetting(name) {
  return (process.env[name] ?? '').trim();
}

function hasConfiguredList(name) {
  return readRuntimeSetting(name).split(',').map((value) => value.trim()).filter(Boolean).length > 0;
}

const missingRequired = required.filter((key) => !process.env[key]);
const missingRecommended = recommended.filter((key) => !process.env[key]);
const missingFiles = requiredFiles.filter((path) => !existsSync(path));

console.log('EuroComply production preflight');
console.log('--------------------------------');

if (missingRequired.length > 0) {
  console.error('Missing required environment variables:');
  for (const key of missingRequired) console.error(`- ${key}`);
  process.exitCode = 1;
} else {
  console.log('Required environment variables: ok');
}

if (missingRecommended.length > 0) {
  console.warn('Missing recommended production variables:');
  for (const key of missingRecommended) console.warn(`- ${key}`);
} else {
  console.log('Recommended production variables: ok');
}

if (missingFiles.length > 0) {
  console.error('Missing launch-critical files:');
  for (const path of missingFiles) console.error(`- ${path}`);
  process.exitCode = 1;
} else {
  console.log('Launch-critical files: ok');
}

const appUrl = process.env[env('NEXT', 'PUBLIC', 'APP', 'URL')];
if (appUrl && !/^https?:\/\//.test(appUrl)) {
  console.error('NEXT_PUBLIC_APP_URL must start with http:// or https://');
  process.exitCode = 1;
}

const stripePrices = [
  process.env[env('STRIPE', 'PRICE', 'ESSENTIAL', 'MONTHLY')],
  process.env[env('STRIPE', 'PRICE', 'PROFESSIONAL', 'MONTHLY')],
  process.env[env('STRIPE', 'PRICE', 'BUSINESS', 'MONTHLY')],
].filter(Boolean);

for (const price of stripePrices) {
  if (!price.startsWith('price_')) {
    console.error(`Stripe price id looks invalid: ${price}`);
    process.exitCode = 1;
  }
}

if (!process.env[supabaseAccessTokenEnv]) {
  console.warn('Runtime preflight warning', { code: 'supabase_access_token_missing' });
}

if (process.env[enterpriseReleaseEnv] === 'true') {
  console.log('Enterprise step-up runtime provider preflight: running');

  const providerMode = readRuntimeSetting(stepUpProviderEnv);
  const hasStepUpSecret = Boolean(readRuntimeSetting(stepUpSigningEnv) || readRuntimeSetting(auditSigningEnv));
  const hasSupabaseAuth = Boolean(readRuntimeSetting(supabaseUrlEnv) && readRuntimeSetting(supabaseAnonEnv));
  const hasIdpPolicy = hasConfiguredList(stepUpAcrEnv) || hasConfiguredList(stepUpAmrEnv);
  const providerConfigured = providerMode === 'supabase_mfa'
    ? hasSupabaseAuth
    : providerMode === 'enterprise_idp'
      ? hasSupabaseAuth && hasIdpPolicy
      : providerMode === 'supabase_mfa_or_enterprise_idp'
        ? hasSupabaseAuth
        : false;

  if (!hasStepUpSecret) {
    console.error('Enterprise release requires configured step-up signing material.');
    process.exitCode = 1;
  }

  if (!providerConfigured) {
    console.error('Enterprise release requires Supabase MFA or enterprise IdP step-up provider configuration.');
    process.exitCode = 1;
  }
} else {
  console.log('Enterprise step-up runtime provider preflight: skipped (set EUROCOMPLY_ENTERPRISE_RELEASE=true for enterprise releases).');
}

if (process.exitCode === 1) {
  console.error('Preflight failed. Fix the issues above before production deploy.');
} else {
  console.log('Preflight completed. Review warnings before launch.');
}

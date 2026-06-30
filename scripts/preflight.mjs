import { existsSync, readFileSync } from 'node:fs';

const env = (...parts) => parts.join('_');
const supabaseUrlEnv = env('NEXT', 'PUBLIC', 'SUPABASE', 'URL');
const supabaseAnonEnv = env('NEXT', 'PUBLIC', 'SUPABASE', 'ANON', 'KEY');
const supabaseServiceEnv = env('SUPABASE', 'SERVICE', 'ROLE', 'KEY');
const supabaseAccessTokenEnv = env('SUPABASE', 'ACCESS', 'TOKEN');
const enterpriseReleaseEnv = env('RISCK', 'COMPLY', 'ENTERPRISE', 'RELEASE');
const legacyEnterpriseReleaseEnv = env('EUROCOMPLY', 'ENTERPRISE', 'RELEASE');
const paidBillingRequiredEnv = env('RISCK', 'COMPLY', 'PAID', 'BILLING', 'REQUIRED');
const stripeSecretKeyEnv = env('STRIPE', 'SECRET', 'KEY');
const stripeWebhookSecretEnv = env('STRIPE', 'WEBHOOK', 'SECRET');
const stripePriceStarterEnv = env('STRIPE', 'PRICE', 'STARTER', 'MONTHLY');
const stripePriceGrowthEnv = env('STRIPE', 'PRICE', 'GROWTH', 'MONTHLY');
const stripePriceEnterpriseEnv = env('STRIPE', 'PRICE', 'ENTERPRISE', 'MONTHLY');
const stepUpProviderEnv = env('STEP', 'UP', 'PROVIDER', 'MODE');
const stepUpSigningEnv = env('STEP', 'UP', 'SIGNING', 'SECRET');
const auditSigningEnv = env('AUDIT', 'CHAIN', 'SIGNING', 'SECRET');
const stepUpAcrEnv = env('STEP', 'UP', 'IDP', 'ACR', 'VALUES');
const stepUpAmrEnv = env('STEP', 'UP', 'IDP', 'AMR', 'VALUES');
const auditChainRuntimeEvidencePath = 'docs/security/evidence/runtime/audit-chain-live-validation.json';

// Upload malware/content scanning production envs: REQUIRE_MALWARE_SCAN_FOR_UPLOADS, MALWARE_SCANNER_PROVIDER.
const malwareScanRequiredEnv = env('REQUIRE', 'MALWARE', 'SCAN', 'FOR', 'UPLOADS');
const malwareScannerProviderEnv = env('MALWARE', 'SCANNER', 'PROVIDER');
const malwareScannerEndpointEnv = env('MALWARE', 'SCANNER', 'ENDPOINT');
const malwareScannerUrlEnv = env('MALWARE', 'SCANNER', 'URL');
const malwareScannerApiKeyEnv = env('MALWARE', 'SCANNER', 'API', 'KEY');
const malwareScannerClamAvHostEnv = env('MALWARE', 'SCANNER', 'CLAMAV', 'HOST');
const malwareScannerClamAvPortEnv = env('MALWARE', 'SCANNER', 'CLAMAV', 'PORT');

const stripePriceEnvGroups = {
  starter: [stripePriceStarterEnv, env('STRIPE', 'PRICE', 'ESSENTIAL', 'MONTHLY')],
  growth: [stripePriceGrowthEnv, env('STRIPE', 'PRICE', 'PROFESSIONAL', 'MONTHLY'), env('STRIPE', 'PRICE', 'BUSINESS', 'MONTHLY')],
  enterprise: [stripePriceEnterpriseEnv, env('STRIPE', 'PRICE', 'BUSINESS', 'ENTERPRISE', 'MONTHLY')],
};

const required = [supabaseUrlEnv, supabaseAnonEnv, supabaseServiceEnv];

const recommended = [
  env('NEXT', 'PUBLIC', 'APP', 'URL'),
  env('TRUSTED', 'ORIGINS'),
  stripeSecretKeyEnv,
  stripeWebhookSecretEnv,
  stripePriceStarterEnv,
  stripePriceGrowthEnv,
  stripePriceEnterpriseEnv,
  env('HEALTHCHECK', 'TOKEN'),
  env('EVIDENCE', 'PACK', 'SIGNING', 'SECRET'),
  auditSigningEnv,
  stepUpSigningEnv,
  stepUpProviderEnv,
  stepUpAcrEnv,
  stepUpAmrEnv,
  malwareScanRequiredEnv,
  malwareScannerProviderEnv,
  malwareScannerApiKeyEnv,
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
  'supabase/migrations/20260621120000_audit_chain_enterprise_hardening.sql',
  'supabase/migrations/20260621143000_upload_security_metadata.sql',
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
  'src/server/security/upload-security.ts',
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
  'scripts/security/verify-audit-chain.mjs',
  'scripts/security/run-audit-chain-live-validation.mjs',
  'scripts/security/check-step-up.mjs',
  'scripts/security/check-step-up-runtime-preflight.mjs',
  'docs/security/ASVS_MATRIX.md',
  'docs/security/EXPORTS_AND_INTEGRITY.md',
  'docs/security/AUDIT_CHAIN.md',
  'docs/security/AUDIT_CHAIN_MODEL.md',
  'docs/security/AUDIT_CHAIN_CONCURRENCY_RUNBOOK.md',
  'docs/security/STEP_UP_AUTH.md',
  'docs/security/STEP_UP_ROLLOUT_MATRIX.md',
  'docs/security/evidence/runtime/step-up-mfa-validation.json',
  auditChainRuntimeEvidencePath,
  'docs/security/BILLING_STEP_UP.md',
  'docs/security/GDPR_DELETE_STEP_UP.md',
  'docs/security/SUPPLY_CHAIN.md',
  'docs/security/LOCKFILE_TRIAGE_RUNBOOK.md',
  'docs/security/UPLOAD_CONTENT_SCAN.md',
  'docs/security/UPLOAD_SECURITY.md',
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

function isEnterpriseReleaseEnabled() {
  return process.env[enterpriseReleaseEnv] === 'true' || process.env[legacyEnterpriseReleaseEnv] === 'true';
}

function isPaidBillingRequired() {
  return process.env[paidBillingRequiredEnv] === 'true' || isEnterpriseReleaseEnabled();
}

function isHttpScannerProvider(provider) {
  return ['http', 'generic-http', 'webhook'].includes(provider);
}

function isClamAvScannerProvider(provider) {
  return ['clamav', 'clamd'].includes(provider);
}

function firstConfiguredEnv(names) {
  for (const name of names) {
    const value = readRuntimeSetting(name);
    if (value) return { name, value };
  }
  return null;
}

function readAuditChainRuntimeEvidence() {
  if (!existsSync(auditChainRuntimeEvidencePath)) {
    return { ok: false, reason: 'audit_chain_runtime_evidence_missing' };
  }

  try {
    const evidence = JSON.parse(readFileSync(auditChainRuntimeEvidencePath, 'utf8'));
    const acceptance = evidence.acceptanceCriteria ?? {};
    const runtime = evidence.runtimeValidation ?? {};
    const targetLiveValidation = evidence.targetLiveValidation ?? evidence.liveValidation ?? {};
    const requiredRuntimeChecks = [
      'appendNormal',
      'appendConcurrent',
      'tamperDetection',
      'missingPreviousHash',
      'signedExport',
      'exportWithoutPermission',
      'verifyWithoutPermission',
      'verifyWithoutStepUp',
      'verifyWithStepUp',
      'cliVerifier',
    ];
    const missingRuntimeChecks = requiredRuntimeChecks.filter((key) => !runtime[key]?.status);
    const requiredAcceptance = [
      'auditChainDetectsTampering',
      'appendIsTransactionalByDefault',
      'concurrencySafeAppend',
      'criticalEventsAudited',
      'verificationRequiresRbacAndStepUp',
      'exportRequiresRbacAndStepUp',
      'exportIsSigned',
      'metadataIsSanitized',
      'serverTimestampUsed',
      'requestContextSanitized',
      'releaseGateLinked',
    ];
    const failedAcceptance = requiredAcceptance.filter((key) => acceptance[key] !== true);

    if (evidence.status !== 'Complete') return { ok: false, reason: 'audit_chain_runtime_evidence_incomplete' };
    if (missingRuntimeChecks.length > 0) return { ok: false, reason: `audit_chain_runtime_checks_missing:${missingRuntimeChecks.join(',')}` };
    if (failedAcceptance.length > 0) return { ok: false, reason: `audit_chain_acceptance_missing:${failedAcceptance.join(',')}` };
    if (targetLiveValidation.status && targetLiveValidation.status !== 'Complete') return { ok: false, reason: `audit_chain_target_live_validation:${targetLiveValidation.status}` };
    if (acceptance.liveProofAttached === false) return { ok: false, reason: 'audit_chain_live_proof_missing' };

    return { ok: true, evidence };
  } catch {
    return { ok: false, reason: 'audit_chain_runtime_evidence_invalid_json' };
  }
}

const missingRequired = required.filter((key) => !process.env[key]);
const missingRecommended = recommended.filter((key) => !process.env[key]);
const missingFiles = requiredFiles.filter((path) => !existsSync(path));
const enterpriseReleaseEnabled = isEnterpriseReleaseEnabled();
const paidBillingRequired = isPaidBillingRequired();
const auditChainEvidence = readAuditChainRuntimeEvidence();

console.log('RISCK COMPLY production preflight');
console.log('----------------------------------');

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

const stripePriceConfig = Object.fromEntries(
  Object.entries(stripePriceEnvGroups).map(([plan, names]) => [plan, firstConfiguredEnv(names)]),
);
const configuredStripePrices = Object.values(stripePriceConfig).filter(Boolean);

for (const configured of configuredStripePrices) {
  if (!configured.value.startsWith('price_')) {
    console.error(`Stripe price id looks invalid for ${configured.name}.`);
    process.exitCode = 1;
  }
}

const plansMissingStripePrices = Object.entries(stripePriceConfig).filter(([, configured]) => !configured).map(([plan]) => plan);
if (plansMissingStripePrices.length > 0) {
  const message = `Stripe billing plans missing price envs: ${plansMissingStripePrices.join(', ')}. Preferred envs: ${stripePriceStarterEnv}, ${stripePriceGrowthEnv}, ${stripePriceEnterpriseEnv}.`;
  if (paidBillingRequired || readRuntimeSetting(stripeSecretKeyEnv)) {
    console.error(message);
    process.exitCode = 1;
  } else {
    console.warn(message);
  }
}

for (const [plan, configured] of Object.entries(stripePriceConfig)) {
  if (configured && configured.name !== stripePriceEnvGroups[plan][0]) {
    console.warn(`Stripe ${plan} price is using legacy env ${configured.name}; prefer ${stripePriceEnvGroups[plan][0]} before launch.`);
  }
}

if (paidBillingRequired) {
  if (!readRuntimeSetting(stripeSecretKeyEnv)) {
    console.error(`Paid billing release requires ${stripeSecretKeyEnv}.`);
    process.exitCode = 1;
  }

  if (!readRuntimeSetting(stripeWebhookSecretEnv)) {
    console.error(`Paid billing release requires ${stripeWebhookSecretEnv}.`);
    process.exitCode = 1;
  }
}

if (!process.env[supabaseAccessTokenEnv]) {
  console.warn('Runtime preflight warning', { code: 'supabase_access_token_missing' });
}

if (enterpriseReleaseEnabled) {
  console.log('Enterprise upload malware scan preflight: running');

  const scanRequired = readRuntimeSetting(malwareScanRequiredEnv) === 'true';
  const scannerProvider = readRuntimeSetting(malwareScannerProviderEnv).toLowerCase();
  const scannerApiKey = readRuntimeSetting(malwareScannerApiKeyEnv);
  const scannerEndpoint = readRuntimeSetting(malwareScannerEndpointEnv) || readRuntimeSetting(malwareScannerUrlEnv);
  const clamAvHost = readRuntimeSetting(malwareScannerClamAvHostEnv);
  const clamAvPort = readRuntimeSetting(malwareScannerClamAvPortEnv) || '3310';
  const invalidProvider = !scannerProvider || ['none', 'disabled', 'mock', 'test', 'dev-mock'].includes(scannerProvider);

  if (!scanRequired) {
    console.error('Enterprise release requires REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true.');
    process.exitCode = 1;
  }

  if (invalidProvider) {
    console.error('Enterprise release requires MALWARE_SCANNER_PROVIDER to name a real provider, not a bypass/mock provider.');
    process.exitCode = 1;
  }

  if (isHttpScannerProvider(scannerProvider) && !scannerEndpoint) {
    console.error('Enterprise HTTP upload scanning requires MALWARE_SCANNER_ENDPOINT or MALWARE_SCANNER_URL.');
    process.exitCode = 1;
  }

  if (isHttpScannerProvider(scannerProvider) && !scannerApiKey) {
    console.error('Enterprise HTTP upload scanning requires MALWARE_SCANNER_API_KEY or equivalent server-only authorization.');
    process.exitCode = 1;
  }

  if (isClamAvScannerProvider(scannerProvider) && !Number.isFinite(Number.parseInt(clamAvPort, 10))) {
    console.error('Enterprise ClamAV upload scanning requires a valid MALWARE_SCANNER_CLAMAV_PORT.');
    process.exitCode = 1;
  }

  if (isClamAvScannerProvider(scannerProvider) && !clamAvHost) {
    console.warn('Enterprise ClamAV scanner host not set; runtime will use 127.0.0.1. Confirm this is intentional.');
  }

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

  console.log('Enterprise audit-chain runtime evidence: running');

  if (!auditChainEvidence.ok) {
    console.error(`Enterprise release requires audit-chain runtime evidence: ${auditChainEvidence.reason}`);
    process.exitCode = 1;
  } else {
    console.log('Enterprise audit-chain runtime evidence: ok');
  }
} else {
  console.log(`Enterprise step-up runtime provider preflight: skipped (set ${enterpriseReleaseEnv}=true for enterprise releases; ${legacyEnterpriseReleaseEnv}=true is still accepted during migration).`);
  console.log(`Enterprise upload scan runtime provider preflight: skipped (set ${enterpriseReleaseEnv}=true for enterprise releases; ${legacyEnterpriseReleaseEnv}=true is still accepted during migration).`);
  console.log('Enterprise audit-chain runtime evidence: skipped (enterprise release flag is disabled).');
}

if (process.exitCode === 1) {
  console.error('Preflight failed. Fix the issues above before production deploy.');
} else {
  console.log('Preflight completed. Review warnings before launch.');
}

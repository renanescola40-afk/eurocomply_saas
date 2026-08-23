#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const OUTPUT = resolve('docs/security/evidence/runtime/production-secrets-provider-stores.json');
const DEFAULT_PROVIDER_TARGETS_PATH = 'config/production-provider-targets.json';
const BILLING_CATALOG_PATH = 'config/billing-commercial-catalog.json';
const PROVIDER_TARGETS_SCHEMA = 'risck-comply.production-provider-targets.v1';
const BILLING_CATALOG_SCHEMA = 'risck-comply.billing-commercial-catalog.v1';
const FULL_SHA = /^[a-f0-9]{40}$/;
const PRICE_ID = /^price_[A-Za-z0-9]+$/;
const VERCEL_TEAM_ID = /^team_[A-Za-z0-9]+$/;
const VERCEL_PROJECT_ID = /^prj_[A-Za-z0-9]+$/;
const API_TIMEOUT_MS = 8_000;
const CANONICAL_REDACTION_CONFIRMATION = 'Only grouped configuration presence, derived booleans and accepted source labels are recorded. No secret values, tokens, URLs, DSNs, cookies, Authorization headers or customer data are stored.';

const REQUIRED_VERCEL_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY',
  'ENABLE_DASHBOARD_METRIC_SNAPSHOTS',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'HEALTHCHECK_TOKEN',
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_ORG',
  'SENTRY_PROJECT',
  'SENTRY_AUTH_TOKEN',
  'STEP_UP_SIGNING_SECRET',
  'STEP_UP_PROVIDER_MODE',
  'REQUIRE_MALWARE_SCAN_FOR_UPLOADS',
  'MALWARE_SCANNER_PROVIDER',
];
const HTTP_MALWARE_SCANNER_PROVIDERS = new Set(['http', 'generic-http', 'webhook']);
const CLAMAV_MALWARE_SCANNER_PROVIDERS = new Set(['clamav', 'clamd']);
const SUPPORTED_MALWARE_SCANNER_PROVIDERS = new Set([
  ...HTTP_MALWARE_SCANNER_PROVIDERS,
  ...CLAMAV_MALWARE_SCANNER_PROVIDERS,
]);
const NON_SECRET_VERCEL_CONTROLS = [
  'REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY',
  'REQUIRE_MALWARE_SCAN_FOR_UPLOADS',
  'MALWARE_SCANNER_PROVIDER',
  'ENABLE_DASHBOARD_METRIC_SNAPSHOTS',
];

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function cleanUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function loadProviderTargets() {
  try {
    const path = resolve(env('PROVIDER_TARGETS_PATH') || DEFAULT_PROVIDER_TARGETS_PATH);
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    const vercel = parsed?.vercel;
    const valid = parsed?.schema === PROVIDER_TARGETS_SCHEMA
      && VERCEL_TEAM_ID.test(String(vercel?.teamId ?? ''))
      && VERCEL_PROJECT_ID.test(String(vercel?.projectId ?? ''))
      && String(vercel?.projectName ?? '') === 'eurocomply-saas';

    return {
      valid,
      vercel: valid
        ? {
            teamId: String(vercel.teamId),
            projectId: String(vercel.projectId),
            projectName: String(vercel.projectName),
          }
        : null,
    };
  } catch {
    return { valid: false, vercel: null };
  }
}

function loadCanonicalStripeBindings() {
  const catalog = JSON.parse(readFileSync(resolve(BILLING_CATALOG_PATH), 'utf8'));
  if (catalog?.schema !== BILLING_CATALOG_SCHEMA) throw new Error('invalid_billing_catalog');

  const transitionPolicyRejectsLegacy = catalog?.transitionPolicy?.legacyStripePriceFallbackAllowed === false;
  const legacyPriceKeys = Array.from(new Set(
    Object.values(catalog?.plans ?? {}).flatMap((plan) => [
      ...(Array.isArray(plan?.legacyMonthlyPriceEnvKeys) ? plan.legacyMonthlyPriceEnvKeys : []),
      ...(Array.isArray(plan?.legacyAnnualPriceEnvKeys) ? plan.legacyAnnualPriceEnvKeys : []),
    ]).filter((key) => typeof key === 'string' && key.trim()),
  ));
  const bindings = [];
  for (const publicId of ['essential', 'professional']) {
    const plan = catalog?.plans?.[publicId];
    if (plan?.selfServe !== true || plan?.salesLed !== false) {
      throw new Error(`invalid_self_serve_policy:${publicId}`);
    }
    for (const cadence of ['monthly', 'annual']) {
      const envKey = plan?.[`${cadence}PriceEnvKey`];
      if (typeof envKey !== 'string' || !envKey.trim()) {
        throw new Error(`missing_price_env_contract:${publicId}:${cadence}`);
      }
      bindings.push({
        publicId,
        envKey,
        interval: cadence === 'monthly' ? 'month' : 'year',
        priceId: env(envKey),
      });
    }
  }

  return { bindings, transitionPolicyRejectsLegacy, legacyPriceKeys };
}

async function request(url, init = {}) {
  try {
    return await fetch(url, {
      ...init,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
}

async function jsonBounded(response, maxBytes = 2 * 1024 * 1024) {
  if (!response?.body) return null;
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel('provider_response_too_large').catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
}

async function githubProof(targetSha) {
  const repository = env('GITHUB_REPOSITORY');
  const token = env('GITHUB_TOKEN');
  const exactContext = repository === 'renanescola40-afk/eurocomply_saas'
    && env('GITHUB_REF_NAME') === 'main'
    && env('PROVIDER_PROOF_ENVIRONMENT') === 'production'
    && FULL_SHA.test(targetSha);
  let currentMain = false;
  let repositoryReachable = false;

  if (repository && token) {
    const repoResponse = await request(`https://api.github.com/repos/${repository}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    repositoryReachable = repoResponse?.status === 200;
    await repoResponse?.body?.cancel().catch(() => undefined);

    const mainResponse = await request(`https://api.github.com/repos/${repository}/commits/main`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (mainResponse?.status === 200) {
      const body = await jsonBounded(mainResponse);
      currentMain = String(body?.sha ?? '').toLowerCase() === targetSha;
    } else {
      await mainResponse?.body?.cancel().catch(() => undefined);
    }
  }

  const checks = {
    repositoryReachable,
    repositoryBound: repository === 'renanescola40-afk/eurocomply_saas',
    currentMainShaBound: currentMain,
    protectedProductionEnvironment: env('PROVIDER_PROOF_ENVIRONMENT') === 'production',
    githubActionsRunBound: /^\d+$/.test(env('GITHUB_RUN_ID')),
    exactContext,
  };
  return { checks, passed: Object.values(checks).every(Boolean) };
}

async function readNonSecretVercelControl(token, target, entry) {
  if (!entry?.id || !NON_SECRET_VERCEL_CONTROLS.includes(String(entry?.key ?? ''))) return null;

  const response = await request(
    `https://api.vercel.com/v1/projects/${encodeURIComponent(target.projectId)}/env/${encodeURIComponent(String(entry.id))}?teamId=${encodeURIComponent(target.teamId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (response?.status !== 200) {
    await response?.body?.cancel().catch(() => undefined);
    return null;
  }

  const body = await jsonBounded(response, 64 * 1024);
  if (String(body?.key ?? '') !== String(entry.key ?? '')) return null;
  return String(body?.value ?? '').trim();
}

async function vercelProof() {
  const token = env('VERCEL_TOKEN');
  const targets = loadProviderTargets();
  const target = targets.vercel;
  let projectReachable = false;
  let projectIdentityMatched = false;
  let productionEnvironmentEnumerated = false;
  let requiredEnvironmentKeysPresent = false;
  let requiredEnvironmentKeyCount = 0;
  let transactionalEmailBindingsPresent = false;
  let transactionalEmailGuardEnabled = false;
  let malwareScanningGuardEnabled = false;
  let malwareScannerProviderSupported = false;
  let malwareScannerTransportBindingPresent = false;
  let metricSnapshotPolicyBindingPresent = false;
  let metricSnapshotWritesDisabled = false;
  let selectedNonSecretControlsResolved = false;
  let scannerTransportBindingModesPresent = 0;

  if (token && target) {
    const projectResponse = await request(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(target.projectId)}?teamId=${encodeURIComponent(target.teamId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    projectReachable = projectResponse?.status === 200;
    if (projectReachable) {
      const body = await jsonBounded(projectResponse);
      projectIdentityMatched = body?.id === target.projectId
        && body?.name === target.projectName
        && body?.accountId === target.teamId;
    } else {
      await projectResponse?.body?.cancel().catch(() => undefined);
    }

    const envResponse = await request(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(target.projectId)}/env?target=production&decrypt=false&teamId=${encodeURIComponent(target.teamId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (envResponse?.status === 200) {
      const body = await jsonBounded(envResponse);
      const entries = Array.isArray(body?.envs) ? body.envs : [];
      const productionEntries = entries.filter((entry) => Array.isArray(entry?.target) ? entry.target.includes('production') : true);
      const productionKeys = new Set(
        productionEntries
          .map((entry) => String(entry?.key ?? ''))
          .filter(Boolean),
      );
      const entryByKey = new Map(
        productionEntries
          .filter((entry) => typeof entry?.key === 'string' && entry.key)
          .map((entry) => [String(entry.key), entry]),
      );

      productionEnvironmentEnumerated = true;
      requiredEnvironmentKeyCount = REQUIRED_VERCEL_KEYS.filter((key) => productionKeys.has(key)).length;
      requiredEnvironmentKeysPresent = requiredEnvironmentKeyCount === REQUIRED_VERCEL_KEYS.length;
      transactionalEmailBindingsPresent = [
        'RESEND_API_KEY',
        'EMAIL_FROM',
        'REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY',
      ].every((key) => productionKeys.has(key));
      metricSnapshotPolicyBindingPresent = productionKeys.has('ENABLE_DASHBOARD_METRIC_SNAPSHOTS');

      const httpTransportBindingPresent = productionKeys.has('MALWARE_SCANNER_ALLOWED_HOSTS')
        && (productionKeys.has('MALWARE_SCANNER_ENDPOINT') || productionKeys.has('MALWARE_SCANNER_URL'));
      const clamavTransportBindingPresent = productionKeys.has('MALWARE_SCANNER_CLAMAV_HOST')
        && productionKeys.has('MALWARE_SCANNER_CLAMAV_PORT');
      scannerTransportBindingModesPresent = Number(httpTransportBindingPresent) + Number(clamavTransportBindingPresent);

      const [transactionalEmailGuard, malwareScanningGuard, malwareScannerProvider, metricSnapshotPolicy] = await Promise.all([
        readNonSecretVercelControl(token, target, entryByKey.get('REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY')),
        readNonSecretVercelControl(token, target, entryByKey.get('REQUIRE_MALWARE_SCAN_FOR_UPLOADS')),
        readNonSecretVercelControl(token, target, entryByKey.get('MALWARE_SCANNER_PROVIDER')),
        readNonSecretVercelControl(token, target, entryByKey.get('ENABLE_DASHBOARD_METRIC_SNAPSHOTS')),
      ]);

      selectedNonSecretControlsResolved = [
        transactionalEmailGuard,
        malwareScanningGuard,
        malwareScannerProvider,
        metricSnapshotPolicy,
      ].every((value) => value !== null);
      transactionalEmailGuardEnabled = transactionalEmailGuard === 'true';
      malwareScanningGuardEnabled = malwareScanningGuard === 'true';
      const normalizedScannerProvider = String(malwareScannerProvider ?? '').toLowerCase();
      malwareScannerProviderSupported = SUPPORTED_MALWARE_SCANNER_PROVIDERS.has(normalizedScannerProvider);
      malwareScannerTransportBindingPresent = HTTP_MALWARE_SCANNER_PROVIDERS.has(normalizedScannerProvider)
        ? httpTransportBindingPresent
        : CLAMAV_MALWARE_SCANNER_PROVIDERS.has(normalizedScannerProvider) && clamavTransportBindingPresent;
      metricSnapshotWritesDisabled = metricSnapshotPolicy === 'false';
    } else {
      await envResponse?.body?.cancel().catch(() => undefined);
    }
  }

  const checks = {
    apiTokenConfigured: Boolean(token),
    targetConfigurationBound: targets.valid,
    projectReachable,
    projectIdentityMatched,
    productionEnvironmentEnumerated,
    requiredEnvironmentKeysPresent,
    transactionalEmailBindingsPresent,
    transactionalEmailGuardEnabled,
    malwareScanningGuardEnabled,
    malwareScannerProviderSupported,
    malwareScannerTransportBindingPresent,
    metricSnapshotPolicyBindingPresent,
    metricSnapshotWritesDisabled,
    selectedNonSecretControlsResolved,
  };
  return {
    checks,
    metrics: {
      requiredEnvironmentKeys: REQUIRED_VERCEL_KEYS.length,
      requiredEnvironmentKeysPresent: requiredEnvironmentKeyCount,
      scannerTransportBindingModesPresent,
      selectedNonSecretControlsChecked: NON_SECRET_VERCEL_CONTROLS.length,
    },
    passed: Object.values(checks).every(Boolean),
  };
}

async function supabaseProof() {
  const url = cleanUrl(env('NEXT_PUBLIC_SUPABASE_URL'));
  const serviceRole = env('SUPABASE_SERVICE_ROLE_KEY');
  let projectReachable = false;
  let serviceRoleAuthorized = false;

  if (url && serviceRole) {
    const response = await request(new URL('/rest/v1/subscriptions?select=id&limit=1', url).toString(), {
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        Accept: 'application/json',
      },
    });
    projectReachable = Boolean(response && response.status < 500);
    serviceRoleAuthorized = response?.status === 200;
    await response?.body?.cancel().catch(() => undefined);
  }

  const checks = {
    urlConfigured: Boolean(url),
    serviceRoleConfigured: Boolean(serviceRole),
    projectReachable,
    serviceRoleAuthorized,
  };
  return { checks, passed: Object.values(checks).every(Boolean) };
}

async function stripeProof() {
  const secret = env('STRIPE_SECRET_KEY');
  const { bindings, transitionPolicyRejectsLegacy, legacyPriceKeys } = loadCanonicalStripeBindings();
  const legacyAliasesRejected = legacyPriceKeys.every((key) => !env(key));
  const configured = bindings.every((binding) => PRICE_ID.test(binding.priceId));
  let apiReachable = false;
  let verifiedCanonicalPrices = 0;

  if (secret) {
    const account = await request('https://api.stripe.com/v1/account', {
      headers: { Authorization: `Bearer ${secret}` },
    });
    apiReachable = account?.status === 200;
    await account?.body?.cancel().catch(() => undefined);
  }

  if (secret && configured && transitionPolicyRejectsLegacy && legacyAliasesRejected) {
    const results = await Promise.all(bindings.map(async (binding) => {
      const response = await request(`https://api.stripe.com/v1/prices/${encodeURIComponent(binding.priceId)}?expand[]=product`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (response?.status !== 200) {
        await response?.body?.cancel().catch(() => undefined);
        return false;
      }
      const body = await jsonBounded(response);
      return body?.livemode === true
        && body?.active === true
        && body?.type === 'recurring'
        && body?.recurring?.interval === binding.interval
        && body?.product?.active === true
        && body?.product?.metadata?.billing_plan_id === binding.publicId
        && body?.product?.metadata?.catalog_status === 'canonical_live';
    }));
    verifiedCanonicalPrices = results.filter(Boolean).length;
  }

  const checks = {
    secretConfigured: Boolean(secret),
    apiReachable,
    transitionPolicyRejectsLegacy,
    legacyAliasesRejected,
    fourCanonicalSelfServeBindingsConfigured: configured && bindings.length === 4,
    fourCanonicalSelfServePricesVerified: verifiedCanonicalPrices === 4,
  };
  return {
    checks,
    metrics: {
      canonicalSelfServePriceBindings: bindings.length,
      canonicalSelfServePricesVerified: verifiedCanonicalPrices,
      legacyPriceKeysChecked: legacyPriceKeys.length,
    },
    passed: Object.values(checks).every(Boolean),
  };
}

function sentryEntryHasActiveHttpsDsn(entry) {
  if (!entry || entry?.isActive === false || String(entry?.status ?? '').toLowerCase() === 'inactive') return false;
  const dsn = entry?.dsn;
  const candidates = typeof dsn === 'string'
    ? [dsn]
    : dsn && typeof dsn === 'object'
      ? Object.values(dsn).filter((value) => typeof value === 'string')
      : [];
  return candidates.some((candidate) => Boolean(cleanUrl(candidate)));
}

async function sentryProof() {
  const org = env('SENTRY_ORG');
  const project = env('SENTRY_PROJECT');
  const token = env('SENTRY_AUTH_TOKEN');
  let projectReachable = false;
  let clientKeyInventoryReachable = false;
  let activeClientKeyPresent = false;

  if (org && project && token) {
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
    const projectResponse = await request(
      `https://sentry.io/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/`,
      { headers },
    );
    projectReachable = projectResponse?.status === 200;
    await projectResponse?.body?.cancel().catch(() => undefined);

    const keysResponse = await request(
      `https://sentry.io/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/keys/?status=active`,
      { headers },
    );
    if (keysResponse?.status === 200) {
      const body = await jsonBounded(keysResponse, 512 * 1024);
      const entries = Array.isArray(body) ? body : [];
      clientKeyInventoryReachable = true;
      activeClientKeyPresent = entries.some(sentryEntryHasActiveHttpsDsn);
    } else {
      await keysResponse?.body?.cancel().catch(() => undefined);
    }
  }

  const checks = {
    organizationConfigured: Boolean(org),
    projectConfigured: Boolean(project),
    buildAuthTokenConfigured: Boolean(token),
    projectReachable,
    clientKeyInventoryReachable,
    activeClientKeyPresent,
  };
  return { checks, passed: Object.values(checks).every(Boolean) };
}

function providerEntry(provider, result, evidenceLocation) {
  return {
    provider,
    environment: 'production',
    status: result.passed ? 'reviewed' : 'blocked',
    evidenceLocation,
    checks: result.checks,
    ...(result.metrics ? { metrics: result.metrics } : {}),
  };
}

async function main() {
  const targetSha = env('TARGET_SHA').toLowerCase();
  const generatedAt = new Date().toISOString();
  const nextReviewDue = new Date(Date.parse(generatedAt) + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [github, vercel, supabase, stripe, sentry] = await Promise.all([
    githubProof(targetSha),
    vercelProof(),
    supabaseProof(),
    stripeProof(),
    sentryProof(),
  ]);

  const providersReviewed = [
    providerEntry('github', github, '.github/workflows/production-provider-runtime-proof.yml'),
    providerEntry('vercel', vercel, 'Vercel API project identity, Production environment metadata, and selected non-secret control values; secret values are never decrypted or stored'),
    providerEntry('supabase', supabase, 'Supabase REST connectivity using protected service-role credential (credential not stored)'),
    providerEntry('stripe', stripe, 'Stripe account and canonical self-serve recurring Price metadata probes (responses and Price IDs not stored)'),
    providerEntry('sentry', sentry, 'Sentry project and active client-key metadata probes using CI-only auth token (DSN and token not stored)'),
  ];
  const allPassed = FULL_SHA.test(targetSha) && providersReviewed.every((entry) => entry.status === 'reviewed');

  const evidence = {
    schema: 'risck-comply.production-provider-runtime-evidence.v2',
    evidenceItem: 'production-secrets-provider-stores',
    status: allPassed ? 'Complete' : 'Open',
    outcome: allPassed ? 'passed' : 'blocked',
    generatedAt,
    reviewedAt: generatedAt,
    reviewer: 'RISCK COMPLY protected production provider proof',
    summary: allPassed
      ? 'Protected exact-SHA provider probes verified Production GitHub, Vercel, Supabase, Stripe and Sentry configuration, including transactional-email, malware-scanner and metric-snapshot runtime controls, without storing provider values.'
      : 'One or more protected production provider probes did not meet the fail-closed acceptance criteria.',
    valuesRedacted: true,
    runtimeContext: {
      repository: env('GITHUB_REPOSITORY'),
      branch: env('GITHUB_REF_NAME'),
      commitSha: targetSha,
      environment: env('PROVIDER_PROOF_ENVIRONMENT'),
      generatedByGithubActions: true,
      githubRunId: env('GITHUB_RUN_ID'),
      githubRunAttempt: env('GITHUB_RUN_ATTEMPT'),
    },
    providersReviewed,
    rotationOwner: 'Platform and Security release owners',
    nextReviewDue,
    controlsVerified: providersReviewed
      .filter((entry) => entry.status === 'reviewed')
      .map((entry) => `${entry.provider} production provider configuration verified by protected runtime probe.`),
    evidenceLocations: [
      '.github/workflows/production-provider-runtime-proof.yml',
      '.github/workflows/vercel-production.yml',
      'config/production-provider-targets.json',
      'config/billing-commercial-catalog.json',
      'scripts/security/run-production-provider-runtime-proof.mjs',
      'scripts/release/validate-production-secrets-runtime-evidence.mjs',
      'docs/security/evidence/runtime/production-secrets-provider-stores.json',
    ],
    redactionConfirmation: CANONICAL_REDACTION_CONFIRMATION,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawValuesStored: false,
      credentialsStored: false,
      providerResponseBodiesStored: false,
      decryptedProviderEnvironmentValuesStored: false,
      selectedNonSecretControlValuesStored: false,
      exactShaBound: FULL_SHA.test(targetSha),
    },
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });

  console.log(`Production provider runtime proof: ${evidence.status}`);
  for (const entry of providersReviewed) {
    console.log(`${entry.provider}: ${entry.status}`);
  }

  if (!allPassed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Production provider runtime proof failed: ${error instanceof Error ? error.message : 'unknown_error'}`);
  process.exit(1);
});

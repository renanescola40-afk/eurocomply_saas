#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const OUTPUT = resolve('docs/security/evidence/runtime/production-secrets-provider-stores.json');
const FULL_SHA = /^[a-f0-9]{40}$/;
const API_TIMEOUT_MS = 8_000;

const REQUIRED_VERCEL_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'HEALTHCHECK_TOKEN',
  'NEXT_PUBLIC_SENTRY_DSN',
  'STEP_UP_SIGNING_SECRET',
  'STEP_UP_PROVIDER_MODE',
  'REQUIRE_MALWARE_SCAN_FOR_UPLOADS',
  'MALWARE_SCANNER_PROVIDER',
];

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function configured(name) {
  return Boolean(env(name));
}

function cleanUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

async function request(url, init = {}) {
  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    return response;
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

async function vercelProof() {
  const token = env('VERCEL_TOKEN');
  const orgId = env('VERCEL_ORG_ID');
  const projectId = env('VERCEL_PROJECT_ID');
  let projectReachable = false;
  let productionEnvironmentEnumerated = false;
  let requiredEnvironmentKeysPresent = false;
  let requiredEnvironmentKeyCount = 0;

  if (token && orgId && projectId) {
    const projectResponse = await request(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}?teamId=${encodeURIComponent(orgId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    projectReachable = projectResponse?.status === 200;
    await projectResponse?.body?.cancel().catch(() => undefined);

    const envResponse = await request(`https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/env?target=production&decrypt=false&teamId=${encodeURIComponent(orgId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (envResponse?.status === 200) {
      const body = await jsonBounded(envResponse);
      const entries = Array.isArray(body?.envs) ? body.envs : [];
      const productionKeys = new Set(
        entries
          .filter((entry) => Array.isArray(entry?.target) ? entry.target.includes('production') : true)
          .map((entry) => String(entry?.key ?? ''))
          .filter(Boolean),
      );
      productionEnvironmentEnumerated = true;
      requiredEnvironmentKeyCount = REQUIRED_VERCEL_KEYS.filter((key) => productionKeys.has(key)).length;
      requiredEnvironmentKeysPresent = requiredEnvironmentKeyCount === REQUIRED_VERCEL_KEYS.length;
    } else {
      await envResponse?.body?.cancel().catch(() => undefined);
    }
  }

  const checks = {
    credentialsConfigured: Boolean(token && orgId && projectId),
    projectReachable,
    productionEnvironmentEnumerated,
    requiredEnvironmentKeysPresent,
  };
  return {
    checks,
    metrics: {
      requiredEnvironmentKeys: REQUIRED_VERCEL_KEYS.length,
      requiredEnvironmentKeysPresent: requiredEnvironmentKeyCount,
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

function stripePriceIds() {
  return [
    env('STRIPE_PRICE_STARTER_MONTHLY') || env('STRIPE_PRICE_ESSENTIAL_MONTHLY'),
    env('STRIPE_PRICE_GROWTH_MONTHLY') || env('STRIPE_PRICE_PROFESSIONAL_MONTHLY') || env('STRIPE_PRICE_BUSINESS_MONTHLY'),
    env('STRIPE_PRICE_ENTERPRISE_MONTHLY') || env('STRIPE_PRICE_BUSINESS_ENTERPRISE_MONTHLY'),
  ].filter(Boolean);
}

async function stripeProof() {
  const secret = env('STRIPE_SECRET_KEY');
  const prices = stripePriceIds();
  let apiReachable = false;
  let priceLookup = false;
  let billableMonthlyPrices = 0;

  if (secret) {
    const account = await request('https://api.stripe.com/v1/account', {
      headers: { Authorization: `Bearer ${secret}` },
    });
    apiReachable = account?.status === 200;
    await account?.body?.cancel().catch(() => undefined);
  }

  if (secret && prices.length === 3) {
    const results = await Promise.all(prices.map(async (priceId) => {
      const response = await request(`https://api.stripe.com/v1/prices/${encodeURIComponent(priceId)}?expand[]=product`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (response?.status !== 200) {
        await response?.body?.cancel().catch(() => undefined);
        return false;
      }
      const body = await jsonBounded(response);
      return body?.active === true
        && body?.type === 'recurring'
        && body?.recurring?.interval === 'month'
        && body?.product?.active === true;
    }));
    billableMonthlyPrices = results.filter(Boolean).length;
    priceLookup = billableMonthlyPrices === 3;
  }

  const checks = {
    secretConfigured: Boolean(secret),
    apiReachable,
    threePriceIdsConfigured: prices.length === 3,
    priceLookup,
  };
  return { checks, metrics: { billableMonthlyPrices }, passed: Object.values(checks).every(Boolean) };
}

async function sentryProof() {
  const org = env('SENTRY_ORG');
  const project = env('SENTRY_PROJECT');
  const token = env('SENTRY_AUTH_TOKEN');
  const dsn = cleanUrl(env('NEXT_PUBLIC_SENTRY_DSN'));
  let projectReachable = false;

  if (org && project && token) {
    const response = await request(`https://sentry.io/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    projectReachable = response?.status === 200;
    await response?.body?.cancel().catch(() => undefined);
  }

  const checks = {
    dsnConfigured: Boolean(dsn),
    organizationConfigured: Boolean(org),
    projectConfigured: Boolean(project),
    buildAuthTokenConfigured: Boolean(token),
    projectReachable,
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
    providerEntry('vercel', vercel, 'Vercel API project and production environment metadata (values never decrypted or stored)'),
    providerEntry('supabase', supabase, 'Supabase REST connectivity using protected service-role credential (credential not stored)'),
    providerEntry('stripe', stripe, 'Stripe account and recurring price metadata probes (responses not stored)'),
    providerEntry('sentry', sentry, 'Sentry project API reachability using CI-only auth token (token not stored)'),
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
      ? 'Protected exact-SHA provider probes verified production GitHub, Vercel, Supabase, Stripe and Sentry configuration without storing provider values.'
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
      'scripts/security/run-production-provider-runtime-proof.mjs',
      'scripts/release/validate-production-secrets-runtime-evidence.mjs',
      'docs/security/evidence/runtime/production-secrets-provider-stores.json',
    ],
    redactionConfirmation: 'No secret values, credentials, provider response bodies, tokens, IDs from customer data, or decrypted Vercel environment values are stored.',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawValuesStored: false,
      credentialsStored: false,
      providerResponseBodiesStored: false,
      decryptedProviderEnvironmentValuesStored: false,
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

#!/usr/bin/env node

import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import {
  evaluateRuntimeReleaseSha,
  sanitizeRuntimeReleaseResponse,
} from './runtime-release-sha-contract.mjs';

const evidencePath = 'docs/security/evidence/runtime/authenticated-production-smoke.json';
const generatedAt = new Date().toISOString();
const FULL_SHA = /^[0-9a-f]{40}$/;
const timeoutMs = Number.parseInt(process.env.RELEASE_AUTHENTICATED_SMOKE_TIMEOUT_MS || '30000', 10);
const locale = String(process.env.RELEASE_AUTHENTICATED_SMOKE_LOCALE || 'en')
  .trim()
  .toLowerCase()
  .replace(/[^a-z-]/g, '') || 'en';

function env(name) {
  return String(process.env[name] || '').trim();
}

function normalizeSha(value) {
  const sha = String(value || '').trim().toLowerCase();
  return FULL_SHA.test(sha) ? sha : null;
}

function firstConfigured(names) {
  for (const name of names) {
    const value = env(name);
    if (value) return { name, value };
  }
  return null;
}

function productionUrl() {
  const configured = firstConfigured([
    'RELEASE_PRODUCTION_URL',
    'RELEASE_DEPLOYMENT_URL',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SITE_URL',
    'PRODUCTION_URL',
  ]);
  if (!configured) return null;

  try {
    const parsed = new URL(/^https?:\/\//i.test(configured.value) ? configured.value : `https://${configured.value}`);
    if (parsed.protocol !== 'https:') return null;
    parsed.search = '';
    parsed.hash = '';
    return {
      source: configured.name,
      url: parsed.toString().replace(/\/$/, ''),
      host: parsed.hostname,
    };
  } catch {
    return null;
  }
}

function noStore(headers) {
  return /\bno-store\b/i.test(String(headers.get('cache-control') || ''));
}

async function verifyRuntimeRelease(baseUrl, token, expectedCommitSha, expectedBuildSha) {
  let response = null;
  let body = null;
  try {
    response = await fetch(new URL('/api/ready/release', `${baseUrl}/`), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'risck-comply-authenticated-production-smoke/1.0',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    body = await response.json().catch(() => null);
  } catch {
    return {
      passed: false,
      endpointStatus: 0,
      noStore: false,
      metadataAvailable: false,
      provenance: 'unavailable',
      observedCommitShaMatchedExpected: false,
      failures: ['runtime_release_request_failed'],
    };
  }

  const runtime = sanitizeRuntimeReleaseResponse(body);
  const evaluation = evaluateRuntimeReleaseSha({
    expectedCommitSha,
    expectedBuildSha,
    observedCommitSha: runtime.observedCommitSha,
    endpointStatus: response.status,
    cacheControl: response.headers.get('cache-control'),
  });
  const provenanceAccepted = runtime.provenance === 'vercel' || runtime.provenance === 'build-env';
  const matched = Boolean(runtime.observedCommitSha && runtime.observedCommitSha === expectedCommitSha);
  const failures = [
    ...evaluation.failures,
    ...(!runtime.statusOk ? ['runtime_release_status_not_ok'] : []),
    ...(!runtime.available ? ['runtime_release_metadata_unavailable'] : []),
    ...(!provenanceAccepted ? ['runtime_release_provenance_unaccepted'] : []),
  ];

  return {
    passed: evaluation.passed && runtime.statusOk && runtime.available && provenanceAccepted && matched,
    endpointStatus: response.status,
    noStore: noStore(response.headers),
    metadataAvailable: runtime.available,
    provenance: runtime.provenance,
    observedCommitShaMatchedExpected: matched,
    failures: [...new Set(failures)],
  };
}

function loginPath() {
  return `/${locale}/login`;
}

function dashboardPath() {
  return `/${locale}/dashboard`;
}

async function runIdentity(browser, baseUrl, label, credentials) {
  const result = {
    label,
    passed: false,
    loginPageStatus: null,
    leftLoginRoute: false,
    dashboardStatus: null,
    dashboardRouteReached: false,
    dashboardMainVisible: false,
    failureCategory: null,
  };
  const context = await browser.newContext();

  try {
    const page = await context.newPage();
    const loginResponse = await page.goto(new URL(loginPath(), `${baseUrl}/`).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    });
    result.loginPageStatus = loginResponse?.status() ?? null;

    await page.getByLabel(/email/i).fill(credentials.email, { timeout: timeoutMs });
    await page
      .getByLabel(/password|palavra-passe|senha|contraseña|mot de passe|passwort/i)
      .fill(credentials.password, { timeout: timeoutMs });
    await page
      .getByRole('button', { name: /sign in|entrar|connexion|accedi|anmelden/i })
      .click({ timeout: timeoutMs });

    await page.waitForURL(
      (candidate) => candidate.pathname !== loginPath(),
      { timeout: timeoutMs },
    );
    result.leftLoginRoute = true;

    const dashboardResponse = await page.goto(new URL(dashboardPath(), `${baseUrl}/`).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    });
    result.dashboardStatus = dashboardResponse?.status() ?? null;
    result.dashboardRouteReached = new URL(page.url()).pathname === dashboardPath();
    await page.getByRole('main').waitFor({ state: 'visible', timeout: timeoutMs });
    result.dashboardMainVisible = true;

    result.passed = Boolean(
      result.loginPageStatus
      && result.loginPageStatus < 500
      && result.leftLoginRoute
      && result.dashboardStatus === 200
      && result.dashboardRouteReached
      && result.dashboardMainVisible,
    );
    if (!result.passed) result.failureCategory = 'authenticated_journey_assertion_failed';
  } catch {
    result.failureCategory = 'authenticated_journey_probe_failed';
  } finally {
    await context.close().catch(() => {});
  }

  return result;
}

function writeEvidence(evidence, sensitiveMarkers) {
  const serialized = JSON.stringify(evidence, null, 2);
  if (sensitiveMarkers.some((marker) => marker && serialized.includes(marker))) {
    throw new Error('Refusing to write authenticated smoke evidence containing a sensitive marker.');
  }
  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${serialized}\n`);
}

async function main() {
  const target = productionUrl();
  const readinessToken = env('HEALTHCHECK_TOKEN');
  const expectedCommitSha = normalizeSha(env('RELEASE_COMMIT_SHA') || env('GITHUB_SHA'));
  const expectedBuildSha = normalizeSha(env('RELEASE_BUILD_SHA') || env('GITHUB_SHA'));
  const userA = { email: env('TEST_USER_A_EMAIL'), password: env('TEST_USER_A_PASSWORD') };
  const userB = { email: env('TEST_USER_B_EMAIL'), password: env('TEST_USER_B_PASSWORD') };
  const releaseTarget = env('RELEASE_TARGET') || 'production';

  const requiredConfiguration = {
    productionUrlConfigured: Boolean(target),
    healthcheckTokenConfigured: Boolean(readinessToken),
    expectedCommitShaValid: Boolean(expectedCommitSha),
    expectedBuildShaValid: Boolean(expectedBuildSha),
    expectedCommitAndBuildShaMatch: Boolean(expectedCommitSha && expectedBuildSha && expectedCommitSha === expectedBuildSha),
    testUserAConfigured: Boolean(userA.email && userA.password),
    testUserBConfigured: Boolean(userB.email && userB.password),
  };
  const configurationFailures = Object.entries(requiredConfiguration)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  let runtimeReleaseBinding = {
    passed: false,
    endpointStatus: 0,
    noStore: false,
    metadataAvailable: false,
    provenance: 'unavailable',
    observedCommitShaMatchedExpected: false,
    failures: ['configuration_incomplete'],
  };
  let identities = [];
  let browserFailure = null;

  if (configurationFailures.length === 0) {
    runtimeReleaseBinding = await verifyRuntimeRelease(
      target.url,
      readinessToken,
      expectedCommitSha,
      expectedBuildSha,
    );

    if (runtimeReleaseBinding.passed) {
      let browser = null;
      try {
        browser = await chromium.launch({ headless: true });
        identities = [
          await runIdentity(browser, target.url, 'test-user-a', userA),
          await runIdentity(browser, target.url, 'test-user-b', userB),
        ];
      } catch {
        browserFailure = 'browser_launch_or_execution_failed';
      } finally {
        await browser?.close().catch(() => {});
      }
    }
  }

  const identityFailures = identities.filter((identity) => !identity.passed).map((identity) => `${identity.label}:journey_failed`);
  const failures = [
    ...configurationFailures,
    ...runtimeReleaseBinding.failures,
    ...(browserFailure ? [browserFailure] : []),
    ...(identities.length === 2 ? [] : ['two_isolated_authenticated_journeys_not_completed']),
    ...identityFailures,
  ].filter((failure) => failure !== 'configuration_incomplete' || configurationFailures.length > 0);
  const passed = failures.length === 0
    && runtimeReleaseBinding.passed
    && identities.length === 2
    && identities.every((identity) => identity.passed);

  const evidence = {
    schema: 'risck-comply.authenticated-production-smoke.v1',
    evidenceItem: 'authenticated-production-smoke',
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'failed',
    generatedAt,
    reviewedAt: generatedAt,
    reviewer: 'RISCK COMPLY protected runtime automation',
    releaseTarget,
    commitSha: expectedCommitSha,
    buildSha: expectedBuildSha,
    target: {
      configured: Boolean(target),
      source: target?.source ?? null,
      host: target?.host ?? null,
      rawUrlStored: false,
    },
    requiredConfiguration,
    runtimeReleaseBinding,
    identities,
    failures: [...new Set(failures)],
    summary: passed
      ? 'Two isolated production users completed the real login-to-dashboard journey after the protected runtime metadata endpoint proved the exact expected release SHA.'
      : 'Authenticated production smoke is incomplete or failed; enterprise runtime closeout remains blocked.',
    evidenceLocations: [
      'scripts/release/run-authenticated-production-smoke.mjs',
      'src/app/api/ready/release/route.ts',
      `/${locale}/login`,
      `/${locale}/dashboard`,
      evidencePath,
    ],
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      cookiesStored: false,
      accessTokensStored: false,
      authorizationHeadersStored: false,
      rawPageContentStored: false,
      screenshotsStored: false,
      rawRuntimeResponseStored: false,
      mismatchedObservedShaStored: false,
    },
  };

  writeEvidence(evidence, [
    readinessToken,
    userA.email,
    userA.password,
    userB.email,
    userB.password,
    env('SUPABASE_SERVICE_ROLE_KEY'),
    env('STRIPE_SECRET_KEY'),
    env('STRIPE_WEBHOOK_SECRET'),
    env('UPSTASH_REDIS_REST_TOKEN'),
    env('SENTRY_AUTH_TOKEN'),
  ]);
  console.log(`Wrote ${evidencePath}`);

  if (!passed) {
    console.error('Authenticated production smoke failed closed.');
    for (const failure of evidence.failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('Authenticated production smoke passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'authenticated_production_smoke_failed');
  process.exit(1);
});

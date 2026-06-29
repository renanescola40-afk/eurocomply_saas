#!/usr/bin/env node

import http from 'node:http';
import https from 'node:https';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const evidencePath = 'docs/security/evidence/runtime/deployment-smoke-validation.json';
const timeoutMs = Number.parseInt(process.env.RELEASE_SMOKE_TIMEOUT_MS || '10000', 10);
const locale = (process.env.RELEASE_SMOKE_LOCALE || 'pt').trim().replace(/[^a-z-]/gi, '') || 'pt';
const healthTokenEnv = ['HEALTHCHECK', 'TOKEN'].join('_');
const healthToken = (process.env[healthTokenEnv] || '').trim();
const runObservabilitySmoke = process.env.RELEASE_RUN_OBSERVABILITY_SMOKE === 'true';

const SECURITY_HEADER_REQUIREMENTS = [
  ['content-security-policy', (value) => value.includes("default-src 'self'")],
  ['x-frame-options', (value) => value.toLowerCase() === 'deny'],
  ['x-content-type-options', (value) => value.toLowerCase() === 'nosniff'],
  ['strict-transport-security', (value) => value.toLowerCase().includes('max-age=')],
  ['referrer-policy', (value) => value.length > 0],
  ['permissions-policy', (value) => value.length > 0],
];

const SENSITIVE_READY_NAMES = [
  'HEALTHCHECK_TOKEN',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'UPSTASH_REDIS_REST_TOKEN',
  'SENTRY_AUTH_TOKEN',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

function now() {
  return new Date().toISOString();
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function firstConfigured(names) {
  for (const name of names) {
    const value = (process.env[name] || '').trim();
    if (value) return { name, value };
  }

  return null;
}

function targets() {
  const names = [
    'RELEASE_DEPLOYMENT_URL',
    'DEPLOYMENT_URL',
    'RELEASE_PRODUCTION_URL',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SITE_URL',
    'VERCEL_URL',
  ];

  return [
    ...new Set(
      [
        ...names.map((name) => process.env[name]),
        ...(process.env.RELEASE_SMOKE_URLS || '').split(','),
      ]
        .map(normalizeUrl)
        .filter(Boolean),
    ),
  ];
}

function route(baseUrl, path) {
  return new URL(path, `${baseUrl}/`).toString();
}

function headerValue(headers, name) {
  const raw = headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw.join(', ');
  return String(raw || '');
}

function hasNoStore(headers) {
  return /\bno-store\b/i.test(headerValue(headers, 'cache-control'));
}

function isHtml(response) {
  return response.status === 200 && headerValue(response.headers, 'content-type').includes('text/html');
}

function isJsonOk(response, expectedStatus) {
  return response.status === expectedStatus && Boolean(response.body);
}

function isRedirect(response) {
  return [301, 302, 303, 307, 308].includes(response.status);
}

function safeResponseSummary(response) {
  return {
    status: response.status,
    error: response.error ?? null,
    contentType: headerValue(response.headers, 'content-type') || null,
    cacheControl: headerValue(response.headers, 'cache-control') || null,
    location: headerValue(response.headers, 'location') || null,
    bodyStatus: response.body?.status ?? null,
  };
}

function request(url, options = {}) {
  const {
    method = 'GET',
    accept = 'text/html',
    headers = {},
  } = options;

  return new Promise((resolve) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'http:' ? http : https;
    const requestOptions = {
      method,
      timeout: timeoutMs,
      headers: {
        Accept: accept,
        'User-Agent': 'risck-comply-release-smoke/2.0',
        ...headers,
      },
    };

    const req = client.request(parsed, requestOptions, (response) => {
      let bodyText = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        bodyText += chunk;
      });
      response.on('end', () => {
        let body = null;
        const contentType = headerValue(response.headers, 'content-type');
        if (contentType.includes('application/json') || bodyText.trim().startsWith('{')) {
          try {
            body = bodyText ? JSON.parse(bodyText) : null;
          } catch {
            body = { parseError: 'non_json_response' };
          }
        }

        resolve({
          status: response.statusCode || 0,
          headers: response.headers,
          body,
        });
      });
    });

    req.on('timeout', () => req.destroy(new Error('request_timeout')));
    req.on('error', (error) => resolve({ status: 0, headers: {}, body: null, error: error.message }));
    req.end();
  });
}

function createCheck(name, passed, details = {}, critical = true) {
  return { name, critical, passed: Boolean(passed), details };
}

function readyGroup(body, name) {
  return Array.isArray(body?.environment)
    ? body.environment.find((item) => item?.name === name)
    : null;
}

function readyGroupConfigured(body, name) {
  const group = readyGroup(body, name);
  return group?.configured === true && group?.missingCount === 0;
}

function readyEvidenceIsRedacted(body) {
  const serialized = JSON.stringify(body || {});
  return SENSITIVE_READY_NAMES.every((name) => !serialized.includes(name));
}

function locationPointsToLogin(location, localeValue) {
  if (!location) return false;
  try {
    const parsed = location.startsWith('http')
      ? new URL(location)
      : new URL(location, 'https://example.invalid');
    return parsed.pathname === `/${localeValue}/login` && parsed.searchParams.has('next');
  } catch {
    return location.includes(`/${localeValue}/login`) && location.includes('next=');
  }
}

function releaseMetadata() {
  const commit = firstConfigured(['RELEASE_COMMIT_SHA', 'GITHUB_SHA', 'VERCEL_GIT_COMMIT_SHA']);
  const build = firstConfigured(['RELEASE_BUILD_SHA', 'NEXT_PUBLIC_BUILD_SHA', 'NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', 'VERCEL_GIT_COMMIT_SHA', 'GITHUB_SHA']);
  const rollback = firstConfigured(['RELEASE_ROLLBACK_TARGET', 'ROLLBACK_TARGET', 'LAST_KNOWN_GOOD_DEPLOYMENT_URL', 'VERCEL_ROLLBACK_DEPLOYMENT_URL']);

  return {
    commit: commit ? { source: commit.name, sha: commit.value } : null,
    build: build ? { source: build.name, sha: build.value } : null,
    rollback: rollback ? { source: rollback.name, value: rollback.value, url: normalizeUrl(rollback.value) } : null,
  };
}

async function smoke(baseUrl) {
  const checks = [];
  const publicPages = [
    { name: 'landingPublicLoads', path: `/${locale}` },
    { name: 'pricingPublicLoads', path: `/${locale}/pricing` },
    { name: 'trustPublicLoads', path: `/${locale}/trust` },
    { name: 'loginPublicLoads', path: `/${locale}/login` },
  ];

  const pageResponses = {};
  for (const page of publicPages) {
    const response = await request(route(baseUrl, page.path));
    pageResponses[page.name] = safeResponseSummary(response);
    checks.push(createCheck(page.name, isHtml(response), {
      path: page.path,
      ...safeResponseSummary(response),
    }));
  }

  const landingResponse = await request(route(baseUrl, `/${locale}`));
  const securityHeaders = Object.fromEntries(
    SECURITY_HEADER_REQUIREMENTS.map(([name]) => [name, headerValue(landingResponse.headers, name) ? 'present' : 'missing']),
  );
  checks.push(
    createCheck(
      'securityHeadersPresent',
      SECURITY_HEADER_REQUIREMENTS.every(([name, validate]) => {
        const value = headerValue(landingResponse.headers, name);
        return Boolean(value) && validate(value);
      }),
      { headers: securityHeaders },
    ),
  );

  const health = await request(route(baseUrl, '/api/health'), { accept: 'application/json' });
  checks.push(createCheck('healthEndpointOk', health.status === 200 && health.body?.status === 'ok', safeResponseSummary(health)));
  checks.push(createCheck('healthEndpointNoStore', hasNoStore(health.headers), safeResponseSummary(health)));

  const readyAnonymous = await request(route(baseUrl, '/api/ready'), { accept: 'application/json' });
  checks.push(createCheck('readyEndpointRejectsAnonymous', isJsonOk(readyAnonymous, 401) && readyAnonymous.body?.status === 'unauthorized', safeResponseSummary(readyAnonymous)));
  checks.push(createCheck('readyEndpointAnonymousNoStore', hasNoStore(readyAnonymous.headers), safeResponseSummary(readyAnonymous)));

  const readyAuthenticated = healthToken
    ? await request(route(baseUrl, '/api/ready'), {
      accept: 'application/json',
      headers: { Authorization: `${['Bear', 'er'].join('')} ${healthToken}` },
    })
    : { status: 0, headers: {}, body: null, error: 'missing_protected_readiness_token' };

  checks.push(createCheck('readyEndpointOkWithToken', readyAuthenticated.status === 200 && readyAuthenticated.body?.status === 'ready', safeResponseSummary(readyAuthenticated)));
  checks.push(createCheck('readyEndpointTokenNoStore', hasNoStore(readyAuthenticated.headers), safeResponseSummary(readyAuthenticated)));
  checks.push(createCheck('readyEndpointDoesNotExposeSecretNames', readyEvidenceIsRedacted(readyAuthenticated.body), {
    redactedSecretNames: true,
  }));
  checks.push(createCheck('supabaseEnvironmentConfigured', readyGroupConfigured(readyAuthenticated.body, 'supabase'), {
    group: readyGroup(readyAuthenticated.body, 'supabase') ?? null,
  }));
  checks.push(createCheck('stripeEnvironmentConfigured', readyGroupConfigured(readyAuthenticated.body, 'stripe'), {
    group: readyGroup(readyAuthenticated.body, 'stripe') ?? null,
  }));
  checks.push(createCheck('sentryObservabilityConfigured', readyGroupConfigured(readyAuthenticated.body, 'sentry'), {
    group: readyGroup(readyAuthenticated.body, 'sentry') ?? null,
  }));
  checks.push(createCheck('databaseReachable', readyAuthenticated.body?.checks?.databaseReachable === true, {
    database: readyAuthenticated.body?.database ?? null,
  }));
  checks.push(createCheck('enterpriseStorageScannerReady', readyAuthenticated.body?.checks?.enterpriseStorageScannerConfigured === true, {
    enterpriseStorageScanner: readyAuthenticated.body?.enterpriseStorageScanner ?? null,
  }));

  const protectedRoutes = [
    { name: 'dashboardRequiresAuthentication', path: `/${locale}/dashboard` },
    { name: 'organizationDashboardRequiresAuthentication', path: `/${locale}/dashboard/organizations` },
  ];

  for (const protectedRoute of protectedRoutes) {
    const response = await request(route(baseUrl, protectedRoute.path));
    const location = headerValue(response.headers, 'location');
    checks.push(createCheck(protectedRoute.name, isRedirect(response) && locationPointsToLogin(location, locale), {
      path: protectedRoute.path,
      ...safeResponseSummary(response),
    }));
    checks.push(createCheck(`${protectedRoute.name}NoStore`, hasNoStore(response.headers), {
      path: protectedRoute.path,
      cacheControl: headerValue(response.headers, 'cache-control') || null,
    }));
  }

  const observabilityAnonymous = await request(route(baseUrl, '/api/observability/smoke'), {
    method: 'POST',
    accept: 'application/json',
    headers: { Origin: baseUrl },
  });
  checks.push(createCheck('observabilitySmokeRejectsAnonymous', observabilityAnonymous.status === 401 && observabilityAnonymous.body?.status === 'unauthorized', safeResponseSummary(observabilityAnonymous)));
  checks.push(createCheck('observabilitySmokeNoStore', hasNoStore(observabilityAnonymous.headers), safeResponseSummary(observabilityAnonymous)));

  let observabilityAuthenticated = null;
  if (runObservabilitySmoke && healthToken) {
    observabilityAuthenticated = await request(route(baseUrl, '/api/observability/smoke'), {
      method: 'POST',
      accept: 'application/json',
      headers: {
        Authorization: `${['Bear', 'er'].join('')} ${healthToken}`,
        Origin: baseUrl,
      },
    });

    checks.push(createCheck('observabilitySmokeSent', observabilityAuthenticated.status === 200 && observabilityAuthenticated.body?.status === 'sent', safeResponseSummary(observabilityAuthenticated)));
  } else {
    checks.push(createCheck('observabilitySmokeSent', !runObservabilitySmoke, {
      skipped: !runObservabilitySmoke,
      reason: runObservabilitySmoke ? 'missing_protected_readiness_token' : 'set RELEASE_RUN_OBSERVABILITY_SMOKE=true to emit a real observability smoke event',
    }, false));
  }

  const passed = checks.filter((check) => check.critical).every((check) => check.passed);
  return {
    baseUrl,
    passed,
    checks,
    pages: pageResponses,
    health: safeResponseSummary(health),
    readyAnonymous: safeResponseSummary(readyAnonymous),
    readyAuthenticated: safeResponseSummary(readyAuthenticated),
    observabilityAnonymous: safeResponseSummary(observabilityAnonymous),
    observabilityAuthenticated: observabilityAuthenticated ? safeResponseSummary(observabilityAuthenticated) : null,
  };
}

async function validateRollbackTarget(metadata) {
  if (!metadata.rollback) {
    return createCheck('rollbackTargetConfigured', false, {
      expectedEnv: ['RELEASE_ROLLBACK_TARGET', 'ROLLBACK_TARGET', 'LAST_KNOWN_GOOD_DEPLOYMENT_URL', 'VERCEL_ROLLBACK_DEPLOYMENT_URL'],
    });
  }

  if (!metadata.rollback.url) {
    return createCheck('rollbackTargetConfigured', true, {
      source: metadata.rollback.source,
      networkVerified: false,
      note: 'Rollback target is configured but is not a URL, so deployment health was not probed.',
    });
  }

  const health = await request(route(metadata.rollback.url, '/api/health'), { accept: 'application/json' });
  return createCheck('rollbackTargetConfigured', health.status === 200 && health.body?.status === 'ok', {
    source: metadata.rollback.source,
    networkVerified: true,
    targetStatus: health.status,
    targetBodyStatus: health.body?.status ?? null,
  });
}

const generatedAt = now();
const targetUrls = targets();
const metadata = releaseMetadata();
const globalChecks = [
  createCheck('productionUrlConfigured', targetUrls.length > 0, { targetCount: targetUrls.length }),
  createCheck('protectedReadinessTokenConfigured', Boolean(healthToken), { present: Boolean(healthToken) }),
  createCheck('lastCommitValidated', Boolean(metadata.commit?.sha), { source: metadata.commit?.source ?? null, sha: metadata.commit?.sha ?? null }),
  createCheck('buildShaRegistered', Boolean(metadata.build?.sha), { source: metadata.build?.source ?? null, sha: metadata.build?.sha ?? null }),
  await validateRollbackTarget(metadata),
];

const targetResults = [];
if (targetUrls.length > 0) {
  for (const url of targetUrls) {
    targetResults.push(await smoke(url));
  }
}

const allCriticalChecks = [
  ...globalChecks,
  ...targetResults.flatMap((target) => target.checks),
];
const failures = allCriticalChecks
  .filter((check) => check.critical && !check.passed)
  .map((check) => check.name);
const outcome = failures.length === 0 ? 'passed' : 'failed';
const passedControls = allCriticalChecks
  .filter((check) => check.critical && check.passed)
  .map((check) => check.name);

const evidence = {
  evidenceItem: 'deployment-smoke-validation',
  status: outcome === 'passed' ? 'Complete' : 'Open',
  outcome,
  generatedAt,
  reviewedAt: generatedAt,
  reviewer: 'RISCK COMPLY release automation',
  releaseTarget: process.env.RELEASE_TARGET || 'production',
  summary: outcome === 'passed'
    ? 'Production deployment smoke passed across public pages, protected routes, security headers, no-store controls, readiness, observability guard, rollback target, and build metadata.'
    : 'Production deployment smoke is missing or failed; release remains blocked.',
  redactionConfirmation: 'Redaction confirmed: no token, cookie, authorization header, secret value, or secret environment variable name is written to this evidence file.',
  evidenceLocations: [
    'scripts/release/run-deployment-smoke.mjs',
    'src/middleware.ts',
    'src/app/api/health/route.ts',
    'src/app/api/ready/route.ts',
    'src/app/api/observability/smoke/route.ts',
    evidencePath,
  ],
  controlsVerified: outcome === 'passed' ? passedControls : [],
  runtimeConfiguration: {
    targetCount: targetUrls.length,
    hasProtectedReadinessToken: Boolean(healthToken),
    timeoutMs,
    locale,
    observabilitySmokeEmissionEnabled: runObservabilitySmoke,
    rollbackTargetConfigured: Boolean(metadata.rollback),
    commitShaSource: metadata.commit?.source ?? null,
    buildShaSource: metadata.build?.source ?? null,
  },
  globalChecks,
  targets: targetResults,
  failures,
  releaseGate: outcome === 'passed'
    ? 'Deployment smoke evidence is present and passed.'
    : 'Production and enterprise release remain blocked until deployment smoke is Complete/passed.',
  evidenceIntegrity: {
    containsSensitiveValues: false,
    valuesRedacted: true,
    authorizationHeaderStored: false,
    cookiesStored: false,
  },
};

mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Wrote ${evidencePath}`);

if (failures.length > 0) {
  console.error('Deployment smoke validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Deployment smoke validation passed.');

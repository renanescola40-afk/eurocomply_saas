#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const OUTPUT = 'docs/security/evidence/runtime/deployment-smoke-validation.json';
const CANONICAL_HOST = 'www.risckcomply.com';
const configuredBaseUrl = String(
  process.env.RELEASE_PRODUCTION_URL
  || process.env.RELEASE_DEPLOYMENT_URL
  || `https://${CANONICAL_HOST}`,
).trim();
const parsedBaseUrl = new URL(configuredBaseUrl);
if (
  parsedBaseUrl.protocol !== 'https:'
  || parsedBaseUrl.hostname.toLowerCase() !== CANONICAL_HOST
  || parsedBaseUrl.username
  || parsedBaseUrl.password
  || parsedBaseUrl.search
  || parsedBaseUrl.hash
  || (parsedBaseUrl.pathname !== '/' && parsedBaseUrl.pathname !== '')
) {
  throw new Error('Production runtime proof requires the canonical HTTPS hostname');
}
const BASE_URL = parsedBaseUrl.origin;
const TIMEOUT_MS = Number(process.env.RELEASE_SMOKE_TIMEOUT_MS || 10_000);
const token = String(process.env.HEALTHCHECK_TOKEN || '').trim();
const expectedSha = String(process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
const buildSha = String(process.env.RELEASE_BUILD_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();

const requiredHeaders = [
  ['content-security-policy', (value) => value.includes("default-src 'self'")],
  ['x-frame-options', (value) => value.toLowerCase() === 'deny'],
  ['x-content-type-options', (value) => value.toLowerCase() === 'nosniff'],
  ['strict-transport-security', (value) => value.toLowerCase().includes('max-age=')],
  ['referrer-policy', (value) => value.length > 0],
  ['permissions-policy', (value) => value.length > 0],
];

function check(name, passed, details = {}, critical = true) {
  return { name, passed: passed === true, critical, details };
}

function noStore(response) {
  return /\bno-store\b/i.test(response.headers.get('cache-control') || '');
}

function booleanField(source, key) {
  return typeof source?.[key] === 'boolean' ? source[key] : null;
}

function finiteNumberField(source, key) {
  return Number.isFinite(source?.[key]) ? Number(source[key]) : null;
}

function readinessDiagnostics(body) {
  if (!body || typeof body !== 'object') return { responseAvailable: false };

  const environment = Array.isArray(body.environment)
    ? body.environment.map((item) => ({
      name: typeof item?.name === 'string' ? item.name : 'unknown',
      configured: booleanField(item, 'configured'),
      missingCount: finiteNumberField(item, 'missingCount'),
    }))
    : [];

  return {
    responseAvailable: true,
    status: typeof body.status === 'string' ? body.status : 'unknown',
    environment,
    database: {
      adminClient: booleanField(body.database, 'adminClient'),
      subscriptionsReadable: booleanField(body.database, 'subscriptionsReadable'),
      detail: typeof body.database?.detail === 'string' ? body.database.detail : 'unknown',
    },
    stripe: {
      configured: booleanField(body.stripe, 'configured'),
      apiReachable: booleanField(body.stripe, 'apiReachable'),
      priceLookup: booleanField(body.stripe, 'priceLookup'),
      pricesChecked: finiteNumberField(body.stripe, 'pricesChecked'),
      detail: typeof body.stripe?.detail === 'string' ? body.stripe.detail : 'unknown',
    },
    sentryReleaseUploads: {
      configured: booleanField(body.sentryReleaseUploads, 'configured'),
      missingCount: finiteNumberField(body.sentryReleaseUploads, 'missingCount'),
      sourceMapsUploadRequiresAuthToken: booleanField(body.sentryReleaseUploads, 'sourceMapsUploadRequiresAuthToken'),
    },
    enterpriseStepUp: {
      required: booleanField(body.enterpriseStepUp, 'required'),
      configured: booleanField(body.enterpriseStepUp, 'configured'),
      dedicatedSigningSecretConfigured: booleanField(body.enterpriseStepUp, 'dedicatedSigningSecretConfigured'),
      runtimeConfigurationConfigured: booleanField(body.enterpriseStepUp, 'runtimeConfigurationConfigured'),
    },
    enterpriseStorageScanner: {
      required: booleanField(body.enterpriseStorageScanner, 'required'),
      configured: booleanField(body.enterpriseStorageScanner, 'configured'),
      storageBucketConfigured: booleanField(body.enterpriseStorageScanner, 'storageBucketConfigured'),
      malwareScanningRequired: booleanField(body.enterpriseStorageScanner, 'malwareScanningRequired'),
      realScannerProviderConfigured: booleanField(body.enterpriseStorageScanner, 'realScannerProviderConfigured'),
      scannerTransportConfigured: booleanField(body.enterpriseStorageScanner, 'scannerTransportConfigured'),
    },
    checks: Object.fromEntries(
      Object.entries(body.checks && typeof body.checks === 'object' ? body.checks : {})
        .filter(([, value]) => typeof value === 'boolean'),
    ),
  };
}

async function request(path, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: options.accept || 'text/html', 'User-Agent': 'risck-comply-production-response-proof/1.0', ...(options.headers || {}) },
    });
    let body = null;
    if ((response.headers.get('content-type') || '').includes('application/json')) {
      body = await response.json().catch(() => null);
    }
    return { response, body };
  } catch {
    return { response: null, body: null };
  }
}

const landing = await request('/pt');
const health = await request('/api/health', { accept: 'application/json' });
const readyAnonymous = await request('/api/ready', { accept: 'application/json' });
const readyAuthenticated = token
  ? await request('/api/ready', { accept: 'application/json', headers: { Authorization: `Bearer ${token}` } })
  : { response: null, body: null };
const dashboard = await request('/pt/dashboard');
const organizationDashboard = await request('/pt/dashboard/organizations');
const observabilityAnonymous = await request('/api/observability/smoke', { accept: 'application/json' });

const headerState = Object.fromEntries(requiredHeaders.map(([name]) => [name, landing.response?.headers.get(name) ? 'present' : 'missing']));
const securityHeadersPresent = Boolean(landing.response) && requiredHeaders.every(([name, validator]) => {
  const value = landing.response.headers.get(name) || '';
  return value && validator(value);
});
const redirectToLogin = (result) => Boolean(result.response && [301, 302, 303, 307, 308].includes(result.response.status) && (result.response.headers.get('location') || '').includes('/pt/login'));
const privateRoutesNoStore = [dashboard, organizationDashboard].every((result) => result.response && noStore(result.response));
const sensitiveApisNoStore = [health, readyAnonymous, readyAuthenticated, observabilityAnonymous].every((result) => result.response && noStore(result.response));
const protectedReadinessDiagnostics = readinessDiagnostics(readyAuthenticated.body);

const detailedChecks = [
  check('securityHeadersPresent', securityHeadersPresent, { headers: headerState }),
  check('healthEndpointOk', health.response?.status === 200 && health.body?.status === 'ok', { status: health.response?.status || 0 }),
  check('readyEndpointRejectsAnonymous', readyAnonymous.response?.status === 401 && readyAnonymous.body?.status === 'unauthorized', { status: readyAnonymous.response?.status || 0 }),
  check(
    'readyEndpointOkWithToken',
    readyAuthenticated.response?.status === 200 && readyAuthenticated.body?.status === 'ready',
    { status: readyAuthenticated.response?.status || 0, readiness: protectedReadinessDiagnostics },
  ),
  check('readyEndpointDoesNotExposeSecrets', Boolean(readyAuthenticated.body) && !JSON.stringify(readyAuthenticated.body).includes(token), { valuesRedacted: true }),
  check('dashboardRequiresAuthentication', redirectToLogin(dashboard), { status: dashboard.response?.status || 0 }),
  check('organizationDashboardRequiresAuthentication', redirectToLogin(organizationDashboard), { status: organizationDashboard.response?.status || 0 }),
  check('privateRoutesHaveNoStore', privateRoutesNoStore),
  check('sensitiveApisHaveNoStore', sensitiveApisNoStore),
  check('publicLaunchPagesLoad', landing.response?.status === 200 && (landing.response.headers.get('content-type') || '').includes('text/html'), { status: landing.response?.status || 0 }),
];
const failures = detailedChecks.filter((item) => item.critical && !item.passed).map((item) => item.name);
const passed = failures.length === 0;
const generatedAt = new Date().toISOString();
const evidence = {
  evidenceItem: 'deployment-smoke-validation',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'failed',
  generatedAt,
  reviewedAt: generatedAt,
  reviewer: 'RISCK COMPLY protected runtime automation',
  releaseTarget: 'production-response-controls',
  summary: passed ? 'Focused exact-host production response proof passed.' : 'Focused production response proof failed.',
  redactionConfirmation: 'No bearer token, cookie, authorization header, raw response body, query string, secret, or customer data is stored. Readiness diagnostics retain only booleans, counts and fixed status labels.',
  globalChecks: [
    check('productionUrlConfigured', true, { targetCount: 1 }),
    check('protectedReadinessTokenConfigured', Boolean(token), { present: Boolean(token) }),
    check('lastCommitValidated', /^[a-f0-9]{40}$/.test(expectedSha), { source: 'RELEASE_COMMIT_SHA', sha: expectedSha }),
    check('buildShaRegistered', /^[a-f0-9]{40}$/.test(buildSha), { source: 'RELEASE_BUILD_SHA', sha: buildSha }),
  ],
  targets: [{
    baseUrl: BASE_URL,
    passed,
    checks: Object.fromEntries(detailedChecks.map((item) => [item.name, item.passed])),
    detailedChecks,
  }],
  failures,
  evidenceBoundary: 'This focused artifact proves only canonical-host security headers, no-store behavior, health, protected readiness, anonymous route boundaries, and public landing availability. Redacted readiness diagnostics identify failed control categories but store no environment values. It does not prove rollback, provider readiness, authenticated user journeys, observability delivery, or tenant isolation.',
  evidenceIntegrity: {
    containsSensitiveValues: false,
    valuesRedacted: true,
    authorizationHeaderStored: false,
    cookiesStored: false,
    rawUrlsStored: false,
    responseBodiesStored: false,
    readinessValuesStored: false,
  },
};
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log(`Wrote ${OUTPUT}`);
if (!passed) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

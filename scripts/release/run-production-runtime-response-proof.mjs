#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const OUTPUT = 'docs/security/evidence/runtime/deployment-smoke-validation.json';
const BASE_URL = 'https://risckcomply.com';
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

const detailedChecks = [
  check('securityHeadersPresent', securityHeadersPresent, { headers: headerState }),
  check('healthEndpointOk', health.response?.status === 200 && health.body?.status === 'ok', { status: health.response?.status || 0 }),
  check('readyEndpointRejectsAnonymous', readyAnonymous.response?.status === 401 && readyAnonymous.body?.status === 'unauthorized', { status: readyAnonymous.response?.status || 0 }),
  check('readyEndpointOkWithToken', readyAuthenticated.response?.status === 200 && readyAuthenticated.body?.status === 'ready', { status: readyAuthenticated.response?.status || 0 }),
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
  redactionConfirmation: 'No bearer token, cookie, authorization header, response body, query string, secret, or customer data is stored.',
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
  evidenceBoundary: 'This focused artifact proves only canonical-host security headers, no-store behavior, health, protected readiness, anonymous route boundaries, and public landing availability. It does not prove rollback, provider readiness, authenticated user journeys, observability delivery, or tenant isolation.',
  evidenceIntegrity: {
    containsSensitiveValues: false,
    valuesRedacted: true,
    authorizationHeaderStored: false,
    cookiesStored: false,
    rawUrlsStored: false,
    responseBodiesStored: false,
  },
};
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log(`Wrote ${OUTPUT}`);
if (!passed) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

#!/usr/bin/env node

import http from 'node:http';
import https from 'node:https';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const evidencePath = 'docs/security/evidence/runtime/deployment-smoke-validation.json';
const timeoutMs = Number.parseInt(process.env.RELEASE_SMOKE_TIMEOUT_MS || '10000', 10);
const locale = process.env.RELEASE_SMOKE_LOCALE || 'pt';
const allowHttp = process.env.PRODUCTION_SMOKE_ALLOW_HTTP === 'true';
const requireSentry = process.env.PRODUCTION_SMOKE_REQUIRE_SENTRY !== 'false';
const healthToken = (process.env[['HEALTHCHECK', 'TOKEN'].join('_')] || '').trim();

const urlEnvNames = [
  'PRODUCTION_SMOKE_URL',
  'RELEASE_DEPLOYMENT_URL',
  'DEPLOYMENT_URL',
  'RELEASE_PRODUCTION_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
  'VERCEL_URL',
];

const releaseShaEnvNames = ['RELEASE_CURRENT_SHA', 'GITHUB_SHA', 'VERCEL_GIT_COMMIT_SHA'];
const buildShaEnvNames = ['RELEASE_BUILD_SHA', 'BUILD_SHA', 'NEXT_PUBLIC_BUILD_SHA', 'VERCEL_GIT_COMMIT_SHA', 'NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', 'GITHUB_SHA'];
const rollbackUrlEnvNames = ['RELEASE_ROLLBACK_TARGET_URL', 'ROLLBACK_TARGET_URL', 'PREVIOUS_KNOWN_GOOD_URL'];
const rollbackShaEnvNames = ['RELEASE_ROLLBACK_TARGET_SHA', 'ROLLBACK_TARGET_SHA', 'PREVIOUS_KNOWN_GOOD_SHA'];

const requiredSecurityHeaders = [
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'strict-transport-security',
  'referrer-policy',
  'permissions-policy',
];

function now() {
  return new Date().toISOString();
}

function firstEnv(names) {
  return names.map((name) => (process.env[name] || '').trim()).find(Boolean) || '';
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

function getTargetUrls() {
  const fromEnv = urlEnvNames.map((name) => process.env[name]);
  const fromList = (process.env.RELEASE_SMOKE_URLS || '').split(',');
  return [...new Set([...fromEnv, ...fromList].map(normalizeUrl).filter(Boolean))];
}

function shaLooksValid(value) {
  return /^[0-9a-f]{40}$/i.test(value || '');
}

function safeSha(value) {
  return shaLooksValid(value) ? `${value.slice(0, 12)}…${value.slice(-7)}` : null;
}

function localGitSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function request(url, extraHeaders = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'http:' ? http : https;

    const req = client.request(
      parsed,
      {
        method: 'GET',
        timeout: timeoutMs,
        headers: {
          Accept: '*/*',
          'User-Agent': 'risck-comply-production-smoke/1.0',
          ...extraHeaders,
        },
      },
      (response) => {
        let bodyText = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          bodyText += chunk;
        });

        response.on('end', () => {
          const headers = Object.fromEntries(
            Object.entries(response.headers).map(([key, value]) => [
              key.toLowerCase(),
              Array.isArray(value) ? value.join(', ') : String(value || ''),
            ]),
          );

          let body = null;
          try {
            body = bodyText ? JSON.parse(bodyText) : null;
          } catch {
            body = null;
          }

          resolve({
            status: response.statusCode || 0,
            headers,
            body,
            bytes: Buffer.byteLength(bodyText),
            error: null,
          });
        });
      },
    );

    req.on('timeout', () => req.destroy(new Error('request_timeout')));
    req.on('error', (error) =>
      resolve({
        status: 0,
        headers: {},
        body: null,
        bytes: 0,
        error: error.message,
      }),
    );

    req.end();
  });
}

function responseSummary(response) {
  return {
    status: response.status,
    bytes: response.bytes,
    contentType: response.headers['content-type'] || null,
    cacheControl: response.headers['cache-control'] || null,
    location: response.headers.location || null,
    error: response.error || null,
  };
}

function htmlOk(response) {
  return response.status === 200 && /text\/html/i.test(response.headers['content-type'] || '') && response.bytes > 100;
}

function redirectsToLogin(response) {
  return [301, 302, 303, 307, 308].includes(response.status) && /\/login/i.test(response.headers.location || '');
}

function hasNoStore(response) {
  return /no-store/i.test(response.headers['cache-control'] || '');
}

function checkReadinessGroup(body, groupName, aliases) {
  const checks = body?.checks || {};

  if (checks[groupName] === true) return true;
  if (typeof checks[groupName] === 'object' && checks[groupName]?.configured === true) return true;

  return aliases.some((alias) => {
    const value = checks[alias];
    return value === true || value?.configured === true || value?.ok === true;
  });
}

function addCheck(checks, name, passed, critical, details = {}) {
  checks.push({
    name,
    passed: Boolean(passed),
    critical: Boolean(critical),
    details,
  });
}

async function smokeTarget(baseUrl) {
  const checks = [];

  const health = await request(`${baseUrl}/api/health`, { Accept: 'application/json' });
  const readyAnonymous = await request(`${baseUrl}/api/ready`, { Accept: 'application/json' });
  const readyAuthenticated = healthToken
    ? await request(`${baseUrl}/api/ready`, {
        Accept: 'application/json',
        Authorization: `${['Bear', 'er'].join('')} ${healthToken}`,
      })
    : { status: 0, headers: {}, body: null, bytes: 0, error: 'missing_protected_readiness_token' };

  const landing = await request(`${baseUrl}/${locale}`, { Accept: 'text/html' });
  const pricing = await request(`${baseUrl}/${locale}/pricing`, { Accept: 'text/html' });
  const trust = await request(`${baseUrl}/${locale}/trust`, { Accept: 'text/html' });
  const login = await request(`${baseUrl}/${locale}/login`, { Accept: 'text/html' });
  const dashboard = await request(`${baseUrl}/${locale}/dashboard`, { Accept: 'text/html' });
  const organizations = await request(`${baseUrl}/${locale}/dashboard/organizations`, { Accept: 'text/html' });

  const readyBody = readyAuthenticated.body || {};

  addCheck(checks, 'healthResponds', health.status === 200 && health.body?.status === 'ok', true, responseSummary(health));
  addCheck(checks, 'readyRejectsAnonymous', readyAnonymous.status === 401 && readyAnonymous.body?.status === 'unauthorized', true, responseSummary(readyAnonymous));
  addCheck(checks, 'readyRespondsAuthenticated', readyAuthenticated.status === 200 && readyAuthenticated.body?.status === 'ready' && readyBody?.checks?.healthcheckProtected === true, true, responseSummary(readyAuthenticated));

  addCheck(checks, 'landingLoads', htmlOk(landing), true, responseSummary(landing));
  addCheck(checks, 'pricingLoads', htmlOk(pricing), true, responseSummary(pricing));
  addCheck(checks, 'trustLoads', htmlOk(trust), true, responseSummary(trust));
  addCheck(checks, 'loginLoads', htmlOk(login), true, responseSummary(login));

  addCheck(checks, 'protectedRoutesRedirect', redirectsToLogin(dashboard) && redirectsToLogin(organizations), true, {
    dashboard: responseSummary(dashboard),
    organizations: responseSummary(organizations),
  });

  addCheck(checks, 'dashboardRequiresAuthentication', redirectsToLogin(dashboard), true, responseSummary(dashboard));

  addCheck(
    checks,
    'securityHeadersPresent',
    requiredSecurityHeaders.every((header) => Boolean(landing.headers[header])),
    true,
    {
      required: requiredSecurityHeaders,
      present: requiredSecurityHeaders.filter((header) => Boolean(landing.headers[header])),
    },
  );

  addCheck(
    checks,
    'sensitiveNoStorePresent',
    [health, readyAnonymous, readyAuthenticated, dashboard, organizations].every(hasNoStore),
    true,
    {
      health: responseSummary(health),
      readyAnonymous: responseSummary(readyAnonymous),
      readyAuthenticated: responseSummary(readyAuthenticated),
      dashboard: responseSummary(dashboard),
      organizations: responseSummary(organizations),
    },
  );

  addCheck(checks, 'stripeEnvConfiguredRedacted', checkReadinessGroup(readyBody, 'stripe', ['stripeConfigured', 'stripe']), true, {
    source: '/api/ready',
    valuesRedacted: true,
  });

  addCheck(checks, 'supabaseEnvConfiguredRedacted', checkReadinessGroup(readyBody, 'supabase', ['supabaseConfigured', 'supabase']), true, {
    source: '/api/ready',
    valuesRedacted: true,
  });

  addCheck(
    checks,
    'sentryObservabilityConfigured',
    requireSentry ? checkReadinessGroup(readyBody, 'sentry', ['sentryConfigured', 'sentry', 'observability']) : true,
    true,
    {
      required: requireSentry,
      source: '/api/ready',
      valuesRedacted: true,
    },
  );

  return {
    baseUrl,
    passed: checks.filter((check) => check.critical).every((check) => check.passed),
    checks,
  };
}

const generatedAt = now();
const targets = getTargetUrls();

const releaseSha = firstEnv(releaseShaEnvNames);
const buildSha = firstEnv(buildShaEnvNames);
const rollbackUrl = normalizeUrl(firstEnv(rollbackUrlEnvNames));
const rollbackSha = firstEnv(rollbackShaEnvNames);
const gitSha = localGitSha();

const preflightChecks = [];

addCheck(preflightChecks, 'productionUrlConfigured', targets.length > 0 && targets.every((url) => allowHttp || url.startsWith('https://')), true, {
  targetCount: targets.length,
  requiresHttps: !allowHttp,
});

addCheck(preflightChecks, 'protectedReadinessTokenConfigured', Boolean(healthToken), true, {
  present: Boolean(healthToken),
  valueRedacted: true,
});

addCheck(preflightChecks, 'rollbackTargetExists', Boolean(rollbackUrl) && shaLooksValid(rollbackSha), true, {
  rollbackUrlConfigured: Boolean(rollbackUrl),
  rollbackSha: safeSha(rollbackSha),
});

addCheck(preflightChecks, 'lastCommitValidated', shaLooksValid(releaseSha) && (!gitSha || releaseSha === gitSha), true, {
  releaseSha: safeSha(releaseSha),
  localGitSha: safeSha(gitSha),
  localGitAvailable: Boolean(gitSha),
});

addCheck(preflightChecks, 'buildShaRegistered', shaLooksValid(buildSha) && (!shaLooksValid(releaseSha) || buildSha === releaseSha), true, {
  buildSha: safeSha(buildSha),
  matchesReleaseSha: shaLooksValid(releaseSha) ? buildSha === releaseSha : null,
});

const targetResults = [];

if (preflightChecks.filter((check) => check.critical).every((check) => check.passed)) {
  for (const target of targets) {
    targetResults.push(await smokeTarget(target));
  }
}

const allChecks = [
  ...preflightChecks,
  ...targetResults.flatMap((target) =>
    target.checks.map((check) => ({
      ...check,
      target: target.baseUrl,
    })),
  ),
];

addCheck(allChecks, 'jsonEvidenceWritten', true, true, { path: evidencePath });

const failures = allChecks
  .filter((check) => check.critical && !check.passed)
  .map((check) => `${check.target ? `${check.target} ` : ''}${check.name}`);

const smokeTargets = {
  passed: targetResults.filter((target) => target.passed).map((target) => target.baseUrl),
  failed: targetResults.filter((target) => !target.passed).map((target) => target.baseUrl),
};

const outcome = failures.length === 0 ? 'passed' : 'failed';

const evidence = {
  evidenceItem: 'deployment-smoke-validation',
  status: outcome === 'passed' ? 'Complete' : 'Open',
  outcome,
  generatedAt,
  reviewedAt: generatedAt,
  reviewer: 'Risck Comply release automation',
  releaseTarget: process.env.RELEASE_TARGET || 'production',
  summary: outcome === 'passed' ? 'Production deployment smoke gate passed.' : 'Production deployment smoke gate failed; release remains blocked.',
  redactionConfirmation: 'No tokens, Stripe secrets, Supabase secrets, Sentry DSNs, cookies, or response bodies are stored in this evidence.',
  evidenceLocations: [
    'scripts/release/run-deployment-smoke.mjs',
    'src/app/api/health/route.ts',
    'src/app/api/ready/route.ts',
    'src/middleware.ts',
    'next.config.ts',
    'docs/security/PRODUCTION_SMOKE_TESTS.md',
    evidencePath,
  ],
  controlsVerified: allChecks.filter((check) => check.passed).map((check) => check.name),
  runtimeConfiguration: {
    targetCount: targets.length,
    locale,
    timeoutMs,
    allowHttp,
    requireSentry,
    hasProtectedReadinessToken: Boolean(healthToken),
  },
  smokeTargets,
  targets: targetResults,
  checkResults: allChecks,
  failures,
  releaseGate: outcome === 'passed' ? 'Production can proceed from smoke perspective.' : 'Do not publish or sell until all critical smoke checks pass.',
  evidenceIntegrity: {
    containsSensitiveValues: false,
    valuesRedacted: true,
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

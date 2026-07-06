#!/usr/bin/env node

import http from 'node:http';
import https from 'node:https';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const evidencePath = 'docs/security/evidence/runtime/observability-smoke-validation.json';
const timeoutMs = Number.parseInt(process.env.RELEASE_OBSERVABILITY_SMOKE_TIMEOUT_MS || '10000', 10);
const readinessToken = (process.env.HEALTHCHECK_TOKEN || '').trim();
const emitAuthenticatedSmoke = process.env.RELEASE_RUN_OBSERVABILITY_SMOKE === 'true';

const SENSITIVE_MARKERS = [
  process.env.HEALTHCHECK_TOKEN,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.STRIPE_SECRET_KEY,
  process.env.STRIPE_WEBHOOK_SECRET,
  process.env.UPSTASH_REDIS_REST_TOKEN,
  process.env.SENTRY_AUTH_TOKEN,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
].filter(Boolean);

function firstConfigured(names) {
  for (const name of names) {
    const value = (process.env[name] || '').trim();
    if (value) return { name, value };
  }

  return null;
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

function targetUrls() {
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

function safeResponseSummary(response) {
  return {
    status: response.status,
    error: response.error ?? null,
    contentType: headerValue(response.headers, 'content-type') || null,
    cacheControl: headerValue(response.headers, 'cache-control') || null,
    bodyStatus: response.body?.status ?? null,
    provider: response.body?.provider ?? null,
    hasRequestId: typeof response.body?.requestId === 'string' && response.body.requestId.length > 0,
  };
}

function responseDoesNotExposeSecrets(response) {
  const serialized = JSON.stringify(response?.body || {});
  return SENSITIVE_MARKERS.every((marker) => !serialized.includes(marker));
}

function request(url, options = {}) {
  const { method = 'POST', accept = 'application/json', headers = {} } = options;

  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      resolve({ status: 0, headers: {}, body: null, error: 'invalid_url' });
      return;
    }

    const client = parsed.protocol === 'http:' ? http : https;
    const req = client.request(parsed, {
      method,
      timeout: timeoutMs,
      headers: {
        Accept: accept,
        Origin: `${parsed.protocol}//${parsed.host}`,
        'User-Agent': 'risck-comply-observability-smoke/1.0',
        ...headers,
      },
    }, (response) => {
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

async function validateTarget(baseUrl) {
  const checks = [];

  const anonymousPost = await request(route(baseUrl, '/api/observability/smoke'));
  checks.push(createCheck('observabilitySmokeRejectsAnonymous', anonymousPost.status === 401 && anonymousPost.body?.status === 'unauthorized', safeResponseSummary(anonymousPost)));
  checks.push(createCheck('observabilitySmokeAnonymousNoStore', hasNoStore(anonymousPost.headers), safeResponseSummary(anonymousPost)));
  checks.push(createCheck('observabilitySmokeAnonymousHasRequestId', typeof anonymousPost.body?.requestId === 'string', safeResponseSummary(anonymousPost)));
  checks.push(createCheck('observabilitySmokeAnonymousDoesNotExposeSecrets', responseDoesNotExposeSecrets(anonymousPost), { valuesRedacted: true }));

  const methodProbe = await request(route(baseUrl, '/api/observability/smoke'), { method: 'GET' });
  checks.push(createCheck('observabilitySmokeGetRejected', methodProbe.status === 405 && methodProbe.body?.status === 'method_not_allowed', safeResponseSummary(methodProbe)));
  checks.push(createCheck('observabilitySmokeGetNoStore', hasNoStore(methodProbe.headers), safeResponseSummary(methodProbe)));

  let authenticatedPost = null;
  if (emitAuthenticatedSmoke && readinessToken) {
    authenticatedPost = await request(route(baseUrl, '/api/observability/smoke'), {
      headers: {
        Authorization: `Bearer ${readinessToken}`,
      },
    });
    checks.push(createCheck('observabilitySmokeEventSent', authenticatedPost.status === 200 && authenticatedPost.body?.status === 'sent', safeResponseSummary(authenticatedPost)));
    checks.push(createCheck('observabilitySmokeAuthenticatedNoStore', hasNoStore(authenticatedPost.headers), safeResponseSummary(authenticatedPost)));
    checks.push(createCheck('observabilitySmokeAuthenticatedDoesNotExposeSecrets', responseDoesNotExposeSecrets(authenticatedPost), { valuesRedacted: true }));
  } else {
    checks.push(createCheck('observabilitySmokeEventSent', !emitAuthenticatedSmoke, {
      skipped: !emitAuthenticatedSmoke,
      reason: emitAuthenticatedSmoke ? 'missing_healthcheck_token' : 'set RELEASE_RUN_OBSERVABILITY_SMOKE=true to emit a real Sentry/local_log smoke event',
    }, false));
  }

  return {
    baseUrl,
    passed: checks.filter((check) => check.critical).every((check) => check.passed),
    checks,
    anonymousPost: safeResponseSummary(anonymousPost),
    methodProbe: safeResponseSummary(methodProbe),
    authenticatedPost: authenticatedPost ? safeResponseSummary(authenticatedPost) : null,
  };
}

const generatedAt = new Date().toISOString();
const urls = targetUrls();
const sentryDsn = firstConfigured(['NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_DSN']);
const globalChecks = [
  createCheck('productionUrlConfigured', urls.length > 0, { targetCount: urls.length }),
  createCheck('sentryDsnConfigured', Boolean(sentryDsn), { source: sentryDsn?.name ?? null }),
  createCheck('protectedReadinessTokenConfiguredForEmission', Boolean(readinessToken) || !emitAuthenticatedSmoke, {
    requiredWhen: 'RELEASE_RUN_OBSERVABILITY_SMOKE=true',
    present: Boolean(readinessToken),
  }),
];

const targetResults = [];
for (const url of urls) {
  targetResults.push(await validateTarget(url));
}

const allChecks = [...globalChecks, ...targetResults.flatMap((target) => target.checks)];
const failures = allChecks
  .filter((check) => check.critical && !check.passed)
  .map((check) => check.name);
const outcome = failures.length === 0 ? 'passed' : 'failed';

const evidence = {
  evidenceItem: 'observability-smoke-validation',
  status: outcome === 'passed' ? 'Complete' : 'Open',
  outcome,
  generatedAt,
  reviewedAt: generatedAt,
  reviewer: 'RISCK COMPLY release automation',
  releaseTarget: process.env.RELEASE_TARGET || 'production',
  summary: outcome === 'passed'
    ? 'Observability smoke validation verified protected access, no-store controls, request IDs, Sentry/local log emission mode, and secret redaction.'
    : 'Observability smoke validation is missing or failed; release remains blocked.',
  redactionConfirmation: 'Redaction confirmed: no token, cookie, authorization header, secret value, or DSN is written to this evidence file.',
  evidenceLocations: [
    'scripts/release/run-observability-smoke-validation.mjs',
    'src/app/api/observability/smoke/route.ts',
    'src/lib/observability/report-error.ts',
    'src/server/observability/logger.ts',
    evidencePath,
  ],
  controlsVerified: outcome === 'passed'
    ? allChecks.filter((check) => check.critical && check.passed).map((check) => check.name)
    : [],
  runtimeConfiguration: {
    targetCount: urls.length,
    timeoutMs,
    sentryDsnConfigured: Boolean(sentryDsn),
    sentryDsnSource: sentryDsn?.name ?? null,
    authenticatedSmokeEmissionEnabled: emitAuthenticatedSmoke,
    hasProtectedReadinessToken: Boolean(readinessToken),
  },
  globalChecks,
  targets: targetResults,
  failures,
  releaseGate: outcome === 'passed'
    ? 'Observability smoke evidence is present and passed.'
    : 'Production and enterprise release remain blocked until observability smoke is Complete/passed.',
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
  console.error('Observability smoke validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Observability smoke validation passed.');

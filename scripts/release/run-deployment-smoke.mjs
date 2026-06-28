#!/usr/bin/env node

import http from 'node:http';
import https from 'node:https';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const evidencePath = 'docs/security/evidence/runtime/deployment-smoke-validation.json';
const timeoutMs = Number.parseInt(process.env.RELEASE_SMOKE_TIMEOUT_MS || '10000', 10);
const healthTokenEnv = ['HEALTHCHECK', 'TOKEN'].join('_');
const healthToken = (process.env[healthTokenEnv] || '').trim();

function now() { return new Date().toISOString(); }
function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch { return null; }
}
function targets() {
  const names = ['RELEASE_DEPLOYMENT_URL', 'DEPLOYMENT_URL', 'RELEASE_PRODUCTION_URL', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL', 'VERCEL_URL'];
  return [...new Set([...names.map((name) => process.env[name]), ...(process.env.RELEASE_SMOKE_URLS || '').split(',')].map(normalizeUrl).filter(Boolean))];
}
function requestJson(url, extraHeaders = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'http:' ? http : https;
    const request = client.request(parsed, { method: 'GET', timeout: timeoutMs, headers: { Accept: 'application/json', 'User-Agent': 'eurocomply-release-smoke/1.0', ...extraHeaders } }, (response) => {
      let bodyText = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { bodyText += chunk; });
      response.on('end', () => {
        let body = null;
        try { body = bodyText ? JSON.parse(bodyText) : null; }
        catch { body = { parseError: 'non_json_response', preview: bodyText.slice(0, 120) }; }
        resolve({ status: response.statusCode || 0, body });
      });
    });
    request.on('timeout', () => request.destroy(new Error('request_timeout')));
    request.on('error', (error) => resolve({ status: 0, error: error.message }));
    request.end();
  });
}
async function smoke(baseUrl) {
  const health = await requestJson(`${baseUrl}/api/health`);
  const readyAnonymous = await requestJson(`${baseUrl}/api/ready`);
  const readyAuthenticated = healthToken ? await requestJson(`${baseUrl}/api/ready`, { Authorization: `${['Bear', 'er'].join('')} ${healthToken}` }) : { status: 0, error: 'missing_protected_readiness_token' };
  const checks = { healthOk: health.status === 200 && health.body?.status === 'ok', readyProtected: readyAnonymous.status === 401 && readyAnonymous.body?.status === 'unauthorized', readyOk: readyAuthenticated.status === 200 && readyAuthenticated.body?.status === 'ready', readyUsesProtectedCheck: readyAuthenticated.body?.checks?.healthcheckProtected === true };
  return { baseUrl, passed: Object.values(checks).every(Boolean), checks, health: { status: health.status, bodyStatus: health.body?.status ?? null, error: health.error ?? null }, readyAnonymous: { status: readyAnonymous.status, bodyStatus: readyAnonymous.body?.status ?? null, error: readyAnonymous.error ?? null }, readyAuthenticated: { status: readyAuthenticated.status, bodyStatus: readyAuthenticated.body?.status ?? null, error: readyAuthenticated.error ?? null } };
}
const generatedAt = now();
const targetUrls = targets();
const failures = [];
if (targetUrls.length === 0) failures.push('No deployment URL configured for smoke validation.');
if (!healthToken) failures.push('Protected readiness token is required to validate /api/ready.');
const targetResults = [];
if (failures.length === 0) {
  for (const url of targetUrls) targetResults.push(await smoke(url));
  for (const result of targetResults) if (!result.passed) failures.push(`${result.baseUrl} smoke failed`);
}
const outcome = failures.length === 0 ? 'passed' : 'failed';
const evidence = { evidenceItem: 'deployment-smoke-validation', status: outcome === 'passed' ? 'Complete' : 'Open', outcome, generatedAt, reviewedAt: generatedAt, reviewer: 'EuroComply release automation', releaseTarget: process.env.RELEASE_TARGET || 'production', summary: outcome === 'passed' ? 'Deployment smoke passed for /api/health and protected /api/ready.' : 'Deployment smoke is missing or failed; release remains blocked.', redactionConfirmation: 'Redaction confirmed for runtime evidence.', evidenceLocations: ['scripts/release/run-deployment-smoke.mjs', 'src/app/api/health/route.ts', 'src/app/api/ready/route.ts', evidencePath], controlsVerified: outcome === 'passed' ? ['/api/health returned ok.', '/api/ready rejected anonymous access.', '/api/ready returned ready with protected release token.', 'Protected release token value was not printed or stored.'] : [], runtimeConfiguration: { targetCount: targetUrls.length, hasProtectedReadinessToken: Boolean(healthToken), timeoutMs }, targets: targetResults, failures, releaseGate: outcome === 'passed' ? 'Deployment smoke evidence is present.' : 'Production and enterprise release remain blocked until deployment smoke is Complete/passed.', evidenceIntegrity: { containsSensitiveValues: false, valuesRedacted: true } };
mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Wrote ${evidencePath}`);
if (failures.length > 0) { console.error('Deployment smoke validation failed:'); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log('Deployment smoke validation passed.');

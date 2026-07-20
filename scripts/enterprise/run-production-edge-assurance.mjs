#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const targetSha = process.env.TARGET_SHA || process.env.GITHUB_SHA || '';
const productionUrl = process.env.PRODUCTION_URL || '';
const outputPath = process.env.EDGE_ASSURANCE_EVIDENCE_PATH || 'docs/security/evidence/runtime/production-edge-assurance.json';
const maxResponseBytes = 1024 * 1024;
const timeoutMs = 15_000;

if (!/^[0-9a-f]{40}$/i.test(targetSha)) throw new Error('TARGET_SHA must be a full Git SHA.');
const baseUrl = new URL(productionUrl);
if (baseUrl.protocol !== 'https:') throw new Error('PRODUCTION_URL must use HTTPS.');
if (baseUrl.username || baseUrl.password) throw new Error('PRODUCTION_URL must not contain credentials.');

async function boundedRequest(pathname, init = {}) {
  const response = await fetch(new URL(pathname, baseUrl), {
    ...init,
    redirect: 'manual',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'user-agent': 'risck-comply-edge-assurance/1.0', ...(init.headers || {}) },
  });
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxResponseBytes) throw new Error(`Response too large for ${pathname}.`);
  const body = new Uint8Array(await response.arrayBuffer());
  if (body.byteLength > maxResponseBytes) throw new Error(`Response too large for ${pathname}.`);
  return { response, text: new TextDecoder().decode(body) };
}

const requiredSecurityHeaders = [
  'content-security-policy',
  'strict-transport-security',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
];

const landing = await boundedRequest('/en');
const health = await boundedRequest('/api/health');
const securityTxt = await boundedRequest('/.well-known/security.txt');
const vulnerability = await boundedRequest('/en/security');
const trust = await boundedRequest('/en/trust');

const headers = Object.fromEntries(requiredSecurityHeaders.map((name) => [name, landing.response.headers.has(name)]));
const cacheControl = health.response.headers.get('cache-control') || '';
const providerSignals = ['server', 'cf-ray', 'x-vercel-id', 'x-served-by', 'via']
  .filter((name) => landing.response.headers.has(name));

const burstStatuses = [];
for (let index = 0; index < 12; index += 1) {
  const result = await boundedRequest('/api/health', { headers: { 'x-edge-proof-sequence': String(index) } });
  burstStatuses.push(result.response.status);
}

const checks = {
  httpsOnly: baseUrl.protocol === 'https:',
  landingReachable: landing.response.status >= 200 && landing.response.status < 400,
  healthReachable: health.response.status === 200,
  securityHeaders: Object.values(headers).every(Boolean),
  healthNoStore: /no-store/i.test(cacheControl),
  securityTxtPublished: securityTxt.response.status === 200 && /contact:/i.test(securityTxt.text),
  vulnerabilityPagePublished: vulnerability.response.status >= 200 && vulnerability.response.status < 400,
  trustCenterPublished: trust.response.status >= 200 && trust.response.status < 400,
  edgeProviderObservable: providerSignals.length > 0,
  boundedBurstHandled: burstStatuses.every((status) => status >= 200 && status < 500),
};

const complete = Object.values(checks).every(Boolean);
const evidence = {
  schema: 'risck-comply.production-edge-assurance.v1',
  status: complete ? 'Complete' : 'Open',
  outcome: complete ? 'passed' : 'not_verified',
  generatedFromRealEvidence: true,
  source: 'protected-production-edge-assurance',
  repository: process.env.GITHUB_REPOSITORY || null,
  targetSha: targetSha.toLowerCase(),
  workflowRunId: process.env.GITHUB_RUN_ID || null,
  generatedAt: new Date().toISOString(),
  checks,
  observations: {
    securityHeaderPresence: headers,
    observedEdgeHeaderNames: providerSignals.sort(),
    burstStatusClasses: burstStatuses.map((status) => Math.floor(status / 100)),
  },
  externalAssurance: {
    independentSecurityReview: 'NOT_VERIFIED',
    penetrationTest: 'NOT_VERIFIED',
    note: 'Independent review and penetration testing require third-party evidence and are never inferred from automated checks.',
  },
  redaction: {
    storesProductionUrl: false,
    storesResponseBodies: false,
    storesTokens: false,
    storesCustomerData: false,
  },
  limitations: [
    'This proves public production edge behavior for one exact SHA only.',
    'Provider headers are observability signals, not proof of a particular paid WAF or DDoS service tier.',
    'Automated checks do not replace an independent security review or penetration test.',
  ],
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
if (!complete) process.exitCode = 1;

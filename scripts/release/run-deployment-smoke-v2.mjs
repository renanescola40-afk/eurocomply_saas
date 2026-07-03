#!/usr/bin/env node
import http from 'node:http';
import https from 'node:https';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const evidencePath = 'docs/security/evidence/runtime/deployment-smoke-validation.json';
const timeoutMs = Number(process.env.RELEASE_SMOKE_TIMEOUT_MS || 10000);
const maxRedirects = Number(process.env.RELEASE_SMOKE_MAX_REDIRECTS || 5);
const locale = (process.env.RELEASE_SMOKE_LOCALE || 'pt').replace(/[^a-z-]/gi, '') || 'pt';
const token = first(['HEALTHCHECK_TOKEN', 'RELEASE_HEALTHCHECK_TOKEN', 'INTERNAL_HEALTHCHECK_TOKEN', 'INTERNAL_CRON_SECRET', 'CRON_SECRET'])?.value || '';
const headerChecks = [
  ['content-security-policy', (v) => v.includes("default-src 'self'")],
  ['x-frame-options', (v) => v.toLowerCase() === 'deny'],
  ['x-content-type-options', (v) => v.toLowerCase() === 'nosniff'],
  ['strict-transport-security', (v) => v.toLowerCase().includes('max-age=')],
  ['referrer-policy', (v) => v.length > 0],
  ['permissions-policy', (v) => v.length > 0],
];
const markers = [token, process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.STRIPE_SECRET_KEY, process.env.STRIPE_WEBHOOK_SECRET, process.env.UPSTASH_REDIS_REST_TOKEN, process.env.SENTRY_AUTH_TOKEN, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY].filter(Boolean);

function now() { return new Date().toISOString(); }
function first(names) { for (const name of names) { const value = String(process.env[name] || '').trim(); if (value) return { name, value }; } return null; }
function norm(value) { const raw = String(value || '').trim(); if (!raw) return null; try { const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); url.search = ''; url.hash = ''; return url.toString().replace(/\/$/, ''); } catch { return null; } }
function h(headers, name) { const value = headers[name.toLowerCase()]; return Array.isArray(value) ? value.join(', ') : String(value || ''); }
function noStore(headers) { return /\bno-store\b/i.test(h(headers, 'cache-control')); }
function route(base, path) { return new URL(path, `${base}/`).toString(); }
function check(name, passed, details = {}, critical = true) { return { name, critical, passed: Boolean(passed), details }; }
function safeLoc(location) { if (!location) return null; try { const url = location.startsWith('http') ? new URL(location) : new URL(location, 'https://example.invalid'); return `${url.pathname}${url.search ? '?<query-redacted>' : ''}`; } catch { return location.split('?')[0]; } }
function brief(res) { return { status: res.status, error: res.error || null, contentType: h(res.headers, 'content-type') || null, cacheControl: h(res.headers, 'cache-control') || null, location: safeLoc(h(res.headers, 'location')), bodyStatus: res.body?.status || null, redirects: (res.redirects || []).map((r) => ({ status: r.status, from: safeLoc(r.from), to: safeLoc(r.to), followed: r.followed, reason: r.reason })) }; }
function parse(text, headers) { if (!h(headers, 'content-type').includes('application/json') && !text.trim().startsWith('{')) return null; try { return text ? JSON.parse(text) : null; } catch { return { parseError: 'non_json_response' }; } }
function redacted(body) { const serialized = JSON.stringify(body || {}); return markers.every((marker) => !serialized.includes(marker)); }
function group(body, name) { return Array.isArray(body?.environment) ? body.environment.find((item) => item?.name === name) : null; }
function groupOk(body, name) { const item = group(body, name); return item?.configured === true && item?.missingCount === 0; }
function loginRedirect(location) { if (!location) return false; try { const url = location.startsWith('http') ? new URL(location) : new URL(location, 'https://example.invalid'); return url.pathname === `/${locale}/login` && url.searchParams.has('next'); } catch { return location.includes(`/${locale}/login`) && location.includes('next='); } }
function targets() { return [...new Set(['RELEASE_DEPLOYMENT_URL', 'DEPLOYMENT_URL', 'RELEASE_PRODUCTION_URL', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL', 'VERCEL_URL'].map((name) => process.env[name]).concat((process.env.RELEASE_SMOKE_URLS || '').split(',')).map(norm).filter(Boolean))]; }
function meta() { return { commit: first(['RELEASE_COMMIT_SHA', 'GITHUB_SHA', 'VERCEL_GIT_COMMIT_SHA']), build: first(['RELEASE_BUILD_SHA', 'NEXT_PUBLIC_BUILD_SHA', 'NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', 'VERCEL_GIT_COMMIT_SHA', 'GITHUB_SHA']), rollback: first(['RELEASE_ROLLBACK_TARGET_URL', 'RELEASE_ROLLBACK_TARGET', 'ROLLBACK_TARGET_URL', 'ROLLBACK_TARGET', 'LAST_KNOWN_GOOD_DEPLOYMENT_URL', 'VERCEL_ROLLBACK_DEPLOYMENT_URL']) }; }
function shouldFollow(currentUrl, nextUrl, mode) { if (!nextUrl) return { follow: false, reason: 'invalid_location' }; if (mode === false) return { follow: false, reason: 'disabled' }; if (mode === true) return { follow: true, reason: 'standard' }; const current = new URL(currentUrl); const canonical = current.pathname === nextUrl.pathname && current.search === nextUrl.search && current.origin !== nextUrl.origin; return { follow: mode === 'canonical' && canonical, reason: canonical ? 'canonical_host' : 'target_redirect' }; }

function request(url, options = {}, redirects = []) {
  const { method = 'GET', accept = 'text/html', headers = {}, followRedirects = true } = options;
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const req = (parsed.protocol === 'http:' ? http : https).request(parsed, { method, timeout: timeoutMs, headers: { Accept: accept, 'User-Agent': 'risck-comply-release-smoke/4.2', ...headers } }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', async () => {
        const status = res.statusCode || 0;
        const location = h(res.headers, 'location');
        const nextUrl = location ? new URL(location, url) : null;
        if ([301, 302, 303, 307, 308].includes(status) && location && redirects.length < maxRedirects) {
          const decision = shouldFollow(url, nextUrl, followRedirects);
          const chain = [...redirects, { status, from: url, to: nextUrl?.toString() || location, followed: decision.follow, reason: decision.reason }];
          if (decision.follow) return resolve(await request(nextUrl.toString(), options, chain));
          return resolve({ status, headers: res.headers, body: parse(text, res.headers), redirects: chain });
        }
        return resolve({ status, headers: res.headers, body: parse(text, res.headers), redirects });
      });
    });
    req.on('timeout', () => req.destroy(new Error('request_timeout')));
    req.on('error', (error) => resolve({ status: 0, headers: {}, body: null, redirects, error: error.message }));
    req.end();
  });
}

async function smoke(baseUrl) {
  const checks = [];
  const publicPages = [
    ['landingPublicLoads', `/${locale}`],
    ['pricingPublicLoads', `/${locale}/pricing`],
    ['trustPublicLoads', `/${locale}/trust`],
    ['loginPublicLoads', `/${locale}/login`],
    ['signupPublicLoads', `/${locale}/signup`],
  ];
  const pages = [];
  for (const [name, path] of publicPages) { const res = await request(route(baseUrl, path)); const passed = res.status === 200 && h(res.headers, 'content-type').includes('text/html'); pages.push({ name, path, passed, status: res.status }); checks.push(check(name, passed, { path, ...brief(res) })); }
  checks.push(check('publicLaunchPagesLoad', pages.every((p) => p.passed), { pages }));
  const landing = await request(route(baseUrl, `/${locale}`));
  checks.push(check('securityHeadersPresent', headerChecks.every(([name, validate]) => { const value = h(landing.headers, name); return Boolean(value) && validate(value); }), { headers: Object.fromEntries(headerChecks.map(([name]) => [name, h(landing.headers, name) ? 'present' : 'missing'])), landing: brief(landing) }));
  const health = await request(route(baseUrl, '/api/health'), { accept: 'application/json' });
  checks.push(check('healthEndpointOk', health.status === 200 && health.body?.status === 'ok', brief(health)));
  checks.push(check('healthEndpointNoStore', noStore(health.headers), brief(health)));
  const readyAnonymous = await request(route(baseUrl, '/api/ready'), { accept: 'application/json' });
  checks.push(check('readyEndpointRejectsAnonymous', readyAnonymous.status === 401 && readyAnonymous.body?.status === 'unauthorized', brief(readyAnonymous)));
  checks.push(check('readyEndpointAnonymousNoStore', noStore(readyAnonymous.headers), brief(readyAnonymous)));
  const ready = token ? await request(route(baseUrl, '/api/ready'), { accept: 'application/json', headers: { Authorization: `Bearer ${token}` } }) : { status: 0, headers: {}, body: null, error: 'missing_protected_readiness_token', redirects: [] };
  checks.push(check('readyEndpointOkWithToken', ready.status === 200 && ready.body?.status === 'ready', brief(ready)));
  checks.push(check('readyEndpointTokenNoStore', noStore(ready.headers), brief(ready)));
  checks.push(check('readyEndpointDoesNotExposeSecrets', redacted(ready.body), { valuesRedacted: true }));
  checks.push(check('supabaseEnvironmentConfigured', groupOk(ready.body, 'supabase'), { group: group(ready.body, 'supabase') || null }));
  checks.push(check('stripeEnvironmentConfigured', groupOk(ready.body, 'stripe'), { group: group(ready.body, 'stripe') || null }));
  checks.push(check('stripeApiReachable', ready.body?.checks?.stripeApiReachable === true, { stripe: ready.body?.stripe || null }));
  checks.push(check('sentryObservabilityConfigured', ready.body?.checks?.sentryObservabilityConfigured === true, { group: group(ready.body, 'sentry') || null }));
  checks.push(check('databaseReachable', ready.body?.checks?.databaseReachable === true, { database: ready.body?.database || null }));
  checks.push(check('enterpriseStorageScannerReady', ready.body?.checks?.enterpriseStorageScannerConfigured === true, { enterpriseStorageScanner: ready.body?.enterpriseStorageScanner || null }));
  const protectedRoutes = [[`/${locale}/dashboard`, 'dashboardRequiresAuthentication'], [`/${locale}/dashboard/organizations`, 'organizationDashboardRequiresAuthentication']];
  const protectedResults = [];
  for (const [path, name] of protectedRoutes) { const res = await request(route(baseUrl, path), { followRedirects: 'canonical' }); const redirectsToLogin = [301, 302, 303, 307, 308].includes(res.status) && loginRedirect(h(res.headers, 'location')); const routeNoStore = noStore(res.headers); protectedResults.push({ path, redirectsToLogin, noStore: routeNoStore, status: res.status }); checks.push(check(name, redirectsToLogin, { path, ...brief(res) })); checks.push(check(`${name}NoStore`, routeNoStore, { path, cacheControl: h(res.headers, 'cache-control') || null })); }
  checks.push(check('privateRoutesHaveNoStore', protectedResults.every((item) => item.noStore), { routes: protectedResults }));
  const obs = await request(route(baseUrl, '/api/observability/smoke'), { method: 'POST', accept: 'application/json', headers: { Origin: baseUrl } });
  checks.push(check('observabilitySmokeRejectsAnonymous', obs.status === 401 && obs.body?.status === 'unauthorized', brief(obs)));
  checks.push(check('observabilitySmokeNoStore', noStore(obs.headers), brief(obs)));
  checks.push(check('sensitiveApisHaveNoStore', [health, readyAnonymous, ready, obs].every((res) => noStore(res.headers)), { apis: [health, readyAnonymous, ready, obs].map((res) => ({ status: res.status, noStore: noStore(res.headers) })) }));
  if (process.env.RELEASE_RUN_OBSERVABILITY_SMOKE === 'true' && token) { const sent = await request(route(baseUrl, '/api/observability/smoke'), { method: 'POST', accept: 'application/json', headers: { Authorization: `Bearer ${token}`, Origin: baseUrl } }); checks.push(check('observabilitySmokeSent', sent.status === 200 && sent.body?.status === 'sent', brief(sent))); } else checks.push(check('observabilitySmokeSent', process.env.RELEASE_RUN_OBSERVABILITY_SMOKE !== 'true', { skipped: process.env.RELEASE_RUN_OBSERVABILITY_SMOKE !== 'true' }, false));
  return { baseUrl, passed: checks.filter((item) => item.critical).every((item) => item.passed), detailedChecks: checks, checks: Object.fromEntries(checks.map((item) => [item.name, item.passed])) };
}

async function rollbackCheck(data) { const value = data.rollback?.value; const url = norm(value); if (!value) return check('rollbackTargetConfigured', false, { configured: false }); if (!url) return check('rollbackTargetConfigured', false, { source: data.rollback.name, networkVerified: false }); const res = await request(route(url, '/api/health'), { accept: 'application/json' }); return check('rollbackTargetConfigured', res.status === 200 && res.body?.status === 'ok', { source: data.rollback.name, networkVerified: true, targetStatus: res.status, targetBodyStatus: res.body?.status || null }); }

const generatedAt = now();
const data = meta();
const urls = targets();
const globalChecks = [check('productionUrlConfigured', urls.length > 0, { targetCount: urls.length }), check('protectedReadinessTokenConfigured', Boolean(token), { present: Boolean(token) }), check('lastCommitValidated', Boolean(data.commit?.value), { source: data.commit?.name || null, sha: data.commit?.value || null }), check('buildShaRegistered', Boolean(data.build?.value), { source: data.build?.name || null, sha: data.build?.value || null }), await rollbackCheck(data)];
const results = [];
for (const url of urls) results.push(await smoke(url));
const all = [...globalChecks, ...results.flatMap((target) => target.detailedChecks)];
const failures = all.filter((item) => item.critical && !item.passed).map((item) => item.name);
const outcome = failures.length ? 'failed' : 'passed';
const evidence = { evidenceItem: 'deployment-smoke-validation', status: outcome === 'passed' ? 'Complete' : 'Open', outcome, generatedAt, reviewedAt: generatedAt, reviewer: 'RISCK COMPLY release automation', releaseTarget: process.env.RELEASE_TARGET || 'production', summary: outcome === 'passed' ? 'Production deployment smoke passed.' : 'Production deployment smoke is missing or failed; release remains blocked.', redactionConfirmation: 'No token, cookie, authorization header, secret value, or secret environment variable name is written to this evidence file.', evidenceLocations: ['scripts/release/run-deployment-smoke.mjs', 'scripts/release/run-deployment-smoke-v2.mjs', 'src/middleware.ts', 'src/app/api/health/route.ts', 'src/app/api/ready/route.ts', 'src/app/api/observability/smoke/route.ts', evidencePath], controlsVerified: outcome === 'passed' ? all.filter((item) => item.critical && item.passed).map((item) => item.name) : [], runtimeConfiguration: { targetCount: urls.length, hasProtectedReadinessToken: Boolean(token), timeoutMs, locale, maxRedirects, rollbackTargetConfigured: Boolean(data.rollback?.value), commitShaSource: data.commit?.name || null, buildShaSource: data.build?.name || null }, globalChecks, smokeTargets: { passed: results.filter((target) => target.passed).map((target) => target.baseUrl), failed: results.filter((target) => !target.passed).map((target) => target.baseUrl) }, targets: results, failures, releaseGate: outcome === 'passed' ? 'Deployment smoke evidence is present and passed.' : 'Production and enterprise release remain blocked until deployment smoke is Complete/passed.', evidenceIntegrity: { containsSensitiveValues: false, valuesRedacted: true, authorizationHeaderStored: false, cookiesStored: false } };
mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Wrote ${evidencePath}`);
if (failures.length) { console.error('Deployment smoke validation failed:'); for (const item of failures) console.error(`- ${item}`); process.exit(1); }
console.log('Deployment smoke validation passed.');

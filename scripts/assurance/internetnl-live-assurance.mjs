#!/usr/bin/env node

const domain = (process.env.INTERNETNL_DOMAIN || 'www.risckcomply.com').trim().toLowerCase();
const base = new URL(process.env.INTERNETNL_BASE_URL || 'https://internet.nl');
const timeoutMs = Number(process.env.INTERNETNL_TIMEOUT_MS || 240_000);
const pollMs = Number(process.env.INTERNETNL_POLL_MS || 5_000);

if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
  throw new Error('INTERNETNL_DOMAIN must be a valid hostname.');
}
if (base.protocol !== 'https:') throw new Error('INTERNETNL_BASE_URL must use HTTPS.');

const userAgent = 'risck-comply-internetnl-assurance/1.0';
const deadline = Date.now() + timeoutMs;

async function request(pathname, init = {}) {
  return fetch(new URL(pathname, base), {
    ...init,
    redirect: init.redirect || 'manual',
    signal: AbortSignal.timeout(20_000),
    headers: {
      'user-agent': userAgent,
      accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
      ...(init.headers || {}),
    },
  });
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function boundedTechnicalData(value) {
  if (value === undefined || value === null) return null;
  const serialized = JSON.stringify(value);
  if (serialized.length <= 8_000) return value;
  return { truncated: true, preview: serialized.slice(0, 8_000) };
}

function collectFindings(value, path = '$', findings = []) {
  if (!value || typeof value !== 'object') return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectFindings(item, `${path}[${index}]`, findings));
    return findings;
  }

  if (Object.hasOwn(value, 'status') || Object.hasOwn(value, 'verdict')) {
    const status = value.status ?? null;
    findings.push({
      path,
      status,
      verdict: typeof value.verdict === 'string' ? value.verdict : null,
      score: typeof value.score === 'number' ? value.score : null,
      technicalData: status === 1 ? null : boundedTechnicalData(value.tech_data),
    });
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === 'tech_data') continue;
    collectFindings(child, `${path}.${key}`, findings);
  }
  return findings;
}

// Internet.nl's public single-domain UI starts/reuses the probes when this
// canonical route is requested. No account, token or privileged API is used.
const start = await request(`/site/${domain}/`, { redirect: 'follow' });
if (!start.ok) throw new Error(`Internet.nl start request failed with HTTP ${start.status}.`);

let statuses = [];
while (Date.now() < deadline) {
  const probeResponse = await request(`/site/probes/${domain}/`, { redirect: 'follow' });
  if (!probeResponse.ok) throw new Error(`Internet.nl probe status failed with HTTP ${probeResponse.status}.`);
  const body = await probeResponse.json();
  if (!Array.isArray(body)) throw new Error('Internet.nl probe status did not return an array.');
  statuses = body.map((item) => ({
    name: String(item?.name || ''),
    done: Boolean(item?.done),
    success: Boolean(item?.success),
  }));
  if (statuses.length > 0 && statuses.every((item) => item.done)) break;
  await sleep(pollMs);
}

if (statuses.length === 0 || !statuses.every((item) => item.done)) {
  throw new Error('Internet.nl probes did not finish before the timeout.');
}

const subtestFindings = {};
for (const probe of ['ipv6', 'dnssec', 'tls', 'appsecpriv', 'rpki']) {
  const detailResponse = await request(`/site/${probe}/${domain}/`, { redirect: 'follow' });
  if (!detailResponse.ok) throw new Error(`Internet.nl ${probe} details failed with HTTP ${detailResponse.status}.`);
  const detail = await detailResponse.json();
  subtestFindings[probe] = collectFindings(detail);
}

const currentResult = await request(`/site/${domain}/results`, { redirect: 'manual' });
const location = currentResult.headers.get('location');
if (currentResult.status < 300 || currentResult.status >= 400 || !location) {
  throw new Error(`Internet.nl current result did not redirect to a persistent report (HTTP ${currentResult.status}).`);
}

const reportUrl = new URL(location, base);
if (reportUrl.origin !== base.origin || !reportUrl.pathname.startsWith(`/site/${domain}/`)) {
  throw new Error('Internet.nl returned an unexpected persistent report URL.');
}

const reportResponse = await fetch(reportUrl, {
  redirect: 'follow',
  signal: AbortSignal.timeout(20_000),
  headers: { 'user-agent': userAgent, accept: 'text/html' },
});
if (!reportResponse.ok) throw new Error(`Internet.nl report request failed with HTTP ${reportResponse.status}.`);
const html = await reportResponse.text();

const scoreMatch = html.match(/data-resultscore=["'](\d{1,3})["']/i);
if (!scoreMatch) throw new Error('Could not extract Internet.nl result score.');
const score = Number(scoreMatch[1]);

const categories = {};
for (const probe of ['siteipv6', 'sitednssec', 'sitetls', 'siteappsecpriv', 'siterpki']) {
  const escaped = probe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<li[^>]*class=["'][^"']*main-item\\s+([^"']+)["'][^>]*id=["']${escaped}-results["']`, 'i'));
  categories[probe] = match ? match[1].trim().split(/\s+/)[0] : 'unknown';
}

const evidence = {
  schema: 'risck-comply.internetnl.website.v1',
  generatedAt: new Date().toISOString(),
  generatedFromRealEvidence: true,
  source: 'internet.nl-public-single-domain-test',
  domain,
  score,
  perfectScore: score === 100,
  reportUrl: reportUrl.toString(),
  probeStatuses: statuses,
  categoryVerdicts: categories,
  subtestFindings,
  claims: {
    internetNl100Website: score === 100 ? 'VERIFIED_FOR_THIS_REPORT' : 'NOT_VERIFIED',
    hallOfFame: 'NOT_VERIFIED',
  },
  redaction: {
    responseBodiesStored: false,
    technicalDataStored: 'bounded-public-nonpassing-findings-only',
    credentialsStored: false,
    customerDataStored: false,
  },
  limitations: [
    'This evidence reflects one Internet.nl report and can become stale when DNS, routing, TLS or edge configuration changes.',
    'A score of 100 must not be presented as a certification by Internet.nl.',
    'Hall of Fame presence is not inferred from the score and requires separate public verification.',
  ],
};

// Emit evidence only to stdout. The GitHub Actions workflow owns the fixed,
// repository-controlled artifact path and persists this stream with mode 0600.
// This keeps network-derived content out of direct Node.js filesystem sinks.
process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);

console.error(`Internet.nl website score for ${domain}: ${score}%`);
console.error(`Persistent report: ${reportUrl}`);
for (const [name, verdict] of Object.entries(categories)) console.error(`${name}: ${verdict}`);
for (const [probe, findings] of Object.entries(subtestFindings)) {
  const nonPassing = findings.filter((item) => item.status !== 1 && item.status !== 'passed');
  console.error(`${probe}: ${findings.length} findings, ${nonPassing.length} non-passing/notice findings`);
}

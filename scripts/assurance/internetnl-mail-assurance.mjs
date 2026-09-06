#!/usr/bin/env node

const domain = (process.env.INTERNETNL_MAIL_DOMAIN || 'risckcomply.com').trim().toLowerCase();
const base = new URL(process.env.INTERNETNL_BASE_URL || 'https://internet.nl');
const timeoutMs = Number(process.env.INTERNETNL_TIMEOUT_MS || 300_000);
const pollMs = Number(process.env.INTERNETNL_POLL_MS || 5_000);

if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
  throw new Error('INTERNETNL_MAIL_DOMAIN must be a valid domain.');
}
if (base.protocol !== 'https:') throw new Error('INTERNETNL_BASE_URL must use HTTPS.');

const userAgent = 'risck-comply-internetnl-mail-assurance/1.0';
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

// Internet.nl's public single-domain mail route starts/reuses the probes.
// No account, token, mailbox access or outbound email is required.
const start = await request(`/mail/${domain}/`, { redirect: 'follow' });
if (!start.ok) throw new Error(`Internet.nl mail start request failed with HTTP ${start.status}.`);

let statuses = [];
while (Date.now() < deadline) {
  const probeResponse = await request(`/mail/probes/${domain}/`, { redirect: 'follow' });
  if (!probeResponse.ok) throw new Error(`Internet.nl mail probe status failed with HTTP ${probeResponse.status}.`);
  const body = await probeResponse.json();
  if (!Array.isArray(body)) throw new Error('Internet.nl mail probe status did not return an array.');
  statuses = body.map((item) => ({
    name: String(item?.name || ''),
    done: Boolean(item?.done),
    success: Boolean(item?.success),
  }));
  if (statuses.length > 0 && statuses.every((item) => item.done)) break;
  await sleep(pollMs);
}

if (statuses.length === 0 || !statuses.every((item) => item.done)) {
  throw new Error('Internet.nl mail probes did not finish before the timeout.');
}

const subtestFindings = {};
for (const probe of ['ipv6', 'auth', 'dnssec', 'tls']) {
  const detailResponse = await request(`/mail/${probe}/${domain}/`, { redirect: 'follow' });
  if (!detailResponse.ok) throw new Error(`Internet.nl mail ${probe} details failed with HTTP ${detailResponse.status}.`);
  subtestFindings[probe] = collectFindings(await detailResponse.json());
}

const currentResult = await request(`/mail/${domain}/results`, { redirect: 'manual' });
const location = currentResult.headers.get('location');
if (currentResult.status < 300 || currentResult.status >= 400 || !location) {
  throw new Error(`Internet.nl mail current result did not redirect to a persistent report (HTTP ${currentResult.status}).`);
}

const reportUrl = new URL(location, base);
if (reportUrl.origin !== base.origin || !reportUrl.pathname.startsWith(`/mail/${domain}/`)) {
  throw new Error('Internet.nl returned an unexpected persistent mail report URL.');
}

const reportResponse = await fetch(reportUrl, {
  redirect: 'follow',
  signal: AbortSignal.timeout(20_000),
  headers: { 'user-agent': userAgent, accept: 'text/html' },
});
if (!reportResponse.ok) throw new Error(`Internet.nl mail report request failed with HTTP ${reportResponse.status}.`);
const html = await reportResponse.text();

const scoreMatch = html.match(/data-resultscore=["'](\d{1,3})["']/i);
if (!scoreMatch) throw new Error('Could not extract Internet.nl mail result score.');
const score = Number(scoreMatch[1]);

const categories = {};
for (const probe of ['mailipv6', 'mailauth', 'maildnssec', 'mailtls', 'mailrpki']) {
  const escaped = probe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<li[^>]*class=["'][^"']*main-item\\s+([^"']+)["'][^>]*id=["']${escaped}-results["']`, 'i'));
  categories[probe] = match ? match[1].trim().split(/\s+/)[0] : 'unknown';
}

const evidence = {
  schema: 'risck-comply.internetnl.mail.v1',
  generatedAt: new Date().toISOString(),
  generatedFromRealEvidence: true,
  source: 'internet.nl-public-single-domain-mail-test',
  domain,
  score,
  perfectScore: score === 100,
  reportUrl: reportUrl.toString(),
  probeStatuses: statuses,
  categoryVerdicts: categories,
  subtestFindings,
  claims: {
    internetNl100Email: score === 100 ? 'VERIFIED_FOR_THIS_REPORT' : 'NOT_VERIFIED',
    hallOfFame: 'NOT_VERIFIED',
  },
  redaction: {
    mailboxContentAccessed: false,
    outboundEmailSent: false,
    credentialsStored: false,
    customerDataStored: false,
    technicalDataStored: 'bounded-public-nonpassing-findings-only',
  },
  limitations: [
    'This evidence reflects one Internet.nl report and can become stale when DNS, MX, SPF, DKIM, DMARC, TLS or routing changes.',
    'A score of 100 must not be presented as a certification by Internet.nl.',
    'Hall of Fame presence is not inferred from the score and requires separate public verification.',
  ],
};

process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
console.error(`Internet.nl mail score for ${domain}: ${score}%`);
console.error(`Persistent report: ${reportUrl}`);
for (const [name, verdict] of Object.entries(categories)) console.error(`${name}: ${verdict}`);
for (const [probe, findings] of Object.entries(subtestFindings)) {
  const nonPassing = findings.filter((item) => item.status !== 1 && item.status !== 'passed');
  console.error(`${probe}: ${findings.length} findings, ${nonPassing.length} non-passing/notice findings`);
}

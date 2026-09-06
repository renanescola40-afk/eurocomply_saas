#!/usr/bin/env node

const host = (process.env.TRUST_SIGNAL_HOST || 'www.risckcomply.com').trim().toLowerCase();
const repo = (process.env.TRUST_SIGNAL_REPO || 'renanescola40-afk/eurocomply_saas').trim();

if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) {
  throw new Error('TRUST_SIGNAL_HOST must be a valid hostname.');
}
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
  throw new Error('TRUST_SIGNAL_REPO must be owner/repository.');
}

const headers = {
  'user-agent': 'risck-comply-free-trust-signals/1.0',
  accept: 'application/json',
};

async function fetchJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
    headers: { ...headers, ...(init.headers || {}) },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { rawPreview: text.slice(0, 1000) };
  }
  return { ok: response.ok, status: response.status, body };
}

const greenUrl = `https://api.thegreenwebfoundation.org/api/v3/greencheck/${encodeURIComponent(host)}`;
const green = await fetchJson(greenUrl);

const observatoryUrl = `https://observatory-api.mdn.mozilla.net/api/v2/scan?host=${encodeURIComponent(host)}`;
const observatory = await fetchJson(observatoryUrl, { method: 'POST' });

const [owner, name] = repo.split('/');
const scorecardUrl = `https://api.securityscorecards.dev/projects/github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
const scorecard = await fetchJson(scorecardUrl);

const evidence = {
  schema: 'risck-comply.free-online-trust-signals.v1',
  generatedAt: new Date().toISOString(),
  generatedFromRealEvidence: true,
  host,
  repository: repo,
  greenWebFoundation: {
    requestUrl: greenUrl,
    httpStatus: green.status,
    reachable: green.ok,
    green: green.ok && typeof green.body?.green === 'boolean' ? green.body.green : null,
    provider: green.ok ? (green.body?.data?.provider || green.body?.data?.matched_provider || null) : null,
    badgeEligible: green.ok && green.body?.green === true,
    raw: green.body,
  },
  mdnHttpObservatory: {
    requestUrl: observatoryUrl,
    detailsUrl: observatory.body?.details_url || `https://developer.mozilla.org/en-US/observatory/analyze?host=${host}`,
    httpStatus: observatory.status,
    reachable: observatory.ok,
    grade: observatory.ok ? (observatory.body?.grade || null) : null,
    score: observatory.ok && typeof observatory.body?.score === 'number' ? observatory.body.score : null,
    testsPassed: observatory.ok ? (observatory.body?.tests_passed ?? null) : null,
    testsFailed: observatory.ok ? (observatory.body?.tests_failed ?? null) : null,
    testsQuantity: observatory.ok ? (observatory.body?.tests_quantity ?? null) : null,
    raw: observatory.body,
  },
  openSSFScorecard: {
    requestUrl: scorecardUrl,
    viewerUrl: `https://scorecard.dev/viewer/?uri=github.com/${owner}/${name}`,
    badgeUrl: `https://api.scorecard.dev/projects/github.com/${owner}/${name}/badge`,
    httpStatus: scorecard.status,
    publishedResultAvailable: scorecard.ok,
    score: scorecard.ok && typeof scorecard.body?.score === 'number' ? scorecard.body.score : null,
    date: scorecard.ok ? (scorecard.body?.date || null) : null,
    raw: scorecard.body,
  },
  claims: {
    greenHostingVerified: green.ok && green.body?.green === true ? 'VERIFIED_FOR_THIS_CHECK' : 'NOT_VERIFIED',
    mdnObservatoryAPlus: observatory.ok && observatory.body?.grade === 'A+' ? 'VERIFIED_FOR_THIS_SCAN' : 'NOT_VERIFIED',
    openSSFScorecardPublished: scorecard.ok ? 'VERIFIED' : 'NOT_VERIFIED',
  },
  limitations: [
    'These are public technical trust signals, not regulatory certifications or independent assurance engagements.',
    'Results can change when hosting, DNS, HTTP headers, repository configuration or provider data changes.',
    'No public claim should exceed the exact wording and scope of the source service.',
  ],
};

process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
console.error(`Green Web: ${evidence.greenWebFoundation.green}`);
console.error(`MDN HTTP Observatory: ${evidence.mdnHttpObservatory.grade} (${evidence.mdnHttpObservatory.score})`);
console.error(`OpenSSF Scorecard: ${evidence.openSSFScorecard.publishedResultAvailable ? evidence.openSSFScorecard.score : 'not published'}`);

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const argv = process.argv.slice(2);
const strict = argv.includes('--strict');
const inputArg = argv.find((value) => value.startsWith('--input='));
const outputArg = argv.find((value) => value.startsWith('--output='));
const inputPath = resolve(inputArg?.slice(8) || 'artifacts/platform-final-release-input.json');
const outputPath = resolve(outputArg?.slice(9) || 'artifacts/platform-final-release-evidence-pack.json');
const expectedSha = (process.env.RELEASE_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
const maxAgeHours = Number(process.env.PLATFORM_EVIDENCE_MAX_AGE_HOURS || 168);

const REQUIRED_LANES = [
  'provider_configuration',
  'deployment_provenance',
  'provider_interoperability',
  'provider_transactions',
  'sentry_source_maps',
];
const FORBIDDEN_KEYS = /(?:secret|token|password|authorization|cookie|email|api[_-]?key|client[_-]?secret|service[_-]?role|private[_-]?key|connection[_-]?string)/i;
const SHA_RE = /^[a-f0-9]{40}$/;
const DIGEST_RE = /^[a-f0-9]{64}$/;
const results = [];
const fail = (control, detail) => results.push({ control, status: 'FAIL', detail });
const pass = (control, detail) => results.push({ control, status: 'PASS', detail });

function inspectKeys(value, path = '$') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.test(key)) fail('redaction', `Forbidden key at ${path}.${key}`);
    inspectKeys(child, `${path}.${key}`);
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

let source;
try {
  source = JSON.parse(readFileSync(inputPath, 'utf8'));
} catch (error) {
  fail('input', `Unable to parse evidence input: ${error.name || 'Error'}`);
  source = {};
}
inspectKeys(source);

if (!SHA_RE.test(expectedSha)) fail('release-sha', 'RELEASE_SHA must be a full lowercase 40-character SHA');
else pass('release-sha', `Exact release SHA: ${expectedSha}`);

if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0 || maxAgeHours > 720) fail('freshness-policy', 'PLATFORM_EVIDENCE_MAX_AGE_HOURS must be between 1 and 720');
else pass('freshness-policy', `Maximum evidence age: ${maxAgeHours} hours`);

const lanes = Array.isArray(source.lanes) ? source.lanes : [];
const byName = new Map(lanes.map((lane) => [lane?.name, lane]));
const accepted = [];

for (const name of REQUIRED_LANES) {
  const lane = byName.get(name);
  if (!lane) {
    fail(`lane:${name}`, 'Required evidence lane is missing');
    continue;
  }
  if (lane.status !== 'PASS') fail(`lane:${name}:status`, 'Lane status must be PASS');
  else pass(`lane:${name}:status`, 'Lane reports PASS');

  if (lane.release_sha !== expectedSha) fail(`lane:${name}:sha`, 'Lane is not bound to the requested release SHA');
  else pass(`lane:${name}:sha`, 'Lane is bound to the exact release SHA');

  const observedAt = Date.parse(lane.observed_at || '');
  const ageHours = (Date.now() - observedAt) / 3_600_000;
  if (!Number.isFinite(observedAt) || ageHours < 0 || ageHours > maxAgeHours) fail(`lane:${name}:freshness`, 'Lane evidence is missing, future-dated or stale');
  else pass(`lane:${name}:freshness`, `Lane age is ${ageHours.toFixed(2)} hours`);

  if (!DIGEST_RE.test(lane.artifact_sha256 || '')) fail(`lane:${name}:digest`, 'Lane artifact_sha256 must be a lowercase SHA-256 digest');
  else pass(`lane:${name}:digest`, 'Lane artifact digest is present');

  if (name === 'sentry_source_maps') {
    if (lane.release !== expectedSha) fail('sentry-source-maps:release', 'Sentry release must equal the exact release SHA');
    else pass('sentry-source-maps:release', 'Sentry release matches exact SHA');
    if (lane.processing_status !== 'PASS') fail('sentry-source-maps:processing', 'Sentry source-map processing must be PASS');
    else pass('sentry-source-maps:processing', 'Sentry source maps report successful processing');
  }

  accepted.push({
    name,
    status: lane.status,
    release_sha: lane.release_sha,
    observed_at: lane.observed_at,
    artifact_sha256: lane.artifact_sha256,
    ...(name === 'sentry_source_maps' ? { release: lane.release, processing_status: lane.processing_status } : {}),
  });
}

const failures = results.filter((item) => item.status === 'FAIL');
const canonical = JSON.stringify({ release_sha: expectedSha || null, lanes: accepted });
const report = {
  schema_version: 1,
  evidence_type: 'platform-final-release-evidence-pack',
  repository: process.env.GITHUB_REPOSITORY || 'renanescola40-afk/eurocomply_saas',
  release_sha: SHA_RE.test(expectedSha) ? expectedSha : null,
  generated_at: new Date().toISOString(),
  strict_runtime: strict,
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  decision: failures.length === 0 ? 'PLATFORM_RELEASE_EVIDENCE_COMPLETE' : 'NO_GO',
  pack_sha256: sha256(canonical),
  lanes: accepted,
  results,
  redaction: { secret_values_included: false, raw_provider_payloads_included: false },
  limitations: [
    'This pack validates supplied evidence and hashes; it does not execute provider transactions.',
    'A PASS applies only to the exact release SHA and observation window represented by the lanes.',
    'This platform workstream result does not declare the entire SaaS Enterprise Ready.',
  ],
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Platform final release evidence: ${report.status}`);
console.log(`Decision: ${report.decision}`);
console.log(`Pack digest: ${report.pack_sha256}`);
if (strict && failures.length > 0) process.exitCode = 1;

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const inputArg = args.find((value) => value.startsWith('--input='));
const outputArg = args.find((value) => value.startsWith('--output='));
const inputPath = resolve(inputArg?.slice('--input='.length) || 'evidence/platform/provider-transactions.json');
const outputPath = resolve(outputArg?.slice('--output='.length) || 'artifacts/platform-provider-transaction-evidence.json');
const expectedSha = (process.env.RELEASE_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
const maxAgeHours = Number(process.env.PROVIDER_EVIDENCE_MAX_AGE_HOURS || '168');

const results = [];
const add = (control, status, detail) => results.push({ control, status, detail });
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function failOrNotProven(detail) {
  return strict ? ['FAIL', detail] : ['NOT_PROVEN', detail];
}

let source;
try {
  source = JSON.parse(readFileSync(inputPath, 'utf8'));
} catch (error) {
  const [status, detail] = failOrNotProven(`Evidence input unavailable or invalid: ${error.code || error.name || 'Error'}`);
  add('evidence-input', status, detail);
  source = null;
}

const requiredProviders = ['supabase_oauth', 'stripe_webhook', 'sentry_ingestion'];
const forbiddenKeys = /(?:secret|token|password|authorization|cookie|email|access_key|api_key|service_role|client_secret)/i;

function scanForSensitiveKeys(value, path = '$') {
  const findings = [];
  if (!value || typeof value !== 'object') return findings;
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (forbiddenKeys.test(key)) findings.push(nextPath);
    if (child && typeof child === 'object') findings.push(...scanForSensitiveKeys(child, nextPath));
  }
  return findings;
}

if (source) {
  if (source.schema_version !== 1) add('schema-version', 'FAIL', 'schema_version must equal 1');
  else add('schema-version', 'PASS', 'Schema version 1');

  if (!/^[a-f0-9]{40}$/.test(expectedSha)) {
    const [status, detail] = failOrNotProven('RELEASE_SHA must be a full lowercase 40-character SHA');
    add('release-sha', status, detail);
  } else if (source.release_sha !== expectedSha) {
    add('release-sha', 'FAIL', `Evidence SHA does not match expected ${expectedSha}`);
  } else {
    add('release-sha', 'PASS', `Evidence is bound to exact SHA ${expectedSha}`);
  }

  const sensitivePaths = scanForSensitiveKeys(source);
  if (sensitivePaths.length > 0) add('redaction', 'FAIL', `Forbidden sensitive keys detected at ${sensitivePaths.slice(0, 5).join(', ')}`);
  else add('redaction', 'PASS', 'No forbidden sensitive keys detected');

  const generatedAt = Date.parse(source.generated_at || '');
  const ageHours = Number.isFinite(generatedAt) ? (Date.now() - generatedAt) / 3_600_000 : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(generatedAt)) add('freshness', 'FAIL', 'generated_at must be a valid ISO timestamp');
  else if (ageHours < -0.25) add('freshness', 'FAIL', 'Evidence timestamp is in the future');
  else if (ageHours > maxAgeHours) add('freshness', 'FAIL', `Evidence is older than ${maxAgeHours} hours`);
  else add('freshness', 'PASS', `Evidence age ${ageHours.toFixed(2)} hours`);

  const transactions = Array.isArray(source.transactions) ? source.transactions : [];
  for (const provider of requiredProviders) {
    const item = transactions.find((entry) => entry?.provider === provider);
    if (!item) {
      add(`${provider}:presence`, 'FAIL', 'Required transaction evidence is missing');
      continue;
    }

    const validStatus = item.status === 'PASS';
    add(`${provider}:status`, validStatus ? 'PASS' : 'FAIL', validStatus ? 'Transaction reported PASS' : 'Transaction did not report PASS');

    const observedAt = Date.parse(item.observed_at || '');
    if (!Number.isFinite(observedAt)) add(`${provider}:observed-at`, 'FAIL', 'observed_at is invalid');
    else if (Math.abs(Date.now() - observedAt) / 3_600_000 > maxAgeHours) add(`${provider}:observed-at`, 'FAIL', `Observation exceeds ${maxAgeHours}-hour window`);
    else add(`${provider}:observed-at`, 'PASS', 'Observation is within freshness window');

    if (!/^[a-f0-9]{64}$/.test(item.receipt_sha256 || '')) add(`${provider}:receipt`, 'FAIL', 'receipt_sha256 must be a lowercase SHA-256 digest');
    else add(`${provider}:receipt`, 'PASS', `Receipt digest recorded: ${item.receipt_sha256}`);

    if (typeof item.correlation_id_hash !== 'string' || !/^[a-f0-9]{64}$/.test(item.correlation_id_hash)) {
      add(`${provider}:correlation`, 'FAIL', 'correlation_id_hash must be a lowercase SHA-256 digest');
    } else {
      add(`${provider}:correlation`, 'PASS', 'Correlation identifier is irreversibly hashed');
    }

    if (typeof item.summary !== 'string' || item.summary.length < 12 || item.summary.length > 240) add(`${provider}:summary`, 'FAIL', 'summary must be 12-240 characters');
    else add(`${provider}:summary`, 'PASS', item.summary);
  }

  const canonical = JSON.stringify({
    schema_version: source.schema_version,
    release_sha: source.release_sha,
    generated_at: source.generated_at,
    transactions: source.transactions,
  });
  add('manifest-digest', 'PASS', `Canonical evidence digest: ${sha256(canonical)}`);
}

const failures = results.filter((item) => item.status === 'FAIL');
const report = {
  schema_version: 1,
  evidence_type: 'platform-provider-transaction-evidence-validation',
  repository: process.env.GITHUB_REPOSITORY || 'renanescola40-afk/eurocomply_saas',
  release_sha: /^[a-f0-9]{40}$/.test(expectedSha) ? expectedSha : null,
  generated_at: new Date().toISOString(),
  strict_runtime: strict,
  secret_values_included: false,
  source_path_hash: sha256(inputPath),
  status: failures.length === 0 && source ? 'PASS' : 'FAIL',
  results,
  limitations: [
    'This validator verifies evidence structure, freshness, exact-SHA binding, redaction and receipt digests.',
    'It does not itself perform OAuth login, send a Stripe webhook or ingest a Sentry event.',
  ],
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Provider transaction evidence: ${report.status}`);
console.log(`Evidence: ${outputPath}`);
if (failures.length > 0 || !source) process.exitCode = 1;

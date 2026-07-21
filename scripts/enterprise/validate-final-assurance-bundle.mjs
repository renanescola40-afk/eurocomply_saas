#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FINAL_ASSURANCE_CONTROL_IDS, FINAL_ASSURANCE_ITEMS } from './final-assurance-control-registry.mjs';

const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const SAFE_IDENTITY = /^[A-Za-z0-9][A-Za-z0-9_.@-]{2,127}$/;
const SENSITIVE_KEY = /(secret|token|password|credential|authorization|cookie|connection.?string|private.?key|signed.?url|database.?url)/i;
const INPUT = 'evidence/enterprise-assurance/final-assurance.json';
const OUTPUT = 'docs/security/evidence/release/final-assurance-validation.json';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function digest(value) { return createHash('sha256').update(value).digest('hex'); }
function hasSensitiveShape(value) {
  if (Array.isArray(value)) return value.some(hasSensitiveShape);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => (SENSITIVE_KEY.test(key) && item !== null && item !== '' && item !== false) || hasSensitiveShape(item));
}
function distinctReviewers(item) {
  const preparedBy = String(item?.preparedBy ?? '').trim();
  const reviewers = Array.isArray(item?.reviewers) ? item.reviewers.map(String).map((value) => value.trim()) : [];
  return { preparedBy, reviewers, unique: [...new Set(reviewers)] };
}
function isAncestor(assessedSha, targetSha, root) {
  if (!FULL_SHA.test(assessedSha) || !FULL_SHA.test(targetSha)) return false;
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', assessedSha, targetSha], { cwd: root, stdio: 'ignore', timeout: 30_000 });
    return true;
  } catch { return false; }
}

export function validateFinalAssuranceBundle(bundle, { targetSha, observedSha, repository, runId, generatedAt = new Date().toISOString(), root = process.cwd(), verifyAncestry = true }) {
  const failures = [];
  if (bundle?.schema !== 'risck-comply.final-assurance-bundle.v1') failures.push('unsupported assurance bundle schema');
  if (bundle?.status !== 'Complete') failures.push('assurance bundle status must be Complete');
  if (repository !== REPOSITORY || bundle?.repository !== REPOSITORY) failures.push('assurance repository must be canonical');
  if (!FULL_SHA.test(targetSha) || observedSha !== targetSha) failures.push('assurance exact-SHA provenance mismatch');
  if (!/^\d+$/.test(String(runId ?? ''))) failures.push('assurance runId must be numeric');
  if (hasSensitiveShape(bundle)) failures.push('assurance bundle contains secret-shaped metadata');
  if (!Array.isArray(bundle?.items)) failures.push('assurance items must be an array');

  const byId = new Map();
  for (const item of Array.isArray(bundle?.items) ? bundle.items : []) {
    const contract = FINAL_ASSURANCE_ITEMS[item?.id];
    if (!contract || byId.has(item.id)) { failures.push(`invalid or duplicate assurance item: ${item?.id ?? 'missing'}`); continue; }
    byId.set(item.id, item);
    if (item.status !== 'Complete' || item.outcome !== 'passed') failures.push(`assurance item ${item.id} must be Complete/passed`);
    if (!DIGEST.test(String(item.artifactDigestSha256 ?? ''))) failures.push(`assurance item ${item.id} artifact digest is invalid`);
    const reviewedAt = Date.parse(item.reviewedAt ?? '');
    const validUntil = Date.parse(item.validUntil ?? '');
    const generated = Date.parse(generatedAt);
    if (!Number.isFinite(reviewedAt) || !Number.isFinite(validUntil) || validUntil < generated) failures.push(`assurance item ${item.id} is stale or has invalid dates`);
    if (Number.isFinite(reviewedAt) && generated - reviewedAt > contract.maximumAgeDays * 86_400_000) failures.push(`assurance item ${item.id} exceeds maximum age`);
    const reviewers = distinctReviewers(item);
    if (!SAFE_IDENTITY.test(reviewers.preparedBy) || reviewers.unique.length < 2 || reviewers.unique.some((value) => !SAFE_IDENTITY.test(value)) || reviewers.unique.includes(reviewers.preparedBy)) {
      failures.push(`assurance item ${item.id} lacks independent reviewer separation`);
    }
    for (const check of contract.requiredChecks) if (item.checks?.[check] !== true) failures.push(`assurance item ${item.id} check ${check} must pass`);
    const assessedSha = String(item.assessedSha ?? '').toLowerCase();
    if (!FULL_SHA.test(assessedSha)) failures.push(`assurance item ${item.id} assessedSha is invalid`);
    else if (verifyAncestry && !isAncestor(assessedSha, targetSha, root)) failures.push(`assurance item ${item.id} assessedSha is not an ancestor of targetSha`);
    if (item.changeImpactReviewed !== true) failures.push(`assurance item ${item.id} change impact must be reviewed`);
    if (!SAFE_IDENTITY.test(String(item.assuranceProvider ?? ''))) failures.push(`assurance item ${item.id} provider identity is invalid`);
  }
  for (const id of Object.keys(FINAL_ASSURANCE_ITEMS)) if (!byId.has(id)) failures.push(`required assurance item is missing: ${id}`);

  const passed = failures.length === 0;
  const sourceDigest = digest(JSON.stringify(stable(bundle)));
  return {
    schema: 'risck-comply.final-assurance-evidence.v1',
    evidenceItem: 'final-assurance-validation',
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'not_verified',
    generatedAt,
    repository,
    branch: 'main',
    targetSha,
    observedSha,
    workflowRunId: String(runId ?? ''),
    controlsVerified: passed ? [...FINAL_ASSURANCE_CONTROL_IDS] : [],
    checks: {
      completeBundle: passed,
      independentReviewers: passed,
      exactShaBound: FULL_SHA.test(targetSha) && observedSha === targetSha,
      allRequiredItemsPresent: Object.keys(FINAL_ASSURANCE_ITEMS).every((id) => byId.has(id)),
      noSensitiveValues: !hasSensitiveShape(bundle),
    },
    failures,
    sourceDigestSha256: sourceDigest,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawReportsStored: false,
      reportUrlsStored: false,
      legalAdviceStored: false,
      reviewerContactDetailsStored: false,
      customerDataStored: false,
      exactShaBound: passed,
    },
    evidenceBoundary: 'This evidence validates sanitized metadata, immutable report digests, freshness, assessed-SHA ancestry and reviewer separation. It does not invent pentest results, legal approval, release approval or provider protection; the protected environment remains a human approval boundary.',
  };
}

function main() {
  const root = process.cwd();
  const inputPath = resolve(root, process.env.FINAL_ASSURANCE_INPUT || INPUT);
  const outputPath = resolve(root, process.env.FINAL_ASSURANCE_OUTPUT || OUTPUT);
  const bundle = JSON.parse(readFileSync(inputPath, 'utf8'));
  const evidence = validateFinalAssuranceBundle(bundle, {
    targetSha: String(process.env.ENTERPRISE_EXPECTED_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase(),
    observedSha: String(process.env.GITHUB_SHA || '').trim().toLowerCase(),
    repository: String(process.env.GITHUB_REPOSITORY || ''),
    runId: String(process.env.GITHUB_RUN_ID || ''),
    root,
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  if (evidence.status !== 'Complete') { for (const failure of evidence.failures) console.error(`- ${failure}`); process.exit(1); }
  console.log(`Final assurance evidence complete for ${evidence.controlsVerified.length} controls.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();

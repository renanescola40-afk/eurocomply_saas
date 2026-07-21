#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (key.startsWith('--')) {
    args.set(key, value && !value.startsWith('--') ? value : 'true');
    if (value && !value.startsWith('--')) index += 1;
  }
}

const manifestPath = path.resolve(root, args.get('--manifest') || 'docs/security/evidence/enterprise-release-evidence-manifest.json');
const outputPath = path.resolve(root, args.get('--output') || 'artifacts/enterprise-release-decision.json');
const reportPath = path.resolve(root, args.get('--report') || 'artifacts/enterprise-release-decision.md');
const expectedSha = (args.get('--sha') || process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
const expectedBranch = (args.get('--branch') || process.env.RELEASE_BRANCH || process.env.GITHUB_REF_NAME || 'main').trim();
const now = new Date();

const forbiddenKeyPattern = /(token|secret|password|authorization|cookie|database_url|connection_string|service_role|private_key|dsn|signed_url)/i;
const acceptedStates = new Set(['pass', 'passed', 'complete', 'completed', 'success', 'successful', 'approved', 'go', 'verified']);
const shaKeys = ['commit_sha', 'commitSha', 'head_sha', 'headSha', 'assessed_sha', 'assessedSha', 'release_sha', 'releaseSha', 'git_sha', 'gitSha'];
const dateKeys = ['generated_at', 'generatedAt', 'assessed_at', 'assessedAt', 'validated_at', 'validatedAt', 'completed_at', 'completedAt', 'timestamp'];

function findFirst(object, keys) {
  for (const key of keys) {
    if (typeof object?.[key] === 'string' && object[key].trim()) return object[key].trim();
  }
  return '';
}

function collectForbiddenKeys(value, cursor = '$', findings = []) {
  if (!value || typeof value !== 'object') return findings;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectForbiddenKeys(entry, `${cursor}[${index}]`, findings));
    return findings;
  }
  for (const [key, nested] of Object.entries(value)) {
    const next = `${cursor}.${key}`;
    if (forbiddenKeyPattern.test(key)) findings.push(next);
    collectForbiddenKeys(nested, next, findings);
  }
  return findings;
}

function evidenceState(evidence) {
  const candidates = [evidence.status, evidence.outcome, evidence.result, evidence.decision, evidence.verdict]
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim().toLowerCase());
  return candidates.find((value) => acceptedStates.has(value)) || '';
}

function hasIndependentReview(evidence) {
  const reviewer = evidence.independent_reviewer || evidence.independentReviewer || evidence.reviewed_by || evidence.reviewedBy;
  const reviewedAt = evidence.reviewed_at || evidence.reviewedAt;
  return typeof reviewer === 'string' && reviewer.trim().length >= 3 && typeof reviewedAt === 'string' && Number.isFinite(Date.parse(reviewedAt));
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.schema_version !== 1 || !Array.isArray(manifest.required_controls) || manifest.required_controls.length === 0) {
  throw new Error('Invalid enterprise evidence manifest');
}
if (!expectedSha || !/^[a-f0-9]{40}$/.test(expectedSha)) {
  throw new Error('A full 40-character release SHA is required via --sha, RELEASE_COMMIT_SHA or GITHUB_SHA');
}
if (expectedBranch !== manifest.release_branch) {
  throw new Error(`Release branch mismatch: expected ${manifest.release_branch}, received ${expectedBranch}`);
}

const maximumAgeMs = Number(manifest.maximum_evidence_age_days || 30) * 24 * 60 * 60 * 1000;
const controls = [];

for (const control of manifest.required_controls) {
  const failures = [];
  const absolutePath = path.resolve(root, control.path);
  let evidence;
  let raw = '';
  try {
    raw = await readFile(absolutePath, 'utf8');
    evidence = JSON.parse(raw);
  } catch (error) {
    failures.push(error?.code === 'ENOENT' ? 'evidence_missing' : 'evidence_unreadable');
  }

  if (evidence) {
    const state = evidenceState(evidence);
    if (!state) failures.push('outcome_not_passed');

    const evidenceSha = findFirst(evidence, shaKeys).toLowerCase();
    if (!/^[a-f0-9]{40}$/.test(evidenceSha)) failures.push('full_sha_missing');
    else if (evidenceSha !== expectedSha) failures.push('sha_mismatch');

    const observedBranch = String(evidence.branch || evidence.release_branch || evidence.releaseBranch || '').trim();
    if (!observedBranch) failures.push('branch_missing');
    else if (observedBranch !== expectedBranch) failures.push('branch_mismatch');

    const observedAtRaw = findFirst(evidence, dateKeys);
    const observedAt = Date.parse(observedAtRaw);
    if (!Number.isFinite(observedAt)) failures.push('timestamp_missing_or_invalid');
    else if (observedAt > now.getTime() + 5 * 60 * 1000) failures.push('timestamp_in_future');
    else if (now.getTime() - observedAt > maximumAgeMs) failures.push('evidence_stale');

    if (collectForbiddenKeys(evidence).length > 0) failures.push('sensitive_key_present');
    if (control.acceptance === 'independent_review' && !hasIndependentReview(evidence)) failures.push('independent_review_missing');
  }

  controls.push({
    id: control.id,
    name: control.name,
    evidence_path: control.path,
    status: failures.length === 0 ? 'Complete' : 'Open',
    failures,
    digest_sha256: raw ? createHash('sha256').update(raw).digest('hex') : null
  });
}

const complete = controls.filter((control) => control.status === 'Complete').length;
const decision = complete === controls.length ? 'Go' : 'No-Go';
const result = {
  schema_version: 1,
  generated_at: now.toISOString(),
  release_branch: expectedBranch,
  release_commit_sha: expectedSha,
  decision,
  summary: {
    total: controls.length,
    complete,
    open: controls.length - complete,
    completion_percent: Math.floor((complete / controls.length) * 100)
  },
  controls
};

await mkdir(path.dirname(outputPath), { recursive: true });
await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

const rows = controls.map((control) => `| ${control.id} | ${control.name} | ${control.status} | ${control.failures.join(', ') || '—'} |`).join('\n');
const report = `# Enterprise Release Decision\n\n- Decision: **${decision}**\n- Release branch: \`${expectedBranch}\`\n- Release SHA: \`${expectedSha}\`\n- Complete: ${complete}/${controls.length}\n- Generated: ${result.generated_at}\n\n| Control | Evidence | Status | Blocking reasons |\n| --- | --- | --- | --- |\n${rows}\n\nA Go decision is emitted only when every required control has passing, fresh, redacted evidence for the exact release SHA and branch.\n`;
await writeFile(reportPath, report, 'utf8');

console.log(JSON.stringify({ decision, complete, total: controls.length, outputPath, reportPath }));
if (decision !== 'Go') process.exitCode = 1;

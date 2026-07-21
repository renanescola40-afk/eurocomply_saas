#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const inputPath = process.env.EXTERNAL_ASSURANCE_INPUT || 'docs/security/evidence/runtime/external-security-review.json';
const outputPath = process.env.EXTERNAL_ASSURANCE_OUTPUT || 'artifacts/external-security-assurance-decision.json';
const expectedSha = String(process.env.RELEASE_SHA || '').toLowerCase();
const maximumAgeDays = Number(process.env.EXTERNAL_ASSURANCE_MAX_AGE_DAYS || 90);

if (!/^[a-f0-9]{40}$/.test(expectedSha)) throw new Error('RELEASE_SHA must be a full lowercase 40-character SHA');
if (!Number.isFinite(maximumAgeDays) || maximumAgeDays < 1 || maximumAgeDays > 365) throw new Error('Invalid assurance age limit');

const raw = await readFile(inputPath, 'utf8');
const evidence = JSON.parse(raw);
const blockers = [];

const requiredStrings = ['reviewer_name', 'reviewer_organization', 'review_completed_at', 'release_sha', 'scope_version', 'outcome'];
for (const field of requiredStrings) {
  if (typeof evidence[field] !== 'string' || evidence[field].trim().length === 0) blockers.push(`missing_${field}`);
}

if (evidence.release_sha?.toLowerCase() !== expectedSha) blockers.push('sha_mismatch');
if (evidence.release_branch !== 'main') blockers.push('branch_mismatch');
if (evidence.outcome !== 'pass') blockers.push('review_not_passing');
if (evidence.reviewer_independent !== true) blockers.push('missing_independence_attestation');
if (evidence.reviewer_email && /@(?:gmail|outlook|hotmail|yahoo)\./i.test(evidence.reviewer_email)) blockers.push('reviewer_identity_not_organizational');

const completedAt = Date.parse(evidence.review_completed_at || '');
if (!Number.isFinite(completedAt)) blockers.push('invalid_review_date');
else if (Date.now() - completedAt > maximumAgeDays * 86400000) blockers.push('expired_report');
else if (completedAt > Date.now() + 300000) blockers.push('future_review_date');

const findings = Array.isArray(evidence.findings) ? evidence.findings : [];
if (!Array.isArray(evidence.findings)) blockers.push('missing_finding_register');
for (const finding of findings) {
  if (!['critical', 'high', 'medium', 'low', 'informational'].includes(finding.severity)) blockers.push('invalid_severity');
  if (!['open', 'accepted', 'remediated', 'false_positive'].includes(finding.status)) blockers.push('invalid_finding_status');
  if (['critical', 'high'].includes(finding.severity) && finding.status !== 'remediated' && finding.status !== 'false_positive') {
    blockers.push(`open_${finding.severity}`);
  }
  if (finding.status === 'remediated' && finding.retested !== true) blockers.push('missing_retest');
}

const sensitiveKeyPattern = /(token|secret|password|cookie|authorization|service[_-]?role|private[_-]?key|dsn)/i;
function scan(value, keyPath = '') {
  if (Array.isArray(value)) return value.forEach((item, index) => scan(item, `${keyPath}[${index}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (sensitiveKeyPattern.test(key)) blockers.push(`sensitive_key:${keyPath ? `${keyPath}.` : ''}${key}`);
    scan(child, keyPath ? `${keyPath}.${key}` : key);
  }
}
scan(evidence);

const uniqueBlockers = [...new Set(blockers)].sort();
const decision = uniqueBlockers.length === 0 ? 'ACCEPTED_FOR_ENTERPRISE_PROMOTION' : 'NO_GO';
const result = {
  schema_version: 1,
  release_sha: expectedSha,
  release_branch: 'main',
  decision,
  blockers: uniqueBlockers,
  reviewer: evidence.reviewer_name || null,
  reviewer_organization: evidence.reviewer_organization || null,
  review_completed_at: evidence.review_completed_at || null,
  finding_counts: findings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
    return counts;
  }, {}),
  evidence_sha256: createHash('sha256').update(raw).digest('hex'),
  validated_at: new Date().toISOString()
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ decision, blocker_count: uniqueBlockers.length }));
if (decision !== 'ACCEPTED_FOR_ENTERPRISE_PROMOTION') process.exitCode = 1;

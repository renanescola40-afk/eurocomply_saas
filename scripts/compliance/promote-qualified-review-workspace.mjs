#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const IDS = new Set(['legal-rules','prohibited-practices','article-50-copy','fria-methodology','deployer-obligations','high-risk-provider','conformity','gpai']);
const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

export function validateWorkspaceExport(payload, expectedSha, now = Date.now()) {
  const failures = [];
  if (payload?.schema !== 'risck-comply.qualified-review-workspace-export.v1') failures.push('schema_invalid');
  if (!SHA.test(expectedSha)) failures.push('expected_sha_invalid');
  if (!Array.isArray(payload?.reviews)) failures.push('reviews_missing');
  const seen = new Set();
  for (const review of payload?.reviews ?? []) {
    if (!IDS.has(review.requirementId)) failures.push(`unknown_requirement:${review.requirementId}`);
    if (seen.has(review.requirementId)) failures.push(`duplicate_requirement:${review.requirementId}`);
    seen.add(review.requirementId);
    if (review.reviewedSha !== expectedSha) failures.push(`sha_mismatch:${review.requirementId}`);
    if (!['APPROVED','APPROVED_WITH_LIMITATIONS'].includes(review.status)) failures.push(`decision_not_approved:${review.requirementId}`);
    if (!review.reviewer?.name || !review.reviewer?.organization || !review.reviewer?.contact) failures.push(`reviewer_missing:${review.requirementId}`);
    if (!review.qualification?.title || !review.qualification?.jurisdictionOrDiscipline || !Array.isArray(review.qualification?.evidence) || review.qualification.evidence.length === 0) failures.push(`qualification_missing:${review.requirementId}`);
    if (review.independence?.conflictChecked !== true || review.independence?.conflictFound !== false || String(review.independence?.statement ?? '').length < 20) failures.push(`independence_invalid:${review.requirementId}`);
    if (!DIGEST.test(review.evidenceDigest ?? '')) failures.push(`digest_invalid:${review.requirementId}`);
    if (Date.parse(review.validUntil ?? '') <= now) failures.push(`expired:${review.requirementId}`);
    if (review.status === 'APPROVED_WITH_LIMITATIONS' && (!Array.isArray(review.limitations) || review.limitations.length === 0)) failures.push(`limitations_missing:${review.requirementId}`);
  }
  return failures;
}

export function buildAcceptedDocuments(payload, expectedSha, now = Date.now()) {
  const failures = validateWorkspaceExport(payload, expectedSha, now);
  if (failures.length) return { failures, documents: {} };
  const documents = {};
  for (const review of payload.reviews) {
    const body = {
      schema: 'risck-comply.qualified-review-assurance.v1',
      requirementId: review.requirementId,
      reviewedSha: review.reviewedSha,
      reviewer: review.reviewer,
      qualification: review.qualification,
      independence: review.independence,
      decision: review.status,
      reviewedAt: review.reviewedAt,
      validUntil: review.validUntil,
      evidenceDigest: review.evidenceDigest,
      limitations: review.limitations ?? [],
    };
    documents[`docs/compliance/evidence/accepted/${review.requirementId}-qualified-review.json`] = {
      ...body,
      promotionIntegrity: { sha256: createHash('sha256').update(JSON.stringify(stable(body))).digest('hex') },
    };
  }
  return { failures: [], documents };
}

function main() {
  const input = process.env.QUALIFIED_REVIEW_EXPORT || 'artifacts/qualified-review-workspace/export.json';
  const outputRoot = resolve(process.env.QUALIFIED_REVIEW_OUTPUT_ROOT || 'artifacts/qualified-review-workspace/promoted');
  const expectedSha = String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
  const payload = JSON.parse(readFileSync(resolve(input), 'utf8'));
  const result = buildAcceptedDocuments(payload, expectedSha);
  if (result.failures.length) throw new Error(result.failures.join('; '));
  for (const [path, document] of Object.entries(result.documents)) {
    const output = resolve(outputRoot, path);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 });
  }
  console.log(JSON.stringify({ promoted: Object.keys(result.documents).length, targetSha: expectedSha }));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) main();

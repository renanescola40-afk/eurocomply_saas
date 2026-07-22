#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PLACEHOLDER_PATTERN = /\b(?:todo|tbd|placeholder|pending evidence|replace me|example only)\b/i;
const SHA_PATTERN = /^[a-f0-9]{40}$/;

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function validateEvidenceDocument(document, requirement, policy, options = {}) {
  const failures = [];
  const expectedSha = options.expectedSha;
  const now = options.now ?? new Date();
  const raw = options.raw ?? JSON.stringify(document);

  if (!document || typeof document !== 'object' || Array.isArray(document)) failures.push('document_must_be_object');
  if (PLACEHOLDER_PATTERN.test(raw)) failures.push('placeholder_content_forbidden');

  const expectedStatus = requirement.kind === 'human_review' ? policy.humanReviewStatus : policy.runtimeStatus;
  if (document.status !== expectedStatus) failures.push(`status_must_equal_${expectedStatus}`);

  if (!SHA_PATTERN.test(String(document.exactSha ?? ''))) failures.push('exact_sha_invalid');
  if (expectedSha && document.exactSha !== expectedSha) failures.push('exact_sha_mismatch');

  const recordedAt = new Date(document.recordedAt ?? document.generatedAt ?? document.reviewedAt ?? 'invalid');
  if (Number.isNaN(recordedAt.getTime())) failures.push('recorded_at_invalid');

  if (requirement.kind === 'runtime' && !Number.isNaN(recordedAt.getTime())) {
    const ageMs = now.getTime() - recordedAt.getTime();
    const maxAgeMs = policy.maxRuntimeAgeDays * 24 * 60 * 60 * 1000;
    if (ageMs < 0 || ageMs > maxAgeMs) failures.push('runtime_evidence_stale');
  }

  if (requirement.kind === 'human_review') {
    if (!document.reviewer || typeof document.reviewer !== 'object') failures.push('reviewer_identity_missing');
    if (!document.reviewer?.name || !document.reviewer?.qualification) failures.push('reviewer_qualification_missing');
    if (!document.scope || !document.conclusion) failures.push('review_scope_or_conclusion_missing');
  } else {
    if (!document.environment || !document.proofType) failures.push('runtime_environment_or_proof_type_missing');
    if (!Array.isArray(document.assertions) || document.assertions.length === 0) failures.push('runtime_assertions_missing');
  }

  if (policy.requireIntegrityDigest) {
    if (!SHA_PATTERN.test(String(document.integrity?.sha256 ?? ''))) failures.push('integrity_digest_missing');
    if (document.integrity?.sha256 === sha256(raw)) failures.push('self_referential_integrity_digest');
  }

  return failures;
}

export function evaluateRegistry({ root = process.cwd(), registry, expectedSha, strict = false, now = new Date() }) {
  const results = registry.requirements.map((requirement) => {
    const absolutePath = path.join(root, requirement.path);
    if (!fs.existsSync(absolutePath)) return { ...requirement, state: 'missing', failures: ['file_missing'] };

    const raw = fs.readFileSync(absolutePath, 'utf8');
    try {
      const document = JSON.parse(raw);
      const failures = validateEvidenceDocument(document, requirement, registry.policy, { expectedSha, now, raw });
      return { ...requirement, state: failures.length === 0 ? 'accepted' : 'invalid', failures };
    } catch {
      return { ...requirement, state: 'invalid', failures: ['invalid_json'] };
    }
  });

  const summary = {
    total: results.length,
    accepted: results.filter((item) => item.state === 'accepted').length,
    missing: results.filter((item) => item.state === 'missing').length,
    invalid: results.filter((item) => item.state === 'invalid').length,
  };
  const passed = summary.missing === 0 && summary.invalid === 0;
  if (strict && !passed) process.exitCode = 1;
  return { schema: 'risck-comply.enterprise-evidence-closure-report.v1', exactSha: expectedSha ?? null, passed, summary, results };
}

function main() {
  const strict = process.argv.includes('--strict');
  const registryPath = path.join('docs', 'compliance', 'evidence', 'enterprise-evidence-closure-registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const expectedSha = process.env.GITHUB_SHA || process.env.EVIDENCE_EXACT_SHA || undefined;
  const report = evaluateRegistry({ registry, expectedSha, strict });
  fs.mkdirSync(path.join('artifacts', 'enterprise-evidence-closure'), { recursive: true });
  fs.writeFileSync(path.join('artifacts', 'enterprise-evidence-closure', 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();

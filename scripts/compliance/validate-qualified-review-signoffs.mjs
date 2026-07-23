#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SHA40 = /^[a-f0-9]{40}$/;
const SHA64 = /^[a-f0-9]{64}$/;
const PLACEHOLDER = /\b(todo|tbd|placeholder|example only|replace me)\b/i;

export function validateSignoff(document, requirement, { targetSha, now = new Date() }) {
  const failures = [];
  const raw = JSON.stringify(document);
  if (PLACEHOLDER.test(raw)) failures.push('placeholder_forbidden');
  if (document?.schema !== 'risck-comply.qualified-review-signoff.v1') failures.push('schema_invalid');
  if (document?.repository !== 'renanescola40-afk/eurocomply_saas') failures.push('repository_mismatch');
  if (!SHA40.test(String(document?.targetSha || '')) || document.targetSha !== targetSha) failures.push('target_sha_mismatch');
  if (document?.requirementId !== requirement.id) failures.push('requirement_mismatch');
  if (!document?.reviewer?.name || !document?.reviewer?.organization || !document?.reviewer?.qualification) failures.push('reviewer_identity_or_qualification_missing');
  if (!SHA64.test(String(document?.reviewer?.emailHash || ''))) failures.push('reviewer_email_hash_invalid');
  if (document?.independence?.conflictFree !== true || document?.independence?.notAuthor !== true || document?.independence?.notApprover !== true) failures.push('independence_failed');
  if (String(document?.independence?.statement || '').length < 20) failures.push('independence_statement_missing');
  const reviewedAt = new Date(document?.reviewedAt || 'invalid');
  const expiresAt = new Date(document?.expiresAt || 'invalid');
  if (Number.isNaN(reviewedAt.getTime()) || Number.isNaN(expiresAt.getTime()) || reviewedAt > now || expiresAt <= now) failures.push('review_window_invalid');
  if (!Array.isArray(document?.answers) || document.answers.length !== requirement.questions.length) failures.push('review_answers_incomplete');
  if (document?.answers?.some((answer) => !requirement.questions.includes(answer.question))) failures.push('review_question_mismatch');
  if (document?.answers?.some((answer) => String(answer.answer || '').length < 20)) failures.push('review_answer_too_short');
  if (document?.answers?.some((answer) => answer.finding === 'FAIL')) failures.push('failed_finding_present');
  if (!['ACCEPTED','ACCEPTED_WITH_CONDITIONS'].includes(document?.conclusion)) failures.push('conclusion_not_accepted');
  if (document?.conclusion === 'ACCEPTED_WITH_CONDITIONS' && (!Array.isArray(document?.conditions) || document.conditions.length === 0)) failures.push('conditions_missing');
  if (!SHA64.test(String(document?.integrity?.evidenceBundleSha256 || '')) || !SHA64.test(String(document?.integrity?.signoffSha256 || ''))) failures.push('integrity_invalid');
  const copy = structuredClone(document || {});
  if (copy.integrity) copy.integrity.signoffSha256 = '';
  const computed = crypto.createHash('sha256').update(JSON.stringify(copy)).digest('hex');
  if (document?.integrity?.signoffSha256 !== computed) failures.push('signoff_digest_mismatch');
  return failures;
}

export function evaluateSignoffs({ registry, targetSha, root = process.cwd(), now = new Date() }) {
  const results = registry.requirements.map((requirement) => {
    const staged = path.join(root, 'docs/compliance/evidence/staging', `${requirement.id}.signoff.json`);
    if (!fs.existsSync(staged)) return { id: requirement.id, weight: requirement.weight, state: 'missing', failures: ['file_missing'] };
    try {
      const document = JSON.parse(fs.readFileSync(staged, 'utf8'));
      const failures = validateSignoff(document, requirement, { targetSha, now });
      return { id: requirement.id, weight: requirement.weight, state: failures.length ? 'invalid' : 'accepted', failures };
    } catch { return { id: requirement.id, weight: requirement.weight, state: 'invalid', failures: ['invalid_json'] }; }
  });
  const acceptedWeight = results.filter((r) => r.state === 'accepted').reduce((sum, r) => sum + r.weight, 0);
  return { schema: 'risck-comply.qualified-review-execution-report.v1', targetSha, acceptedWeight, remainingWeight: 51 - acceptedWeight, passed: acceptedWeight === 51, results };
}

function main() {
  const registry = JSON.parse(fs.readFileSync('docs/compliance/evidence/qualified-review-execution-registry.json','utf8'));
  const targetSha = String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
  const report = evaluateSignoffs({ registry, targetSha });
  fs.mkdirSync('artifacts/qualified-review-execution', { recursive: true });
  fs.writeFileSync('artifacts/qualified-review-execution/report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes('--strict') && !report.passed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main();

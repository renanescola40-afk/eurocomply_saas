#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA_PATTERN = /^[a-f0-9]{40}$/;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const FORBIDDEN_KEY = /(password|secret|token|authorization|cookie|connection|string|service[_-]?role|database[_-]?url)/i;
const FORBIDDEN_VALUE = /(postgres(?:ql)?:\/\/|supabase_service_role|bearer\s+[a-z0-9._-]+|sk_(?:live|test)_|whsec_)/i;

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function push(errors, condition, message) {
  if (!condition) errors.push(message);
}

function scanSensitive(value, location = '$', findings = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanSensitive(entry, `${location}[${index}]`, findings));
    return findings;
  }
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (FORBIDDEN_KEY.test(key)) findings.push(`${location}.${key}: forbidden key`);
      scanSensitive(entry, `${location}.${key}`, findings);
    }
    return findings;
  }
  if (typeof value === 'string' && FORBIDDEN_VALUE.test(value)) {
    findings.push(`${location}: forbidden sensitive value`);
  }
  return findings;
}

export function validateRestoreEvidence(evidence, expectedSha) {
  const errors = [];
  push(errors, evidence && typeof evidence === 'object' && !Array.isArray(evidence), 'evidence must be an object');
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return { ok: false, errors };

  push(errors, evidence.schemaVersion === 1, 'schemaVersion must equal 1');
  push(errors, SHA_PATTERN.test(evidence.sourceSha ?? ''), 'sourceSha must be a 40-character lowercase commit SHA');
  push(errors, !expectedSha || evidence.sourceSha === expectedSha, 'sourceSha must match EXPECTED_MAIN_SHA');
  push(errors, evidence.environment === 'production-restore-drill', 'environment must be production-restore-drill');
  push(errors, ISO_PATTERN.test(evidence.startedAt ?? ''), 'startedAt must be an ISO UTC timestamp');
  push(errors, ISO_PATTERN.test(evidence.completedAt ?? ''), 'completedAt must be an ISO UTC timestamp');

  const started = Date.parse(evidence.startedAt ?? '');
  const completed = Date.parse(evidence.completedAt ?? '');
  push(errors, Number.isFinite(started) && Number.isFinite(completed) && completed >= started, 'completedAt must not precede startedAt');
  push(errors, Number.isFinite(evidence.rpoMinutes) && evidence.rpoMinutes >= 0, 'rpoMinutes must be a non-negative number');
  push(errors, Number.isFinite(evidence.rtoMinutes) && evidence.rtoMinutes > 0, 'rtoMinutes must be a positive number');
  push(errors, typeof evidence.backupIdHash === 'string' && /^[a-f0-9]{64}$/.test(evidence.backupIdHash), 'backupIdHash must be a SHA-256 digest');
  push(errors, typeof evidence.restoreTargetHash === 'string' && /^[a-f0-9]{64}$/.test(evidence.restoreTargetHash), 'restoreTargetHash must be a SHA-256 digest');
  push(errors, evidence.restoreTargetIsIsolated === true, 'restore target must be isolated');
  push(errors, evidence.productionMutationPerformed === false, 'productionMutationPerformed must be false');

  const checks = evidence.checks;
  push(errors, checks && typeof checks === 'object' && !Array.isArray(checks), 'checks must be an object');
  const requiredChecks = [
    'backupAvailable',
    'restoreCompleted',
    'schemaVerified',
    'migrationHistoryVerified',
    'rlsVerified',
    'tenantIsolationVerified',
    'criticalCountsVerified',
    'authBoundaryVerified',
    'applicationSmokeVerified',
    'cleanupVerified',
  ];
  for (const check of requiredChecks) push(errors, checks?.[check] === true, `checks.${check} must be true`);

  push(errors, typeof evidence.operator === 'object' && typeof evidence.operator.role === 'string' && evidence.operator.role.length >= 3, 'operator.role is required');
  push(errors, evidence.approval && evidence.approval.status === 'approved', 'approval.status must be approved');
  push(errors, typeof evidence.approval?.approverRole === 'string' && evidence.approval.approverRole.length >= 3, 'approval.approverRole is required');
  push(errors, evidence.approval?.independentFromOperator === true, 'approval must be independent from the operator');
  push(errors, typeof evidence.notes === 'string' && evidence.notes.length <= 2000, 'notes must be a string of at most 2000 characters');

  const sensitiveFindings = scanSensitive(evidence);
  for (const finding of sensitiveFindings) errors.push(`sensitive data rejected at ${finding}`);

  return { ok: errors.length === 0, errors };
}

export function buildPromotion(evidence) {
  const canonical = JSON.stringify(evidence);
  return {
    schemaVersion: 1,
    status: 'Complete',
    outcome: 'passed',
    sourceSha: evidence.sourceSha,
    completedAt: evidence.completedAt,
    rpoMinutes: evidence.rpoMinutes,
    rtoMinutes: evidence.rtoMinutes,
    evidenceSha256: sha256(canonical),
    controls: Object.keys(evidence.checks).sort(),
    truthBoundary: 'Repository validation confirms the supplied sanitized drill record only; provider execution remains evidenced by the approved source artifact.',
  };
}

async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3] ?? 'artifacts/enterprise-restore-drill/promoted-restore-evidence.json';
  if (!inputPath) throw new Error('Usage: validate-restore-drill-evidence.mjs <input.json> [output.json]');
  const evidence = JSON.parse(await readFile(inputPath, 'utf8'));
  const result = validateRestoreEvidence(evidence, process.env.EXPECTED_MAIN_SHA);
  if (!result.ok) {
    console.error(JSON.stringify({ status: 'Rejected', errors: result.errors }, null, 2));
    process.exitCode = 1;
    return;
  }
  const promotion = buildPromotion(evidence);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(promotion, null, 2)}\n`);
  console.log(JSON.stringify(promotion, null, 2));
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const evidenceDir = path.resolve('docs/security/evidence/runtime');
const outputPath = path.join(evidenceDir, 'enterprise-evidence-bundle-verification.json');
const expectedSha = (process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA || '').trim();

const required = [
  { file: 'deployment-smoke-validation.json', commitBound: true },
  { file: 'observability-smoke-validation.json', commitBound: true },
  { file: 'rollback-dry-run-validation.json', commitBound: true },
  { file: 'supabase-live-rls-validation.json', commitBound: true },
  { file: 'production-final-validation.json', commitBound: true },
  { file: 'final-validation-runner.json', commitBound: true },
  { file: 'enterprise-runtime-evidence.json', commitBound: true },
  { file: 'release-go-no-go.json', commitBound: true, requiresGo: true },
  { file: 'branch-protection-required-checks.json', commitBound: false },
  { file: 'stripe-billing-validation.json', commitBound: true },
  { file: 'upload-malware-scan-validation.json', commitBound: true },
  { file: 'auth-rbac-final-validation.json', commitBound: true },
  { file: 'step-up-mfa-validation.json', commitBound: true },
  { file: 'audit-chain-live-validation.json', commitBound: true },
  { file: 'external-security-review-or-pentest.json', commitBound: false },
];

const successTokens = new Set(['complete', 'completed', 'passed', 'pass', 'success', 'successful', 'go', 'approved']);
const failureTokens = new Set(['pending', 'incomplete', 'failed', 'failure', 'blocked', 'no-go', 'nogo', 'rejected', 'missing', 'expired']);

function collectDecisionValues(value, key = '', output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectDecisionValues(item, key, output);
    return output;
  }

  if (value && typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) {
      collectDecisionValues(childValue, childKey, output);
    }
    return output;
  }

  if (typeof value === 'string' && /status|outcome|result|decision|state|verdict/i.test(key)) {
    output.push(value.trim().toLowerCase());
  }

  return output;
}

function containsExpectedSha(document) {
  if (!expectedSha) return false;
  return JSON.stringify(document).toLowerCase().includes(expectedSha.toLowerCase());
}

async function inspect(entry) {
  const filePath = path.join(evidenceDir, entry.file);
  try {
    const raw = await readFile(filePath, 'utf8');
    const document = JSON.parse(raw);
    const decisions = collectDecisionValues(document);
    const hasFailure = decisions.some((value) => failureTokens.has(value));
    const hasSuccess = decisions.some((value) => successTokens.has(value));
    const hasGo = decisions.includes('go') || decisions.includes('approved');
    const shaMatches = !entry.commitBound || containsExpectedSha(document);
    const reasons = [];

    if (!hasSuccess) reasons.push('no explicit successful status/outcome found');
    if (hasFailure) reasons.push('blocking or failed status/outcome found');
    if (entry.requiresGo && !hasGo) reasons.push('final Go decision not found');
    if (entry.commitBound && !expectedSha) reasons.push('RELEASE_COMMIT_SHA/GITHUB_SHA is missing');
    if (entry.commitBound && expectedSha && !shaMatches) reasons.push('evidence is not tied to the promoted commit SHA');

    return {
      file: entry.file,
      ok: reasons.length === 0,
      commitBound: entry.commitBound,
      shaMatches,
      decisions: [...new Set(decisions)].slice(0, 20),
      reasons,
    };
  } catch (error) {
    return {
      file: entry.file,
      ok: false,
      commitBound: entry.commitBound,
      shaMatches: false,
      decisions: [],
      reasons: [error?.code === 'ENOENT' ? 'required evidence file is missing' : 'evidence is unreadable or invalid JSON'],
    };
  }
}

const checks = [];
for (const entry of required) checks.push(await inspect(entry));

const failed = checks.filter((check) => !check.ok);
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  releaseCommitSha: expectedSha || null,
  status: failed.length === 0 ? 'Complete' : 'Blocked',
  outcome: failed.length === 0 ? 'passed' : 'failed',
  finalDecision: failed.length === 0 ? 'Go' : 'No-Go',
  totals: {
    required: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
  },
  checks,
};

await mkdir(evidenceDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (failed.length > 0) {
  console.error(`Enterprise evidence bundle is incomplete: ${failed.length}/${checks.length} checks failed.`);
  for (const check of failed) console.error(`- ${check.file}: ${check.reasons.join('; ')}`);
  process.exit(1);
}

console.log(`Enterprise evidence bundle passed for ${expectedSha}.`);

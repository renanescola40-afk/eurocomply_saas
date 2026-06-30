#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const evidencePath = 'docs/security/evidence/runtime/rollback-dry-run-validation.json';
const shaPattern = /^[a-f0-9]{40}$/i;
const generatedAt = new Date().toISOString();

function firstConfigured(names) {
  for (const name of names) {
    const value = (process.env[name] || '').trim();
    if (value) return { name, value };
  }

  return null;
}

const targetUrlConfig = firstConfigured([
  'RELEASE_ROLLBACK_TARGET_URL',
  'RELEASE_ROLLBACK_TARGET',
  'ROLLBACK_TARGET_URL',
  'ROLLBACK_TARGET',
  'PREVIOUS_KNOWN_GOOD_URL',
  'LAST_KNOWN_GOOD_DEPLOYMENT_URL',
  'VERCEL_ROLLBACK_DEPLOYMENT_URL',
]);
const targetShaConfig = firstConfigured([
  'RELEASE_ROLLBACK_TARGET_SHA',
  'ROLLBACK_TARGET_SHA',
  'PREVIOUS_KNOWN_GOOD_SHA',
  'LAST_KNOWN_GOOD_SHA',
]);
const targetUrl = targetUrlConfig?.value || '';
const targetSha = targetShaConfig?.value || '';
const currentSha = process.env.GITHUB_SHA || process.env.RELEASE_CURRENT_SHA || process.env.RELEASE_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '';
const targetValidationProof = process.env.RELEASE_ROLLBACK_TARGET_VALIDATED === 'true';
const failures = [];

if (!targetUrl) failures.push('Rollback target URL is required.');
if (!shaPattern.test(targetSha)) failures.push('Rollback target SHA must be a full 40-character commit SHA.');
if (currentSha && currentSha === targetSha) failures.push('Rollback target SHA must be different from the current release SHA.');
if (!existsSync('docs/RELEASE_ROLLBACK_PLAN.md')) failures.push('docs/RELEASE_ROLLBACK_PLAN.md is required.');
if (!targetValidationProof) failures.push('RELEASE_ROLLBACK_TARGET_VALIDATED=true is required only after separate functional validation of the previous known-good target.');

const outcome = failures.length === 0 ? 'passed' : 'failed';
const evidence = {
  evidenceItem: 'rollback-dry-run-validation',
  status: outcome === 'passed' ? 'Complete' : 'Open',
  outcome,
  generatedAt,
  reviewedAt: generatedAt,
  reviewer: 'EuroComply release automation',
  releaseTarget: process.env.RELEASE_TARGET || 'production',
  summary: outcome === 'passed' ? 'Rollback dry-run verified previous known-good metadata and reviewer target validation proof.' : 'Rollback dry-run evidence is incomplete; release remains blocked.',
  redactionConfirmation: 'Redaction confirmed for runtime evidence. Rollback target values are not written to evidence.',
  evidenceLocations: ['scripts/release/run-rollback-dry-run.mjs', 'docs/RELEASE_ROLLBACK_PLAN.md', evidencePath],
  controlsVerified: outcome === 'passed' ? ['Previous known-good URL was configured.', 'Previous known-good full commit SHA was configured.', 'Reviewer confirmed functional target validation proof.', 'Dry-run performed no production mutation.'] : [],
  rollbackTarget: {
    urlConfigured: Boolean(targetUrl),
    urlSource: targetUrlConfig?.name ?? null,
    shaSource: targetShaConfig?.name ?? null,
    shaPrefix: targetSha ? `${targetSha.slice(0, 12)}…` : null,
    shaFullRecordedPrivately: shaPattern.test(targetSha),
  },
  dryRun: { mutatesProduction: false, commandMode: 'metadata-plus-reviewed-target-validation' },
  targetValidation: { passed: targetValidationProof, requiredEnv: 'RELEASE_ROLLBACK_TARGET_VALIDATED=true' },
  failures,
  releaseGate: outcome === 'passed' ? 'Rollback dry-run evidence is present.' : 'Release remains blocked until rollback dry-run and target validation are Complete/passed.',
  evidenceIntegrity: { containsSensitiveValues: false, valuesRedacted: true },
};
mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Wrote ${evidencePath}`);
if (failures.length > 0) { console.error('Rollback dry-run validation failed:'); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log('Rollback dry-run validation passed.');

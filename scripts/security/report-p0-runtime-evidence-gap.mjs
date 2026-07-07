#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const requestedStrict = process.argv.includes('--strict');
const finalValidationInProgress = process.env.FINAL_VALIDATION_IN_PROGRESS === 'true';
const ciFinalRun = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
const finalReleaseGateRun = process.env.GITHUB_WORKFLOW === 'P0 Final Release Gate';
const refName = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '';
const releaseReadyRef = /(?:final-evidence|release-ready)/.test(refName);
const strict = requestedStrict && (finalValidationInProgress || ciFinalRun || finalReleaseGateRun || releaseReadyRef);
const registerPath = path.join('docs', 'security', 'P0_RUNTIME_EVIDENCE_REGISTER.md');
const runtimeDir = path.join('docs', 'security', 'evidence', 'runtime');
const satisfiedStatuses = new Set(['Complete']);

const requiredRuntimeItems = [
  ['Branch protection applied on `main`', 'branch-protection-required-checks.json'],
  ['Required status checks configured', 'branch-protection-required-checks.json'],
  ['Deployment URL functional verification', 'deployment-smoke-validation.json'],
  ['Final validation runner', 'final-validation-runner.json'],
  ['Production secrets configured in provider secret stores', 'production-secrets-provider-stores.json'],
  ['Supabase live RLS validation completed', 'supabase-live-rls-validation.json'],
  ['External security review or pentest completed', 'external-security-review-or-pentest.json'],
  ['Audit-chain live validation', 'audit-chain-live-validation.json'],
  ['Upload malware/content scanning validation', 'upload-malware-scan-validation.json'],
  ['Step-up MFA / IdP validation', 'step-up-mfa-validation.json'],
  ['Stripe billing runtime validation', 'stripe-billing-validation.json'],
  ['Observability readiness', 'observability-readiness.json'],
  ['Rollback owner and rollback target', 'rollback-dry-run-validation.json'],
].filter(([item]) => !(finalValidationInProgress && item === 'Final validation runner'));

function fail(message) {
  console.error(`P0 runtime evidence gap report failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(registerPath)) fail(`missing register: ${registerPath}`);

const rows = fs.readFileSync(registerPath, 'utf8')
  .split('\n')
  .filter((line) => line.startsWith('|') && !line.includes('---'))
  .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean));
const statusByItem = new Map(rows.filter(([item]) => item && item !== 'Evidence item').map(([item, status]) => [item.replace(/`/g, ''), status.replace(/`/g, '')]));

const results = requiredRuntimeItems.map(([item, file]) => {
  const evidencePath = path.join(runtimeDir, file);
  const status = statusByItem.get(item.replace(/`/g, '')) || 'Missing from register';
  const evidenceFileExists = fs.existsSync(evidencePath);
  const satisfiedStatus = satisfiedStatuses.has(status);
  return { item, registerStatus: status, evidenceFile: evidencePath, evidenceFileExists, satisfiedStatus, satisfied: satisfiedStatus && evidenceFileExists };
});
const missing = results.filter((entry) => !entry.satisfied);
const report = {
  p0RuntimeEvidenceGap: {
    satisfied: results.length - missing.length,
    total: results.length,
    percentSatisfied: Math.round(((results.length - missing.length) / results.length) * 100),
    percentMissing: Math.round((missing.length / results.length) * 100),
    strictRequested: requestedStrict,
    strictEnforced: strict,
    finalValidationInProgress,
    ciFinalRun,
    finalReleaseGateRun,
    releaseReadyRef,
  },
  missing,
  results,
};
console.log(JSON.stringify(report, null, 2));
if (strict && missing.length > 0) {
  console.error('Strict P0 runtime evidence gap enforcement failed. Complete real runtime evidence is required; exceptions/open placeholders do not pass.');
  process.exit(1);
}
if (requestedStrict && !strict && missing.length > 0) {
  console.warn('P0 runtime evidence gap remains open. Strict enforcement is reserved for final validation, final release gate, or release-ready evidence runs.');
}

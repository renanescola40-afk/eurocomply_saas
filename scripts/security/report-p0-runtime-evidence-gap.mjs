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
  {
    item: 'Branch protection applied on `main`',
    aliases: ['Branch protection applied on main'],
    file: 'branch-protection-required-checks.json',
  },
  {
    item: 'Required status checks configured',
    file: 'branch-protection-required-checks.json',
  },
  {
    item: 'Production provider configuration evidence',
    aliases: ['Production secrets configured in provider secret stores'],
    file: 'production-secrets-provider-stores.json',
  },
  {
    item: 'Supabase live RLS validation completed',
    file: 'supabase-live-rls-validation.json',
  },
  {
    item: 'External review',
    aliases: ['External security review or pentest completed'],
    file: 'external-security-review-or-pentest.json',
  },
  {
    item: 'Deployment URL functional verification',
    file: 'deployment-smoke-validation.json',
  },
  {
    item: 'Final validation runner',
    file: 'final-validation-runner.json',
    skipWhenFinalValidationInProgress: true,
  },
  {
    item: 'Audit-chain live validation',
    file: 'audit-chain-live-validation.json',
  },
  {
    item: 'Upload malware/content scanning validation',
    file: 'upload-malware-scan-validation.json',
  },
  {
    item: 'Step-up MFA / IdP validation',
    file: 'step-up-mfa-validation.json',
  },
  {
    item: 'Stripe billing runtime validation',
    file: 'stripe-billing-validation.json',
  },
  {
    item: 'Observability readiness',
    file: 'observability-smoke-validation.json',
    aliases: ['Observability smoke validation'],
  },
  {
    item: 'Rollback owner and rollback target',
    file: 'rollback-dry-run-validation.json',
  },
].filter((entry) => !(finalValidationInProgress && entry.skipWhenFinalValidationInProgress));

function fail(message) {
  console.error(`P0 runtime evidence gap report failed: ${message}`);
  process.exit(1);
}

function normalizeItem(item) {
  return String(item ?? '').replace(/`/g, '').trim();
}

if (!fs.existsSync(registerPath)) fail(`missing register: ${registerPath}`);

const rows = fs.readFileSync(registerPath, 'utf8')
  .split('\n')
  .filter((line) => line.startsWith('|') && !line.includes('---'))
  .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean));
const statusByItem = new Map(rows.filter(([item]) => item && item !== 'Evidence item').map(([item, status]) => [normalizeItem(item), status.replace(/`/g, '')]));

function statusFor(entry) {
  const names = [entry.item, ...(entry.aliases ?? [])].map(normalizeItem);
  for (const name of names) {
    const status = statusByItem.get(name);
    if (status) return status;
  }
  return 'Missing from register';
}

const results = requiredRuntimeItems.map((entry) => {
  const evidencePath = path.join(runtimeDir, entry.file);
  const status = statusFor(entry);
  const evidenceFileExists = fs.existsSync(evidencePath);
  const satisfiedStatus = satisfiedStatuses.has(status);
  return {
    item: entry.item,
    registerStatus: status,
    evidenceFile: evidencePath,
    evidenceFileExists,
    satisfiedStatus,
    satisfied: satisfiedStatus && evidenceFileExists,
  };
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

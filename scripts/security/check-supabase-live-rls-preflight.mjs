#!/usr/bin/env node
import fs from 'node:fs';

const workflowPath = '.github/workflows/supabase-live-rls-validation.yml';
const validatorPath = 'scripts/security/run-supabase-live-tenant-isolation.mjs';
const evidencePath = 'docs/security/evidence/runtime/supabase-live-rls-validation.json';
const registerPath = 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md';
const runbookPath = 'docs/security/SUPABASE_LIVE_RLS_WORKFLOW.md';
const tenantIsolationDocPath = 'docs/security/SUPABASE_RLS_TENANT_ISOLATION.md';
const requiredMigrationFragments = [
  '20260619_multi_tenant_rls_hardening.sql',
  '20260619103000_complete_multi_tenant_rls_policies.sql',
  '20260619111500_lock_backend_owned_rls_writes.sql',
  '20260619130000_drop_legacy_permissive_rls_policies.sql',
  '20260620120000_enterprise_multi_tenant_rls_final_lock.sql',
];
const requiredTables = [
  'organizations',
  'organization_members',
  'documents',
  'audit_events',
  'risks',
  'vendors',
  'tasks',
  'subscriptions',
  'notifications',
];
const requiredValidatorTokens = [
  'cross_tenant_read',
  'cross_tenant_insert',
  'cross_tenant_update',
  'cross_tenant_delete',
  'same_tenant_read',
  'same_tenant_insert',
  'markRegisterComplete',
  'tableCoverageFrom',
  'buildEvidencePayload',
  'validatePassingEvidence',
  'supabaseProjectReferenceRedacted',
  'commandUsed',
  'commitSha',
  '--advisory',
];
const requiredWorkflowTokens = [
  'workflow_dispatch',
  validatorPath,
  evidencePath,
  registerPath,
  'gh pr create',
];
const failures = [];

function read(file) {
  if (!fs.existsSync(file)) {
    failures.push(`${file} is missing`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function requireTokens(label, text, tokens) {
  for (const token of tokens) {
    if (!text.includes(token)) failures.push(`${label} missing required token: ${token}`);
  }
}

const workflow = read(workflowPath);
const validator = read(validatorPath);
const evidenceText = read(evidencePath);
const register = read(registerPath);
const runbook = read(runbookPath);
const tenantIsolationDoc = read(tenantIsolationDocPath);
const migrations = fs.existsSync('supabase/migrations')
  ? fs.readdirSync('supabase/migrations').join('\n')
  : '';

requireTokens(workflowPath, workflow, requiredWorkflowTokens);
requireTokens(validatorPath, validator, [...requiredValidatorTokens, ...requiredTables]);
requireTokens('supabase/migrations', migrations, requiredMigrationFragments);
requireTokens(registerPath, register, [
  'Supabase live RLS validation completed',
  'run-supabase-live-tenant-isolation.mjs --update-register',
  'Open',
]);
requireTokens(runbookPath, runbook, [
  'Supabase Live RLS',
  'run-supabase-live-tenant-isolation.mjs',
  evidencePath,
  registerPath,
]);
requireTokens(tenantIsolationDocPath, tenantIsolationDoc, [
  'Supabase RLS Tenant Isolation',
  'tasks',
  'audit_events',
  'same-tenant inserts',
  'advisory mode',
  'Public production and enterprise procurement stay blocked',
]);

try {
  const evidence = JSON.parse(evidenceText);
  if (evidence.evidenceItem !== 'supabase-live-rls-validation') failures.push(`${evidencePath} has unexpected evidenceItem`);
  if (!['Open', 'Complete'].includes(evidence.status)) failures.push(`${evidencePath} status must be Open or Complete`);
  if (evidence.status === 'Complete' && evidence.outcome !== 'passed') failures.push(`${evidencePath} Complete evidence must have outcome passed`);
  if (evidence.status === 'Open' && !String(evidence.productionGate ?? '').toLowerCase().includes('blocked')) {
    failures.push(`${evidencePath} Open evidence must keep production blocked`);
  }
} catch (error) {
  failures.push(`${evidencePath} is invalid JSON: ${error instanceof Error ? error.message : error}`);
}

const report = {
  checkedAt: new Date().toISOString(),
  status: failures.length === 0 ? 'ready_for_live_run' : 'blocked',
  nextStep: failures.length === 0
    ? 'Run the Supabase Live RLS Validation workflow with target project credentials configured.'
    : 'Fix preflight failures before running the live validation workflow.',
  remainingTo100Percent: failures.length === 0
    ? 'Runtime execution only: apply migrations, run live workflow, review and merge generated evidence PR.'
    : 'Repository setup still has preflight gaps.',
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;

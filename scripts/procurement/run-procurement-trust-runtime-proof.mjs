#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const output = 'docs/security/evidence/runtime/procurement-trust-validation.json';
const env = (name) => String(process.env[name] ?? '').trim();
const failures = [];
const checks = {
  protectedMainExecution: env('GITHUB_ACTIONS') === 'true' && env('GITHUB_REF_NAME') === 'main',
  exactShaBound: /^[a-f0-9]{40}$/i.test(env('GITHUB_SHA')),
  explicitConfirmation: env('PROCUREMENT_TRUST_CONFIRMATION') === 'EXECUTE_PROCUREMENT_TRUST_PROOF',
};

function requireCheck(condition, code) {
  if (!condition) throw new Error(code);
}

function query(sql) {
  return execFileSync('psql', [env('RECOVERY_ISOLATED_DATABASE_URL'), '-Atqc', sql], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 20_000,
  }).trim();
}

try {
  requireCheck(Boolean(env('RECOVERY_ISOLATED_DATABASE_URL')), 'missing_recovery_isolated_database_url');
  requireCheck(Boolean(env('TRUST_CENTER_PUBLIC_URL')), 'missing_trust_center_public_url');
  requireCheck(Object.values(checks).every(Boolean), 'procurement_trust_preconditions_failed');

  const tables = Number(query("select count(*) from information_schema.tables where table_schema='public' and table_name in ('vendor_due_diligence','enterprise_procurement_requests','trust_evidence_packages')"));
  requireCheck(tables === 3, 'procurement_tables_missing');
  checks.procurementTablesPresent = true;

  const rls = Number(query("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('vendor_due_diligence','enterprise_procurement_requests','trust_evidence_packages') and c.relrowsecurity"));
  requireCheck(rls === 3, 'procurement_rls_missing');
  checks.rlsEnabled = true;

  const policies = Number(query("select count(*) from pg_policies where schemaname='public' and tablename in ('vendor_due_diligence','enterprise_procurement_requests','trust_evidence_packages')"));
  requireCheck(policies >= 12, 'procurement_policy_coverage_incomplete');
  checks.completeCrudPoliciesPresent = true;

  const digestConstraint = Number(query("select count(*) from pg_constraint where conrelid='public.trust_evidence_packages'::regclass and pg_get_constraintdef(oid) like '%digest_sha256%'"));
  requireCheck(digestConstraint >= 1, 'trust_digest_constraint_missing');
  checks.trustPackageIntegrityEnforced = true;

  const slaDays = Number(env('PROCUREMENT_SLA_DAYS'));
  requireCheck(Number.isInteger(slaDays) && slaDays >= 1 && slaDays <= 30, 'procurement_sla_invalid');
  checks.procurementSlaConfigured = true;

  requireCheck(env('TRUST_PACKAGE_ENCRYPTION_REQUIRED') === 'true', 'trust_package_encryption_not_required');
  checks.encryptedEvidencePackagesRequired = true;

  requireCheck(env('SUBPROCESSOR_REGISTER_REVIEWED') === 'true', 'subprocessor_register_not_reviewed');
  checks.subprocessorRegisterReviewed = true;

  const trustUrl = new URL(env('TRUST_CENTER_PUBLIC_URL'));
  requireCheck(trustUrl.protocol === 'https:', 'trust_center_url_not_https');
  checks.publicTrustCenterConfigured = true;
} catch (error) {
  failures.push(error instanceof Error ? error.message : 'unknown_procurement_trust_failure');
}

const passed = failures.length === 0 && Object.values(checks).every(Boolean);
const evidence = {
  schema: 'risck-comply.procurement-trust-evidence.v1',
  evidenceItem: 'procurement-trust-validation',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(),
  targetSha: env('GITHUB_SHA') || null,
  workflowRunId: env('GITHUB_RUN_ID') || null,
  checks,
  failures: [...new Set(failures)],
  evidenceIntegrity: {
    databaseUrlStored: false,
    customerDataStored: false,
    vendorNamesStored: false,
    questionnaireAnswersStored: false,
    evidencePayloadStored: false,
    tokensStored: false,
  },
  boundary: 'Validates isolated procurement and trust control structure without reading or persisting customer, vendor, questionnaire or evidence-package content.',
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
if (!passed) process.exit(1);

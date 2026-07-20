#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const output = 'docs/security/evidence/runtime/incident-continuity-validation.json';
const env = (name) => String(process.env[name] ?? '').trim();
const failures = [];
const required = ['RECOVERY_ISOLATED_DATABASE_URL','INCIDENT_PROOF_CONFIRMATION','GITHUB_SHA','GITHUB_RUN_ID'];
for (const name of required) if (!env(name)) failures.push(`missing_${name.toLowerCase()}`);

const exactSha = /^[a-f0-9]{40}$/i.test(env('GITHUB_SHA'));
const protectedMain = env('GITHUB_ACTIONS') === 'true' && env('GITHUB_REF_NAME') === 'main';
const confirmed = env('INCIDENT_PROOF_CONFIRMATION') === 'EXECUTE_INCIDENT_CONTINUITY_PROOF';
const acknowledgementTarget = Number(env('INCIDENT_SEV1_ACK_TARGET_MINUTES'));
const containmentTarget = Number(env('INCIDENT_SEV1_CONTAINMENT_TARGET_MINUTES'));
const tabletopAgeDays = Number(env('INCIDENT_TABLETOP_MAX_AGE_DAYS'));
const oncallConfigured = env('INCIDENT_ONCALL_ROTATION_CONFIGURED') === 'true';
const notificationReviewed = env('INCIDENT_NOTIFICATION_MATRIX_REVIEWED') === 'true';

const query = (sql) => execFileSync('psql', [env('RECOVERY_ISOLATED_DATABASE_URL'), '--no-psqlrc', '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1', '--command', sql], { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim();
const requireTrue = (condition, code) => { if (!condition) throw new Error(code); };
const checks = {};

try {
  requireTrue(failures.length === 0 && exactSha && protectedMain && confirmed, 'incident_preconditions_failed');
  const tables = Number(query("select count(*) from information_schema.tables where table_schema='public' and table_name in ('security_incidents','incident_timeline_events','continuity_exercises')"));
  requireTrue(tables === 3, 'incident_tables_missing');
  checks.incidentTablesPresent = true;

  const rls = Number(query("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('security_incidents','incident_timeline_events','continuity_exercises') and c.relrowsecurity and c.relforcerowsecurity"));
  requireTrue(rls === 3, 'incident_forced_rls_missing');
  checks.forcedRlsEnabled = true;

  const policies = Number(query("select count(*) from pg_policies where schemaname='public' and tablename in ('security_incidents','incident_timeline_events','continuity_exercises')"));
  requireTrue(policies >= 12, 'incident_crud_policies_incomplete');
  checks.completeCrudPoliciesPresent = true;

  const severityConstraint = Number(query("select count(*) from pg_constraint where conrelid='public.security_incidents'::regclass and pg_get_constraintdef(oid) like '%sev1%'"));
  requireTrue(severityConstraint >= 1, 'incident_severity_constraint_missing');
  checks.severityModelPresent = true;

  const digestConstraints = Number(query("select count(*) from pg_constraint where conrelid in ('public.incident_timeline_events'::regclass,'public.continuity_exercises'::regclass) and pg_get_constraintdef(oid) like '%64%'"));
  requireTrue(digestConstraints >= 2, 'incident_evidence_digest_constraints_missing');
  checks.evidenceIntegrityConstraintsPresent = true;

  requireTrue(Number.isInteger(acknowledgementTarget) && acknowledgementTarget >= 1 && acknowledgementTarget <= 60, 'invalid_sev1_ack_target');
  checks.sev1AcknowledgementTargetConfigured = true;
  requireTrue(Number.isInteger(containmentTarget) && containmentTarget >= 5 && containmentTarget <= 240, 'invalid_sev1_containment_target');
  checks.sev1ContainmentTargetConfigured = true;
  requireTrue(Number.isInteger(tabletopAgeDays) && tabletopAgeDays >= 1 && tabletopAgeDays <= 365, 'invalid_tabletop_age');
  checks.tabletopFreshnessConfigured = true;
  requireTrue(oncallConfigured, 'oncall_rotation_not_configured');
  checks.oncallRotationConfigured = true;
  requireTrue(notificationReviewed, 'notification_matrix_not_reviewed');
  checks.notificationMatrixReviewed = true;
} catch (error) {
  failures.push(error instanceof Error ? error.message : 'unknown_incident_proof_failure');
}

const canonicalChecks = {
  protectedMainExecution: protectedMain === true,
  exactShaBound: exactSha === true,
  explicitConfirmation: confirmed === true,
  incidentTablesPresent: checks.incidentTablesPresent === true,
  forcedRlsEnabled: checks.forcedRlsEnabled === true,
  completeCrudPoliciesPresent: checks.completeCrudPoliciesPresent === true,
  severityModelPresent: checks.severityModelPresent === true,
  evidenceIntegrityConstraintsPresent: checks.evidenceIntegrityConstraintsPresent === true,
  sev1AcknowledgementTargetConfigured: checks.sev1AcknowledgementTargetConfigured === true,
  sev1ContainmentTargetConfigured: checks.sev1ContainmentTargetConfigured === true,
  tabletopFreshnessConfigured: checks.tabletopFreshnessConfigured === true,
  oncallRotationConfigured: checks.oncallRotationConfigured === true,
  notificationMatrixReviewed: checks.notificationMatrixReviewed === true,
};
const passed = failures.length === 0 && Object.values(canonicalChecks).every(Boolean);
const evidence = {
  schema: 'risck-comply.incident-continuity-evidence.v1',
  evidenceItem: 'incident-response-continuity-validation',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(),
  targetSha: exactSha ? env('GITHUB_SHA') : null,
  workflowRunId: env('GITHUB_RUN_ID') || null,
  checks: canonicalChecks,
  failures: [...new Set(failures)],
  evidenceIntegrity: { databaseUrlStored: false, incidentDataStored: false, timelineContentStored: false, personalDataStored: false, tokensStored: false },
  boundary: 'Schema and protected operational-attestation validation only. No incident records, customer data, timeline content, credentials or provider payloads are persisted.',
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
if (!passed) process.exit(1);

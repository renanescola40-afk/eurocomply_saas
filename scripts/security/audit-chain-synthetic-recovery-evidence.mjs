import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

function fail(code) {
  console.error(code);
  process.exit(1);
}

function readEvidence(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    fail('recovery_evidence_invalid_json');
  }
}

function expectedContext() {
  const targetSha = String(process.env.TARGET_SHA || '').toLowerCase();
  const sourceRunId = String(process.env.RECOVERY_SOURCE_RUN_ID || '');
  if (!/^[0-9a-f]{40}$/.test(targetSha)) fail('target_sha_invalid');
  if (!/^[0-9]+$/.test(sourceRunId)) fail('source_run_id_invalid');
  return { targetSha, sourceRunId };
}

function validateCommon(evidence) {
  const { targetSha, sourceRunId } = expectedContext();
  if (evidence?.schema !== 'risck-comply.audit-chain-synthetic-recovery.v1') fail('recovery_evidence_schema_invalid');
  if (evidence?.targetSha !== targetSha) fail('recovery_evidence_target_sha_mismatch');
  if (String(evidence?.sourceRunId || '') !== sourceRunId) fail('recovery_evidence_source_run_mismatch');
  if (evidence?.outcome !== 'passed') fail('recovery_evidence_outcome_invalid');
  if (evidence?.connectionPath !== 'supabase_session_pooler') fail('recovery_evidence_connection_path_invalid');
  if (evidence?.cleanup?.protectedOrganizationIdsTouched !== false) fail('protected_organization_ids_touched');
  if (evidence?.cleanup?.historicalFixtureCleanupAttempted !== false) fail('historical_fixture_cleanup_attempted');
  if (evidence?.evidenceIntegrity?.containsSensitiveValues !== false) fail('recovery_evidence_contains_sensitive_values');
  if (evidence?.evidenceIntegrity?.rawIdentifiersStored !== false) fail('recovery_evidence_contains_raw_identifiers');
  if (evidence?.evidenceIntegrity?.credentialsStored !== false) fail('recovery_evidence_contains_credentials');
  const scope = evidence?.syntheticScope || {};
  if (!Number.isInteger(Number(scope.organizationsMatched)) || Number(scope.organizationsMatched) < 1 || Number(scope.organizationsMatched) > 20) {
    fail('recovery_evidence_organization_scope_invalid');
  }
  if (!Number.isInteger(Number(scope.auditEventsMatched)) || Number(scope.auditEventsMatched) < 1 || Number(scope.auditEventsMatched) > 1000) {
    fail('recovery_evidence_audit_event_scope_invalid');
  }
  if (Number(scope.authUsersMatched) !== 0) fail('recovery_evidence_auth_user_scope_invalid');
}

function validatePreflight(path) {
  const evidence = readEvidence(path);
  validateCommon(evidence);
  if (evidence.status !== 'PreflightPassed') fail('recovery_preflight_status_invalid');
  if (evidence?.cleanup?.verified !== false) fail('recovery_preflight_cleanup_state_invalid');
  if (evidence?.cleanup?.transactional !== true) fail('recovery_preflight_transactional_flag_invalid');
  console.log('audit_chain_synthetic_recovery_preflight_evidence_valid');
}

function validateComplete(path) {
  const evidence = readEvidence(path);
  validateCommon(evidence);
  if (evidence.status !== 'Complete') fail('recovery_complete_status_invalid');
  if (evidence?.cleanup?.verified !== true) fail('recovery_cleanup_not_verified');
  if (evidence?.cleanup?.transactional !== true) fail('recovery_cleanup_not_transactional');
  console.log('audit_chain_synthetic_recovery_complete_evidence_valid');
}

function writeFailure(path) {
  const failureCode = String(process.env.RECOVERY_FAILURE_CODE || 'protected_recovery_failed')
    .replace(/[^A-Za-z0-9_.-]+/g, '_')
    .slice(0, 96) || 'protected_recovery_failed';
  const evidence = {
    schema: 'risck-comply.audit-chain-synthetic-recovery.v1',
    status: 'Failed',
    outcome: 'failed',
    generatedAt: new Date().toISOString(),
    targetSha: String(process.env.TARGET_SHA || '').toLowerCase(),
    sourceRunId: String(process.env.RECOVERY_SOURCE_RUN_ID || ''),
    recoveryWindow: {
      from: String(process.env.RECOVERY_FROM || ''),
      to: String(process.env.RECOVERY_TO || ''),
    },
    failureCode,
    cleanup: {
      verified: false,
      transactional: true,
      historicalFixtureCleanupAttempted: false,
      protectedOrganizationIdsTouched: false,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawIdentifiersStored: false,
      credentialsStored: false,
    },
    connectionPath: 'supabase_session_pooler',
  };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log('audit_chain_synthetic_recovery_failure_evidence_written');
}

const [mode, path] = process.argv.slice(2);
if (!path) fail('recovery_evidence_path_required');

switch (mode) {
  case 'validate-preflight':
    validatePreflight(path);
    break;
  case 'validate-complete':
    validateComplete(path);
    break;
  case 'write-failure':
    writeFailure(path);
    break;
  default:
    fail('recovery_evidence_mode_invalid');
}

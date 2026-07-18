#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DEFAULT_EVIDENCE_PATH = 'docs/security/evidence/runtime/supabase-rls-validation.json';
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[a-f0-9]{40}$/;
const EXPECTED_CHECKS = [
  'membershipIsolation',
  'crossTenantReadDenied',
  'crossTenantInsertDenied',
  'crossTenantUpdateDenied',
  'crossTenantDeleteDenied',
];

export function validateSupabaseRlsScorecardEvidence(evidence, expectedSha) {
  const failures = [];
  const normalizedSha = String(expectedSha || '').trim().toLowerCase();

  if (!FULL_SHA.test(normalizedSha)) failures.push('expected_sha_invalid');
  if (evidence?.schema !== 'risck-comply.supabase-rls-scorecard-evidence.v1') failures.push('schema_invalid');
  if (evidence?.evidenceItem !== 'supabase-rls-validation') failures.push('evidence_item_invalid');
  if (evidence?.status !== 'Complete' || evidence?.outcome !== 'passed') failures.push('evidence_not_complete');
  if (evidence?.repository !== REPOSITORY || evidence?.branch !== 'main') failures.push('provenance_invalid');
  if (evidence?.targetSha !== normalizedSha || evidence?.checkedOutSha !== normalizedSha) failures.push('sha_mismatch');
  if (evidence?.sourceEvidence?.trusted !== true) failures.push('source_not_trusted');
  if (!/^\d+$/.test(String(evidence?.sourceEvidence?.githubRunId || ''))) failures.push('source_run_id_invalid');
  if (evidence?.sourceEvidence?.projectReferenceRedacted !== true) failures.push('project_reference_not_redacted');
  if (!Array.isArray(evidence?.checks)) failures.push('checks_invalid');

  const checks = Array.isArray(evidence?.checks) ? evidence.checks : [];
  for (const name of EXPECTED_CHECKS) {
    if (!checks.some((check) => check?.name === name && check?.passed === true)) {
      failures.push(`check_not_passed:${name}`);
    }
  }
  if (checks.some((check) => !EXPECTED_CHECKS.includes(check?.name))) failures.push('unexpected_check');
  if (!Array.isArray(evidence?.controlsVerified) || EXPECTED_CHECKS.some((name) => !evidence.controlsVerified.includes(name))) failures.push('controls_verified_incomplete');
  if (!Array.isArray(evidence?.remainingControls) || evidence.remainingControls.length !== 0) failures.push('remaining_controls_present');
  if (!Array.isArray(evidence?.failures) || evidence.failures.length !== 0) failures.push('failures_present');
  if (evidence?.productionGate !== 'eligible for downstream enterprise gates') failures.push('production_gate_invalid');

  const integrity = evidence?.evidenceIntegrity;
  if (integrity?.containsSensitiveValues !== false) failures.push('sensitive_values_integrity_invalid');
  if (integrity?.runtimeProofInvented !== false) failures.push('runtime_integrity_invalid');
  if (integrity?.rawCredentialsStored !== false) failures.push('credentials_integrity_invalid');
  if (integrity?.accessTokensStored !== false) failures.push('token_integrity_invalid');
  if (integrity?.userIdentifiersStored !== false) failures.push('user_identifier_integrity_invalid');
  if (integrity?.organizationIdentifiersStored !== false) failures.push('organization_identifier_integrity_invalid');
  if (integrity?.rawProviderResponsesStored !== false) failures.push('provider_response_integrity_invalid');
  if (integrity?.projectReferenceRedacted !== true) failures.push('project_redaction_integrity_invalid');
  if (integrity?.exactShaBound !== true) failures.push('exact_sha_integrity_invalid');

  return { passed: failures.length === 0, failures };
}

export function checkSupabaseRlsScorecardEvidence({
  evidencePath = process.env.SUPABASE_RLS_SCORECARD_EVIDENCE_PATH || DEFAULT_EVIDENCE_PATH,
  expectedSha = process.env.ENTERPRISE_EXPECTED_SHA || process.env.TARGET_SHA || process.env.GITHUB_SHA || '',
} = {}) {
  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
  const validation = validateSupabaseRlsScorecardEvidence(evidence, expectedSha);
  if (!validation.passed) {
    throw new Error(`Supabase RLS scorecard evidence invalid: ${validation.failures.join(', ')}`);
  }
  console.log(`Supabase RLS scorecard evidence is valid for ${String(expectedSha).trim().toLowerCase()}.`);
  return evidence;
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  try {
    checkSupabaseRlsScorecardEvidence();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Supabase RLS scorecard evidence validation failed.');
    process.exit(1);
  }
}

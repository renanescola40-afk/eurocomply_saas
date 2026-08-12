import { requiredBranchProtectionChecks } from './validate-branch-protection-freshness.mjs';

const FULL_SHA = /^[a-f0-9]{40}$/;
const DEFAULT_MAX_AGE_DAYS = 7;
const REDACTION = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';

function timestamp(value) {
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSha(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function validateRequiredStatusChecksRuntimeEvidence(
  evidence,
  {
    now = new Date(),
    maxAgeDays = DEFAULT_MAX_AGE_DAYS,
    expectedRepository = 'renanescola40-afk/eurocomply_saas',
    expectedBranch = 'main',
    expectedCommitSha = '',
  } = {},
) {
  const failures = [];
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));
  const capturedAt = timestamp(evidence?.captured_at ?? evidence?.generatedAt);
  const expectedSha = normalizeSha(expectedCommitSha);

  if (!Number.isFinite(nowMs)) return ['validation clock must be a valid timestamp'];
  if (evidence?.schema !== 'risck-comply.required-status-checks-runtime-evidence.v1') {
    failures.push('schema must be risck-comply.required-status-checks-runtime-evidence.v1');
  }
  if (evidence?.evidenceItem !== 'required-status-checks') {
    failures.push('evidenceItem must be required-status-checks');
  }
  if (evidence?.evidence_type !== 'required-status-checks-configuration') {
    failures.push('evidence_type must be required-status-checks-configuration');
  }
  if (evidence?.status !== 'Complete') failures.push('status must be Complete');
  if (evidence?.outcome !== 'passed') failures.push('outcome must be passed');
  if (evidence?.repository !== expectedRepository) failures.push(`repository must be ${expectedRepository}`);
  if (evidence?.branch !== expectedBranch) failures.push(`branch must be ${expectedBranch}`);

  if (capturedAt === null) failures.push('captured_at must be an ISO-8601 timestamp');
  else {
    const ageMs = nowMs - capturedAt;
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    if (ageMs < 0) failures.push('captured_at must not be in the future');
    else if (ageMs > maxAgeMs) failures.push(`captured_at is older than ${maxAgeDays} days`);
  }

  const targetSha = normalizeSha(evidence?.targetSha);
  if (!FULL_SHA.test(targetSha)) failures.push('targetSha must be a full SHA');
  if (targetSha !== normalizeSha(evidence?.checkedOutSha)) {
    failures.push('targetSha and checkedOutSha must match');
  }
  if (targetSha !== normalizeSha(evidence?.currentMainSha)) {
    failures.push('targetSha and currentMainSha must match');
  }
  if (expectedSha) {
    if (!FULL_SHA.test(expectedSha)) failures.push('expectedCommitSha must be a full SHA');
    else if (targetSha !== expectedSha) failures.push('targetSha must match the exact assessed SHA');
  }

  if (evidence?.branch_protection?.require_status_checks !== true) {
    failures.push('branch_protection.require_status_checks must be true');
  }
  if (evidence?.branch_protection?.require_up_to_date_branch !== true) {
    failures.push('branch_protection.require_up_to_date_branch must be true');
  }

  for (const check of requiredBranchProtectionChecks) {
    if (!evidence?.required_status_checks?.includes(check)) {
      failures.push(`missing required status check: ${check}`);
    }
    if (!Array.isArray(evidence?.matchedRequiredChecks?.[check])
      || evidence.matchedRequiredChecks[check].length < 1) {
      failures.push(`required status check has no matched GitHub context: ${check}`);
    }
  }

  const sourceWorkflow = evidence?.sourceWorkflow;
  if (sourceWorkflow?.name !== 'P0 Runtime Evidence') {
    failures.push('sourceWorkflow.name must be P0 Runtime Evidence');
  }
  if (sourceWorkflow?.file !== '.github/workflows/p0-runtime-evidence.yml') {
    failures.push('sourceWorkflow.file is invalid');
  }
  if (!/^\d+$/.test(String(sourceWorkflow?.runId ?? ''))) {
    failures.push('sourceWorkflow.runId must be numeric');
  }
  if (sourceWorkflow?.exactShaBound !== true) {
    failures.push('sourceWorkflow.exactShaBound must be true');
  }

  if (evidence?.verification_provenance?.method !== 'github_api') {
    failures.push('verification_provenance.method must be github_api');
  }
  if (!String(evidence?.verification_provenance?.reference ?? '').startsWith('github-actions-run:')) {
    failures.push('verification_provenance.reference must identify the GitHub Actions run');
  }
  if (!timestamp(evidence?.verification_provenance?.verifiedAt)) {
    failures.push('verification_provenance.verifiedAt must be an ISO-8601 timestamp');
  }

  if (evidence?.provenance?.githubActions !== true) failures.push('GitHub Actions provenance is required');
  if (String(evidence?.provenance?.runId ?? '') !== String(sourceWorkflow?.runId ?? '')) {
    failures.push('provenance runId must match sourceWorkflow.runId');
  }
  if (evidence?.provenance?.exactShaBound !== true) failures.push('provenance.exactShaBound must be true');
  if (evidence?.provenance?.mainHeadMatched !== true) failures.push('provenance.mainHeadMatched must be true');

  if (!Array.isArray(evidence?.controlsVerified) || evidence.controlsVerified.length < 3) {
    failures.push('Complete evidence requires the three required-status-check controls');
  }
  if (!Array.isArray(evidence?.failures) || evidence.failures.length !== 0) {
    failures.push('Complete evidence cannot contain failures');
  }
  if (evidence?.broaderBranchProtectionSatisfied !== false) {
    failures.push('broaderBranchProtectionSatisfied must remain false for decomposed evidence');
  }
  if (!String(evidence?.evidenceBoundary ?? '').includes('does not prove approving-review count')) {
    failures.push('evidenceBoundary must preserve the broader branch-protection truth boundary');
  }
  if (evidence?.redactionConfirmation !== REDACTION) {
    failures.push('redaction confirmation is invalid');
  }
  if (!Array.isArray(evidence?.evidenceLocations) || evidence.evidenceLocations.length < 1) {
    failures.push('evidenceLocations are required');
  }
  if (evidence?.evidenceIntegrity?.containsSensitiveValues !== false) {
    failures.push('evidenceIntegrity.containsSensitiveValues must be false');
  }
  if (evidence?.evidenceIntegrity?.rawApiPayloadStored !== false) {
    failures.push('evidenceIntegrity.rawApiPayloadStored must be false');
  }
  if (evidence?.evidenceIntegrity?.accessTokensStored !== false) {
    failures.push('evidenceIntegrity.accessTokensStored must be false');
  }
  if (evidence?.evidenceIntegrity?.exactShaBound !== true) {
    failures.push('evidenceIntegrity.exactShaBound must be true');
  }
  if (evidence?.evidenceIntegrity?.sourceRunBound !== true) {
    failures.push('evidenceIntegrity.sourceRunBound must be true');
  }

  return failures;
}

const DEFAULT_MAX_AGE_DAYS = 7;
const FULL_SHA = /^[a-f0-9]{40}$/;

export const requiredBranchProtectionFlags = [
  'protect_branch',
  'require_pull_request',
  'require_code_owner_review',
  'dismiss_stale_reviews',
  'require_conversation_resolution',
  'require_status_checks',
  'require_up_to_date_branch',
  'block_force_pushes',
  'block_deletions',
  'restrict_direct_pushes',
];

export const requiredBranchProtectionChecks = [
  'Full Security Suite / Core CI, build and npm audit',
  'Full Security Suite / Actionlint',
  'Full Security Suite / Secret scanning (Gitleaks)',
  'Full Security Suite / Semgrep SAST',
  'Full Security Suite / CodeQL',
  'Full Security Suite / Dependency Review',
  'Full Security Suite / OSSF Scorecard',
  'Full Security Suite / Enterprise merge/deploy gate',
  'CI / quality',
  'RISCK COMPLY Security CI / Run security gates, typecheck and tests',
  'Gitleaks / Scan repository for accidental secret exposure',
  'Secret Scanning / Production secret readiness gate',
];

export const requiredBranchProtectionReleaseBlockers = [
  'full_security_suite_required',
  'lint_failure_blocks',
  'typecheck_failure_blocks',
  'test_failure_blocks',
  'build_failure_blocks',
  'security_ci_failure_blocks',
  'secret_scanning_failure_blocks',
  'untriaged_high_or_critical_npm_audit_blocks',
  'branch_protection_evidence_blocks',
  'strict_public_secret_scan_required',
  'hardcoded_secret_blocks',
  'package_lock_mismatch_blocks',
  'direct_push_main_is_release_risk_documented',
  'workflow_secret_log_exposure_blocks',
];

function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizeSha(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function validateBranchProtectionFreshness(
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
  const capturedAt = parseTimestamp(evidence?.captured_at ?? evidence?.generatedAt);
  const expectedSha = normalizeSha(expectedCommitSha);

  if (!Number.isFinite(nowMs)) return ['validation clock must be a valid timestamp'];

  if (evidence?.evidenceItem !== 'required-status-checks') {
    failures.push('evidenceItem must be required-status-checks');
  }
  if (evidence?.evidence_type !== 'branch-protection-required-checks') {
    failures.push('evidence_type must be branch-protection-required-checks');
  }
  if (evidence?.repository !== expectedRepository) failures.push(`repository must be ${expectedRepository}`);
  if (evidence?.branch !== expectedBranch) failures.push(`branch must be ${expectedBranch}`);

  if (capturedAt === null) failures.push('captured_at must be an ISO-8601 timestamp');
  else {
    const ageMs = nowMs - capturedAt;
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    if (ageMs < 0) failures.push('captured_at must not be in the future');
    else if (ageMs > maxAgeMs) failures.push(`captured_at is older than ${maxAgeDays} days`);
  }

  if (evidence?.status === 'Exception') {
    const expiresAt = parseTimestamp(evidence?.exception?.expiresAt);
    if (expiresAt === null) failures.push('exception.expiresAt must be a valid timestamp');
    else if (expiresAt < nowMs) failures.push('branch protection exception has expired');
  }

  if (evidence?.status !== 'Complete') return failures;

  if (evidence?.outcome !== 'passed') failures.push('Complete evidence outcome must be passed');
  if (!FULL_SHA.test(String(evidence?.targetSha ?? ''))) failures.push('targetSha must be a full SHA');
  if (evidence?.targetSha !== evidence?.checkedOutSha) failures.push('targetSha and checkedOutSha must match');
  if (evidence?.targetSha !== evidence?.currentMainSha) failures.push('targetSha and currentMainSha must match');

  if (expectedSha) {
    if (!FULL_SHA.test(expectedSha)) failures.push('expectedCommitSha must be a full SHA');
    else if (evidence?.targetSha !== expectedSha) failures.push('targetSha must match the exact assessed SHA');
  }

  const verification = evidence?.verification_provenance;
  if (!verification || typeof verification !== 'object') {
    failures.push('Complete evidence requires verification_provenance');
  } else {
    if (verification.method !== 'github_api') failures.push('verification_provenance.method must be github_api');
    if (!String(verification.reference ?? '').startsWith('github-actions-run:')) {
      failures.push('verification_provenance.reference must identify the GitHub Actions run');
    }
    if (!parseTimestamp(verification.verifiedAt)) {
      failures.push('verification_provenance.verifiedAt must be an ISO-8601 timestamp');
    }
  }

  if (evidence?.sourceWorkflow?.name !== 'Branch Protection Runtime Proof') {
    failures.push('sourceWorkflow.name must be Branch Protection Runtime Proof');
  }
  if (evidence?.sourceWorkflow?.file !== '.github/workflows/branch-protection-runtime-proof.yml') {
    failures.push('sourceWorkflow.file is invalid');
  }
  if (!/^\d+$/.test(String(evidence?.sourceWorkflow?.runId ?? ''))) {
    failures.push('sourceWorkflow.runId must be numeric');
  }
  if (evidence?.sourceWorkflow?.artifact !== `branch-protection-runtime-proof-${evidence?.targetSha}`) {
    failures.push('sourceWorkflow.artifact is invalid');
  }
  if (evidence?.sourceWorkflow?.exactShaBound !== true) {
    failures.push('sourceWorkflow.exactShaBound must be true');
  }

  if (evidence?.provenance?.githubActions !== true) failures.push('GitHub Actions provenance is required');
  if (evidence?.provenance?.exactShaBound !== true) failures.push('provenance.exactShaBound must be true');
  if (evidence?.provenance?.mainHeadMatched !== true) failures.push('provenance.mainHeadMatched must be true');

  for (const flag of requiredBranchProtectionFlags) {
    if (evidence?.branch_protection?.[flag] !== true) failures.push(`branch_protection.${flag} must be true`);
  }
  if ((evidence?.branch_protection?.required_approving_reviews ?? 0) < 1) {
    failures.push('branch_protection.required_approving_reviews must be at least 1');
  }

  for (const check of requiredBranchProtectionChecks) {
    if (!evidence?.required_status_checks?.includes(check)) failures.push(`missing required status check: ${check}`);
  }
  for (const blocker of requiredBranchProtectionReleaseBlockers) {
    if (evidence?.release_blockers?.[blocker] !== true) failures.push(`release_blockers.${blocker} must be true`);
  }

  if (evidence?.workflow_secret_log_policy?.secrets_in_logs_prohibited !== true) {
    failures.push('workflow_secret_log_policy.secrets_in_logs_prohibited must be true');
  }
  if (evidence?.workflow_secret_log_policy?.checkout_persist_credentials_disabled !== true) {
    failures.push('workflow_secret_log_policy.checkout_persist_credentials_disabled must be true');
  }
  if (evidence?.workflow_secret_log_policy?.strict_public_secret_scan_required !== true) {
    failures.push('workflow_secret_log_policy.strict_public_secret_scan_required must be true');
  }
  if (evidence?.sbom?.generated_by_ci !== true) failures.push('sbom.generated_by_ci must be true');
  if (evidence?.sbom?.artifact_name !== 'risck-comply-sbom') {
    failures.push('sbom.artifact_name must be risck-comply-sbom');
  }
  if (evidence?.sbom?.runtime_path !== 'docs/security/evidence/runtime/sbom.cyclonedx.json') {
    failures.push('sbom.runtime_path must be docs/security/evidence/runtime/sbom.cyclonedx.json');
  }

  if (!Array.isArray(evidence?.controlsVerified) || evidence.controlsVerified.length < 8) {
    failures.push('Complete evidence requires the verified branch protection controls');
  }
  if (!Array.isArray(evidence?.failures) || evidence.failures.length !== 0) {
    failures.push('Complete evidence cannot contain failures');
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

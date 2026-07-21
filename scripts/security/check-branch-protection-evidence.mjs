import { existsSync, readFileSync } from 'node:fs';
import { validateBranchProtectionFreshness } from './validate-branch-protection-freshness.mjs';

const evidencePath = 'docs/security/evidence/runtime/branch-protection-required-checks.json';
const policyPath = 'docs/security/BRANCH_PROTECTION_REQUIRED_RULES.md';
const auditTriagePath = 'docs/security/NPM_AUDIT_TRIAGE.md';
const isEnterpriseRelease = process.env.RELEASE_TARGET === 'enterprise' || process.env.RISCK_COMPLY_ENTERPRISE_RELEASE === 'true';

const requiredChecks = [
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

const requiredProtectionFlags = [
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

const requiredReleaseBlockers = [
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

const failures = [];
const warnings = [];

function readText(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

function requireTrue(object, key, prefix) {
  if (object?.[key] !== true) {
    failures.push(`${prefix}.${key} must be true`);
  }
}

function isTimeBoundExceptionFailure(failure) {
  return failure === 'captured_at is older than 7 days'
    || failure === 'branch protection exception has expired';
}

const evidenceSource = readText(evidencePath);
const policySource = readText(policyPath);
readText(auditTriagePath);

let evidence = {};
if (evidenceSource) {
  try {
    evidence = JSON.parse(evidenceSource);
  } catch (error) {
    failures.push(`${evidencePath} is not valid JSON: ${error.message}`);
  }
}

for (const failure of validateBranchProtectionFreshness(evidence)) {
  const mayRemainOpenOutsideEnterpriseRelease = !isEnterpriseRelease
    && ['Exception', 'Open'].includes(evidence.status)
    && isTimeBoundExceptionFailure(failure);

  if (mayRemainOpenOutsideEnterpriseRelease) {
    warnings.push(`${evidencePath} ${failure}`);
  } else {
    failures.push(`${evidencePath} ${failure}`);
  }
}

if (evidence.evidence_type !== 'branch-protection-required-checks') {
  failures.push(`${evidencePath} evidence_type must be branch-protection-required-checks`);
}

if (!Number.isInteger(evidence.schema_version) || evidence.schema_version < 1) {
  failures.push(`${evidencePath} schema_version must be a positive integer`);
}

if (isEnterpriseRelease && ['Exception', 'Open'].includes(evidence.status)) {
  failures.push(`${evidencePath} status=${evidence.status} is not allowed for enterprise release; branch protection evidence must be Complete`);
}

if (isEnterpriseRelease && evidence.status !== 'Complete') {
  failures.push(`${evidencePath} status must be Complete for enterprise release`);
}

for (const flag of requiredProtectionFlags) {
  requireTrue(evidence.branch_protection, flag, 'branch_protection');
}

if ((evidence.branch_protection?.required_approving_reviews ?? 0) < 1) {
  failures.push('branch_protection.required_approving_reviews must be at least 1');
}

for (const check of requiredChecks) {
  if (!evidence.required_status_checks?.includes(check)) {
    failures.push(`${evidencePath} missing required status check: ${check}`);
  }

  const checkName = check.split(' / ').pop();
  if (policySource && !policySource.includes(checkName)) {
    failures.push(`${policyPath} missing required status check name: ${checkName}`);
  }
}

for (const blocker of requiredReleaseBlockers) {
  requireTrue(evidence.release_blockers, blocker, 'release_blockers');
}

if (evidence.sbom?.generated_by_ci !== true) {
  failures.push('sbom.generated_by_ci must be true');
}

if (evidence.sbom?.artifact_name !== 'risck-comply-sbom') {
  failures.push('sbom.artifact_name must be risck-comply-sbom');
}

if (evidence.sbom?.runtime_path !== 'docs/security/evidence/runtime/sbom.cyclonedx.json') {
  failures.push('sbom.runtime_path must be docs/security/evidence/runtime/sbom.cyclonedx.json');
}

console.log('RISCK COMPLY branch protection evidence check');
console.log('------------------------------------------------');
console.log(`Enterprise release mode: ${isEnterpriseRelease ? 'yes' : 'no'}`);

if (warnings.length > 0) {
  console.warn('Branch protection evidence warnings (release remains No-Go):');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length > 0) {
  console.error('Branch protection evidence failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Branch protection policy contract: ok');
  if (evidence.status !== 'Complete') {
    console.log(`Branch protection production evidence remains ${evidence.status}; enterprise release validation must continue to fail closed.`);
  } else {
    console.log('Branch protection and required-check evidence: ok');
  }
}

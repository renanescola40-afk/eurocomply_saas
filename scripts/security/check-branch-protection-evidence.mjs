import { existsSync, readFileSync } from 'node:fs';

const evidencePath = 'docs/security/evidence/runtime/branch-protection-required-checks.json';
const policyPath = 'docs/security/BRANCH_PROTECTION_REQUIRED_RULES.md';
const auditTriagePath = 'docs/security/NPM_AUDIT_TRIAGE.md';

const requiredChecks = [
  'Full Security Suite / Core CI, build and npm audit',
  'Full Security Suite / Actionlint',
  'Full Security Suite / Secret scanning (Gitleaks)',
  'Full Security Suite / Semgrep SAST',
  'Full Security Suite / CodeQL (javascript-typescript)',
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
  'branch_protection_exception_blocks_enterprise_release',
  'untriaged_high_or_critical_npm_audit_blocks',
];

const enterpriseRelease = process.env.RELEASE_TARGET === 'enterprise'
  || process.env.RISCK_COMPLY_ENTERPRISE_RELEASE === 'true'
  || process.env.RISCK_COMPLY_ENTERPRISE_RELEASE === '1';

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

function isExpiredIsoDate(value) {
  const parsed = Date.parse(value ?? '');
  if (!Number.isFinite(parsed)) return true;
  return parsed < Date.now();
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

if (evidence.repository !== 'renanescola40-afk/eurocomply_saas') {
  failures.push(`${evidencePath} repository must be renanescola40-afk/eurocomply_saas`);
}

if (evidence.branch !== 'main') {
  failures.push(`${evidencePath} branch must be main`);
}

if (evidence.evidence_type !== 'branch-protection-required-checks') {
  failures.push(`${evidencePath} evidence_type must be branch-protection-required-checks`);
}

if (!Number.isInteger(evidence.schema_version) || evidence.schema_version < 1) {
  failures.push(`${evidencePath} schema_version must be a positive integer`);
}

if (!Date.parse(evidence.captured_at ?? '')) {
  failures.push(`${evidencePath} captured_at must be an ISO-8601 timestamp`);
}

const allowedStatuses = new Set(['Complete', 'Exception', 'Open']);
if (!allowedStatuses.has(evidence.status)) {
  failures.push(`${evidencePath} status must be one of Complete, Exception, or Open`);
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

if (evidence.sbom?.runtime_path !== 'docs/security/evidence/runtime/sbom.json') {
  failures.push('sbom.runtime_path must be docs/security/evidence/runtime/sbom.json');
}

if (evidence.direct_push_to_main_risk?.treated_as_enterprise_release_risk !== true) {
  failures.push('direct_push_to_main_risk.treated_as_enterprise_release_risk must be true');
}

if (enterpriseRelease && evidence.status !== 'Complete') {
  failures.push(`${evidencePath} status is ${evidence.status}; enterprise releases require status Complete`);
}

if (enterpriseRelease && ['Exception', 'Open'].includes(evidence.status)) {
  failures.push(`${evidencePath} cannot be ${evidence.status} for RELEASE_TARGET=enterprise/RISCK_COMPLY_ENTERPRISE_RELEASE`);
}

if (evidence.status === 'Exception') {
  if (!evidence.exception?.riskOwner) {
    failures.push('exception.riskOwner is required when status is Exception');
  }
  if (!evidence.exception?.approvalReference) {
    failures.push('exception.approvalReference is required when status is Exception');
  }
  if (isExpiredIsoDate(evidence.exception?.expiresAt)) {
    failures.push('exception.expiresAt must be a non-expired ISO date when status is Exception');
  }
}

if (!enterpriseRelease && evidence.status !== 'Complete') {
  warnings.push(`${evidencePath} is ${evidence.status}; this is allowed only for non-enterprise validation and blocks enterprise release promotion.`);
}

console.log('RISCK COMPLY branch protection evidence check');
console.log('------------------------------------------------');
console.log(`Enterprise release enforcement: ${enterpriseRelease ? 'enabled' : 'disabled'}`);

for (const warning of warnings) console.warn(`Warning: ${warning}`);

if (failures.length > 0) {
  console.error('Branch protection evidence failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Branch protection and required-check evidence: ok');
}

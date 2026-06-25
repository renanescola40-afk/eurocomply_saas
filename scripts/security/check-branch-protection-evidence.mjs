import { existsSync, readFileSync } from 'node:fs';

const evidencePath = 'docs/security/evidence/runtime/branch-protection-required-checks.json';
const policyPath = 'docs/security/BRANCH_PROTECTION_REQUIRED_RULES.md';
const triagePath = 'docs/security/NPM_AUDIT_TRIAGE.md';
const enterpriseMode = process.env.RELEASE_TARGET === 'enterprise' || process.env.RISCK_COMPLY_ENTERPRISE_RELEASE === 'true';
const mainMode = process.env.GITHUB_REF === 'refs/heads/main' || process.env.GITHUB_REF_NAME === 'main';
const finalReleaseMode = enterpriseMode && mainMode;
const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

const evidenceSource = read(evidencePath);
const policySource = read(policyPath);
read(triagePath);

let evidence = {};
try {
  evidence = JSON.parse(evidenceSource);
} catch (error) {
  failures.push(`${evidencePath} must be valid JSON: ${error.message}`);
}

if (evidence.repository !== 'renanescola40-afk/eurocomply_saas') failures.push(`${evidencePath} has unexpected repository`);
if (evidence.branch !== 'main') failures.push(`${evidencePath} has unexpected branch`);
if (evidence.evidence_type !== 'branch-protection-required-checks') failures.push(`${evidencePath} has unexpected evidence_type`);
if (!Number.isInteger(evidence.schema_version) || evidence.schema_version < 1) failures.push(`${evidencePath} has invalid schema_version`);
if (!Date.parse(evidence.captured_at ?? '')) failures.push(`${evidencePath} has invalid captured_at`);

if (finalReleaseMode && evidence.status !== 'Complete') failures.push(`${evidencePath} must be Complete for main enterprise release`);

const branchProtection = evidence.branch_protection ?? {};
for (const key of [
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
]) {
  if (branchProtection[key] !== true) failures.push(`branch_protection.${key} must be true`);
}

if ((branchProtection.required_approving_reviews ?? 0) < 1) failures.push('branch_protection.required_approving_reviews must be at least 1');

for (const check of evidence.required_status_checks ?? []) {
  const checkName = String(check).split(' / ').pop();
  if (policySource && !policySource.includes(checkName)) failures.push(`${policyPath} missing status check name: ${checkName}`);
}

if ((evidence.required_status_checks ?? []).length < 8) failures.push(`${evidencePath} must list required status checks`);

const blockers = evidence.release_blockers ?? {};
for (const key of [
  'full_security_suite_required',
  'lint_failure_blocks',
  'typecheck_failure_blocks',
  'test_failure_blocks',
  'build_failure_blocks',
  'security_ci_failure_blocks',
  'secret_scanning_failure_blocks',
  'branch_protection_evidence_blocks',
  'package_lock_mismatch_blocks',
]) {
  if (blockers[key] !== true) failures.push(`release_blockers.${key} must be true`);
}

if (evidence.sbom?.generated_by_ci !== true) failures.push('sbom.generated_by_ci must be true');
if (evidence.sbom?.artifact_name !== 'risck-comply-sbom') failures.push('sbom.artifact_name must be risck-comply-sbom');

console.log('RISCK COMPLY branch protection evidence check');
console.log('------------------------------------------------');
console.log(`Enterprise mode: ${enterpriseMode ? 'yes' : 'no'}`);
console.log(`Final main release mode: ${finalReleaseMode ? 'yes' : 'no'}`);

if (failures.length > 0) {
  console.error('Branch protection evidence failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Branch protection and required-check evidence: ok');
}

#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const DEFAULT_EVIDENCE_PATH = 'p0-evidence/branch-protection-main.generated.json';
const FULL_SHA = /^[0-9a-f]{40}$/;

const REQUIRED_PROTECTION_FLAGS = [
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

function requireCondition(failures, condition, message) {
  if (!condition) failures.push(message);
}

export function validateGeneratedBranchProtectionEvidence(
  evidence,
  {
    expectedSha = '',
    expectedRepository = CANONICAL_REPOSITORY,
  } = {},
) {
  const failures = [];
  const normalizedExpectedSha = String(expectedSha ?? '').trim().toLowerCase();

  requireCondition(failures, evidence?.schema === 'risck-comply.branch-protection-runtime-evidence.v1', 'unexpected schema');
  requireCondition(failures, evidence?.evidenceItem === 'required-status-checks', 'unexpected evidenceItem');
  requireCondition(failures, evidence?.evidence_type === 'branch-protection-required-checks', 'unexpected evidence_type');
  requireCondition(failures, evidence?.status === 'Complete', 'status must be Complete');
  requireCondition(failures, evidence?.outcome === 'passed', 'outcome must be passed');
  requireCondition(failures, evidence?.repository === expectedRepository, 'repository provenance is invalid');
  requireCondition(failures, evidence?.branch === 'main', 'branch must be main');
  requireCondition(failures, FULL_SHA.test(String(evidence?.targetSha ?? '')), 'targetSha must be a full SHA');
  requireCondition(failures, evidence?.targetSha === evidence?.checkedOutSha, 'targetSha and checkedOutSha must match');
  requireCondition(failures, evidence?.targetSha === evidence?.currentMainSha, 'targetSha must equal the current main head');

  if (normalizedExpectedSha) {
    requireCondition(failures, FULL_SHA.test(normalizedExpectedSha), 'expected SHA must be a full SHA');
    requireCondition(failures, evidence?.targetSha === normalizedExpectedSha, 'evidence targetSha does not match expected SHA');
  }

  requireCondition(failures, evidence?.source === 'github-api-branch-protection-workflow', 'source is invalid');
  requireCondition(failures, evidence?.provenance?.githubActions === true, 'GitHub Actions provenance is required');
  requireCondition(failures, /^\d+$/.test(String(evidence?.provenance?.runId ?? '')), 'numeric workflow run ID is required');
  requireCondition(failures, evidence?.provenance?.exactShaBound === true, 'exact SHA binding is required');
  requireCondition(failures, evidence?.provenance?.mainHeadMatched === true, 'current main head binding is required');
  requireCondition(failures, evidence?.redactionConfirmation === 'Redaction confirmed for branch protection runtime evidence.', 'redaction confirmation is invalid');

  for (const flag of REQUIRED_PROTECTION_FLAGS) {
    requireCondition(failures, evidence?.branch_protection?.[flag] === true, `branch_protection.${flag} must be true`);
  }

  requireCondition(
    failures,
    Number.isInteger(evidence?.branch_protection?.required_approving_reviews)
      && evidence.branch_protection.required_approving_reviews >= 1,
    'at least one approving review must be required',
  );
  requireCondition(failures, Array.isArray(evidence?.required_status_checks) && evidence.required_status_checks.length >= 1, 'required status checks are missing');
  requireCondition(failures, Array.isArray(evidence?.sourceDetails?.missingRequiredChecks) && evidence.sourceDetails.missingRequiredChecks.length === 0, 'required status checks are missing from main protection');
  requireCondition(failures, evidence?.sourceDetails?.missingProtectionFlags === 0, 'required branch protection flags are missing');
  requireCondition(failures, Array.isArray(evidence?.controlsVerified) && evidence.controlsVerified.length >= 8, 'verified branch protection controls are incomplete');
  requireCondition(failures, Array.isArray(evidence?.failures) && evidence.failures.length === 0, 'Complete evidence cannot contain failures');

  requireCondition(failures, evidence?.evidenceIntegrity?.containsSensitiveValues === false, 'sensitive-value integrity flag is invalid');
  requireCondition(failures, evidence?.evidenceIntegrity?.rawApiPayloadStored === false, 'raw GitHub API payloads must not be stored');
  requireCondition(failures, evidence?.evidenceIntegrity?.accessTokensStored === false, 'access tokens must not be stored');
  requireCondition(failures, evidence?.evidenceIntegrity?.exactShaBound === true, 'evidence integrity exact-SHA flag is invalid');

  return failures;
}

export function validateGeneratedBranchProtectionEvidenceFile({
  evidencePath = process.env.BRANCH_PROTECTION_EVIDENCE_PATH || DEFAULT_EVIDENCE_PATH,
  expectedSha = process.env.ENTERPRISE_EXPECTED_SHA || process.env.RELEASE_SHA || '',
  expectedRepository = process.env.GITHUB_REPOSITORY || CANONICAL_REPOSITORY,
} = {}) {
  if (!existsSync(evidencePath)) {
    return [`${evidencePath} is missing`];
  }

  let evidence;
  try {
    evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
  } catch {
    return [`${evidencePath} is not valid JSON`];
  }

  return validateGeneratedBranchProtectionEvidence(evidence, { expectedSha, expectedRepository });
}

function run() {
  const failures = validateGeneratedBranchProtectionEvidenceFile();

  console.log('RISCK COMPLY generated branch protection evidence check');
  console.log('----------------------------------------------------------');

  if (failures.length > 0) {
    console.error('Generated branch protection evidence failures:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log('Generated branch protection evidence: Complete/passed');
}

if (process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url)) {
  run();
}

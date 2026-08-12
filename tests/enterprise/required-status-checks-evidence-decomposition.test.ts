import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  REQUIRED_CHECK_ALIASES,
  REQUIRED_CHECKS,
} from '../../scripts/enterprise/build-branch-protection-runtime-evidence.mjs';
import {
  buildRequiredStatusChecksEvidence,
  matchRequiredChecks,
} from '../../scripts/enterprise/build-required-status-checks-runtime-evidence.mjs';
import { validateRequiredStatusChecksRuntimeEvidence } from '../../scripts/security/validate-required-status-checks-runtime-evidence.mjs';

const SHA = 'd'.repeat(40);
const RUN_ID = '31594083982';
const GENERATED_AT = '2026-08-12T12:00:00.000Z';

function configuredAlias(check: string) {
  return REQUIRED_CHECK_ALIASES[check]?.[0] ?? check;
}

function branchFixture() {
  return {
    name: 'main',
    commit: { sha: SHA },
    protected: true,
    protection: {
      enabled: true,
      required_status_checks: {
        enforcement_level: 'everyone',
        contexts: REQUIRED_CHECKS.map(configuredAlias),
        checks: REQUIRED_CHECKS.map((check) => ({
          context: configuredAlias(check),
          app_id: 15368,
        })),
      },
    },
  };
}

function rulesetFixture(strict = true) {
  return [{
    id: 17764297,
    target: 'branch',
    enforcement: 'active',
    conditions: {
      ref_name: {
        include: ['refs/heads/main'],
        exclude: [],
      },
    },
    rules: [
      {
        type: 'pull_request',
        parameters: {
          required_approving_review_count: 0,
          dismiss_stale_reviews_on_push: false,
          require_code_owner_review: true,
          required_review_thread_resolution: true,
        },
      },
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: strict,
          required_status_checks: REQUIRED_CHECKS.slice(0, 4).map((context) => ({ context })),
        },
      },
    ],
  }];
}

describe('P0 required-status-check evidence decomposition', () => {
  it('accepts the complete strict status-check subset while broader review governance remains weak', () => {
    const result = buildRequiredStatusChecksEvidence({
      branch: branchFixture(),
      rulesets: rulesetFixture(),
      targetSha: SHA,
      checkedOutSha: SHA,
      runId: RUN_ID,
      generatedAt: GENERATED_AT,
    });

    expect(result.passed).toBe(true);
    expect(result.evidence).not.toBeNull();
    expect(result.evidence?.status).toBe('Complete');
    expect(result.evidence?.outcome).toBe('passed');
    expect(result.evidence?.broaderBranchProtectionSatisfied).toBe(false);
    expect(result.evidence?.evidenceBoundary).toContain('does not prove approving-review count');
    expect(result.evidence?.required_status_checks).toEqual(REQUIRED_CHECKS);
    expect(result.evidence?.branch_protection).toEqual({
      require_status_checks: true,
      require_up_to_date_branch: true,
    });
    expect(validateRequiredStatusChecksRuntimeEvidence(result.evidence, {
      now: new Date(GENERATED_AT),
      expectedCommitSha: SHA,
    })).toEqual([]);
  });

  it('supports documented aliases but fails closed when any canonical check is absent', () => {
    expect(matchRequiredChecks(REQUIRED_CHECKS.map(configuredAlias)).missingRequiredChecks).toEqual([]);

    const branch = branchFixture();
    const missing = REQUIRED_CHECKS[0];
    const alias = configuredAlias(missing);
    branch.protection.required_status_checks.contexts = branch.protection.required_status_checks.contexts
      .filter((context) => context !== alias);
    branch.protection.required_status_checks.checks = branch.protection.required_status_checks.checks
      .filter((check) => check.context !== alias);
    const rulesets = rulesetFixture();
    rulesets[0].rules[1].parameters.required_status_checks = REQUIRED_CHECKS.slice(1, 4)
      .map((context) => ({ context }));

    const result = buildRequiredStatusChecksEvidence({
      branch,
      rulesets,
      targetSha: SHA,
      checkedOutSha: SHA,
      runId: RUN_ID,
      generatedAt: GENERATED_AT,
    });
    expect(result.passed).toBe(false);
    expect(result.evidence).toBeNull();
    expect(result.diagnostics.missingRequiredChecks).toContain(missing);
  });

  it('fails closed unless status checks are enforced for everyone and strict', () => {
    const weakBranch = branchFixture();
    weakBranch.protection.required_status_checks.enforcement_level = 'non_admins';
    expect(buildRequiredStatusChecksEvidence({
      branch: weakBranch,
      rulesets: rulesetFixture(),
      targetSha: SHA,
      checkedOutSha: SHA,
      runId: RUN_ID,
      generatedAt: GENERATED_AT,
    }).failures).toContain('required_status_checks_not_enforced_for_everyone');

    expect(buildRequiredStatusChecksEvidence({
      branch: branchFixture(),
      rulesets: rulesetFixture(false),
      targetSha: SHA,
      checkedOutSha: SHA,
      runId: RUN_ID,
      generatedAt: GENERATED_AT,
    }).failures).toContain('strict_required_status_checks_policy_missing');
  });

  it('keeps the P0 catalog controls on distinct files and validators', async () => {
    const catalog = await import('../../scripts/security/p0-runtime-evidence-catalog.mjs');
    const branchControl = catalog.p0EvidenceCatalog.find(
      (entry) => entry.item === 'Branch protection applied on `main`',
    );
    const checksControl = catalog.p0EvidenceCatalog.find(
      (entry) => entry.item === 'Required status checks configured',
    );

    expect(branchControl?.file).toBe('branch-protection-required-checks.json');
    expect(checksControl?.file).toBe('required-status-checks.json');
    expect(branchControl?.validator).not.toBe(checksControl?.validator);
  });

  it('wires read-only evidence generation before P0 validation without adding a new workflow', () => {
    const workflow = readFileSync('.github/workflows/p0-runtime-evidence.yml', 'utf8');
    const builder = readFileSync(
      'scripts/enterprise/build-required-status-checks-runtime-evidence.mjs',
      'utf8',
    );

    expect(workflow).toContain('Generate exact-SHA required status checks evidence');
    expect(workflow).toContain('build-required-status-checks-runtime-evidence.mjs');
    expect(workflow).toContain('CHECKED_OUT_SHA: ${{ env.ASSESSED_SHA }}');
    expect(workflow).not.toContain('contents: write');
    expect(builder).toContain('/branches/${BRANCH}');
    expect(builder).toContain('/rulesets?includes_parents=true&per_page=100');
    expect(builder).toContain("enforcement_level === 'everyone'");
    expect(builder).toContain('strict_required_status_checks_policy === true');
    expect(builder).not.toContain('/rulesets/17764297');
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  REQUIRED_CHECKS,
  evaluateBranchProtection,
} from '../../scripts/enterprise/build-branch-protection-runtime-evidence.mjs';
import {
  applyRulesetsEvidenceBoundary,
  mergeClassicAndRulesetProtection,
  rulesetPatternMatchesMain,
  rulesetTargetsMain,
  synthesizeClassicProtectionFromRulesets,
} from '../../scripts/enterprise/build-platform-controls-runtime-evidence.mjs';

const SHA = 'c'.repeat(40);
const RUN_ID = '30860000001';

type RulesetRule = {
  type: string;
  parameters?: Record<string, unknown>;
};

type RulesetFixture = {
  id: number;
  name: string;
  target: string;
  enforcement: string;
  source_type: string;
  conditions: {
    ref_name: {
      include: string[];
      exclude: string[];
    };
  };
  bypass_actors: Array<{
    actor_type: string;
    actor_id?: number;
    bypass_mode: string;
  }>;
  rules: RulesetRule[];
};

function completeRuleset(overrides: Partial<RulesetFixture> = {}): RulesetFixture {
  return {
    id: 7001,
    name: 'Enterprise main protection',
    target: 'branch',
    enforcement: 'active',
    source_type: 'Repository',
    conditions: {
      ref_name: {
        include: ['~DEFAULT_BRANCH'],
        exclude: [],
      },
    },
    bypass_actors: [],
    rules: [
      {
        type: 'pull_request',
        parameters: {
          required_approving_review_count: 2,
          require_code_owner_review: true,
          dismiss_stale_reviews_on_push: true,
          required_review_thread_resolution: true,
        },
      },
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: true,
          required_status_checks: REQUIRED_CHECKS.map((context) => ({ context })),
        },
      },
      { type: 'non_fast_forward' },
      { type: 'deletion' },
    ],
    ...overrides,
  };
}

function evaluateRulesets(rulesets: RulesetFixture[]) {
  const { protection, metadata } = synthesizeClassicProtectionFromRulesets(rulesets);
  const evidence = evaluateBranchProtection({
    protection,
    targetSha: SHA,
    checkedOutSha: SHA,
    currentMainSha: SHA,
    runId: RUN_ID,
    generatedAt: '2026-08-04T07:00:00.000Z',
  });
  return applyRulesetsEvidenceBoundary(evidence, metadata, 'github_api_403');
}

describe('repository rulesets platform-control evidence fallback', () => {
  it('accepts active exact-main rulesets that enforce the complete policy', () => {
    const evidence = evaluateRulesets([completeRuleset()]);

    expect(evidence.status).toBe('Complete');
    expect(evidence.outcome).toBe('passed');
    expect(evidence.source).toBe('github-api-repository-rulesets-fallback');
    expect(evidence.sourceDetails).toEqual(expect.objectContaining({
      sourceMode: 'repository-rulesets',
      classicProtectionApiFailure: 'github_api_403',
      applicableRulesetCount: 1,
      bypassActorCount: 0,
      missingRequiredChecks: [],
      missingProtectionFlags: 0,
    }));
    expect(evidence.branch_protection).toEqual(expect.objectContaining({
      require_pull_request: true,
      required_approving_reviews: 2,
      require_code_owner_review: true,
      dismiss_stale_reviews: true,
      require_conversation_resolution: true,
      require_status_checks: true,
      require_up_to_date_branch: true,
      block_force_pushes: true,
      block_deletions: true,
    }));
  });

  it('matches default, exact and glob main references while respecting exclusions', () => {
    expect(rulesetPatternMatchesMain('~DEFAULT_BRANCH')).toBe(true);
    expect(rulesetPatternMatchesMain('refs/heads/main')).toBe(true);
    expect(rulesetPatternMatchesMain('refs/heads/*')).toBe(true);
    expect(rulesetPatternMatchesMain('refs/heads/release/*')).toBe(false);

    expect(rulesetTargetsMain(completeRuleset())).toBe(true);
    expect(rulesetTargetsMain(completeRuleset({
      conditions: { ref_name: { include: ['~ALL'], exclude: ['refs/heads/main'] } },
    }))).toBe(false);
    expect(rulesetTargetsMain(completeRuleset({ enforcement: 'evaluate' }))).toBe(false);
    expect(rulesetTargetsMain(completeRuleset({ target: 'tag' }))).toBe(false);
  });

  it('combines cumulative rulesets and fails closed when a required control is absent', () => {
    const reviewRuleset = completeRuleset({
      id: 7002,
      name: 'Reviews only',
      rules: completeRuleset().rules.filter((rule) => rule.type === 'pull_request'),
    });
    const technicalRuleset = completeRuleset({
      id: 7003,
      name: 'Checks and immutable main',
      rules: completeRuleset().rules.filter((rule) => rule.type !== 'pull_request'),
    });
    expect(evaluateRulesets([reviewRuleset, technicalRuleset]).outcome).toBe('passed');

    const weak = completeRuleset();
    weak.rules = weak.rules.filter((rule) => rule.type !== 'non_fast_forward');
    const evidence = evaluateRulesets([weak]);
    expect(evidence.outcome).toBe('failed');
    expect(evidence.branch_protection.block_force_pushes).toBe(false);
    expect(evidence.sourceDetails.missingProtectionFlags).toBeGreaterThan(0);
  });

  it('combines classic and rulesets controls only when the cumulative policy is complete', () => {
    const classic = {
      required_status_checks: {
        strict: true,
        contexts: REQUIRED_CHECKS,
        checks: [],
      },
      required_pull_request_reviews: {
        required_approving_review_count: 1,
        require_code_owner_reviews: true,
        dismiss_stale_reviews: true,
      },
      required_conversation_resolution: { enabled: true },
      allow_force_pushes: { enabled: false },
      allow_deletions: { enabled: true },
      restrictions: null,
    };
    const deletionRuleset = completeRuleset({
      id: 7004,
      name: 'Deletion protection only',
      rules: [{ type: 'deletion' }],
    });
    const { protection: projected, metadata } = synthesizeClassicProtectionFromRulesets([deletionRuleset]);
    const combined = mergeClassicAndRulesetProtection(classic, projected);
    const evidence = applyRulesetsEvidenceBoundary(evaluateBranchProtection({
      protection: combined,
      targetSha: SHA,
      checkedOutSha: SHA,
      currentMainSha: SHA,
      runId: RUN_ID,
    }), metadata, 'classic_policy_incomplete', 'classic-plus-rulesets');

    expect(evidence.outcome).toBe('passed');
    expect(evidence.source).toBe('github-api-classic-plus-repository-rulesets');
    expect(evidence.branch_protection.block_deletions).toBe(true);
    expect(evidence.sourceDetails.sourceMode).toBe('classic-plus-rulesets');
  });

  it('rejects bypass actors instead of treating ruleset visibility as enforcement', () => {
    const ruleset = completeRuleset({
      bypass_actors: [{ actor_type: 'RepositoryRole', actor_id: 5, bypass_mode: 'always' }],
    });
    const evidence = evaluateRulesets([ruleset]);

    expect(evidence.status).toBe('Open');
    expect(evidence.outcome).toBe('failed');
    expect(evidence.failures).toContain('ruleset_bypass_actor_present');
    expect(evidence.sourceDetails.bypassActorCount).toBe(1);
    expect(evidence.summary).toContain('bypass actors');
  });

  it('keeps the workflow read-only and runs contract checks before protected proof', () => {
    const workflow = readFileSync('.github/workflows/branch-protection-runtime-proof.yml', 'utf8');
    const builder = readFileSync('scripts/enterprise/build-platform-controls-runtime-evidence.mjs', 'utf8');

    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('Validate platform evidence contracts');
    expect(workflow).toContain("github.event_name != 'pull_request'");
    expect(workflow).toContain('build-platform-controls-runtime-evidence.mjs');
    expect(workflow).toContain('platform-controls-rulesets-evidence.test.ts');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('pull_request_target');

    expect(builder).toContain('/rulesets?includes_parents=true&per_page=100');
    expect(builder).toContain('classicProtectionApiFailure');
    expect(builder).toContain('classic-plus-rulesets');
    expect(builder).toContain('ruleset_bypass_actor_present');
    expect(builder).not.toContain('rawApiPayload');
    expect(builder).not.toContain('contents: write');
  });
});

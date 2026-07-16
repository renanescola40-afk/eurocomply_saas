import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('PR Autopilot security contract', () => {
  const classifier = readFileSync('.github/workflows/pr-autopilot.yml', 'utf8');
  const autofix = readFileSync('.github/workflows/codex-autofix.yml', 'utf8');
  const permissionsGate = readFileSync('scripts/security/check-workflow-permissions.mjs', 'utf8');
  const sensitiveGate = readFileSync('scripts/security/check-workflow-sensitive-patterns.mjs', 'utf8');
  const vercelPrompt = readFileSync('.github/agents/pr-creation-with-vercel-limit.prompt.md', 'utf8');
  const seniorAgent = readFileSync('.github/senior-agent.yml', 'utf8');
  const agentsContract = readFileSync('AGENTS.md', 'utf8');
  const agentRunbook = readFileSync('docs/operations/senior-agent-24-7.md', 'utf8');
  const prTemplate = readFileSync('.github/pull_request_template.md', 'utf8');
  const runbook = readFileSync('docs/operations/pr-autopilot.md', 'utf8');
  const policy = JSON.parse(readFileSync('.github/pr-autopilot-policy.json', 'utf8')) as {
    limits: { maxAutofixAttempts: number };
    blockedPathPrefixes: string[];
    automationAuthority: {
      automaticMerge: boolean;
      automaticBranchSync: boolean;
      administratorBypass: boolean;
      finalMergeActor: string;
    };
    externalProviderHandling: {
      vercel: {
        allowPullRequestCreation: boolean;
        treatAsCodeFailure: boolean;
        allowAutofixForProviderFailure: boolean;
        requireTruthfulBlockedDeploymentEvidence: boolean;
        mergeBehavior: string;
      };
    };
    manualMergeRequirements: {
      requireApprovedReview: boolean;
      requireAllThreadsResolved: boolean;
      requireStatusRollupSuccess: boolean;
      requireExactHeadSha: boolean;
    };
  };

  it('keeps the classifier on the trusted default branch without checking out PR code', () => {
    expect(classifier).toContain('pull_request_target:');
    expect(classifier).toContain("ref: context.payload.repository.default_branch");
    expect(classifier).not.toContain('actions/checkout@');
    expect(classifier).toContain('contents: read');
    expect(classifier).toContain('pull-requests: read');
  });

  it('forbids automated branch synchronization, merge and administrator bypass', () => {
    expect(policy.automationAuthority.automaticMerge).toBe(false);
    expect(policy.automationAuthority.automaticBranchSync).toBe(false);
    expect(policy.automationAuthority.administratorBypass).toBe(false);
    expect(policy.automationAuthority.finalMergeActor).toBe('human-owner');
    expect(classifier).not.toContain('pulls.merge');
    expect(classifier).not.toContain('pulls.updateBranch');
    expect(classifier).not.toContain('PR_AUTOPILOT_TOKEN');
    expect(classifier).not.toContain('contents: write');
    expect(classifier).toContain('Final merge remains human-controlled.');
  });

  it('reconciles every managed classifier label from the current PR state', () => {
    expect(classifier).toContain('const managedLabels = labelDefinitions.map(([name]) => name);');
    expect(classifier).toContain('const replaceManagedLabels = async');
    expect(classifier).toContain('const desiredManagedLabels = highRisk');
    expect(classifier).toContain("? [policy.labels.blocked, policy.labels.highRisk, policy.labels.manualReview]");
    expect(classifier).toContain("? [policy.labels.autofixAllowed]");
    expect(classifier).toContain('await replaceManagedLabels(pull.number, existingLabels, desiredManagedLabels);');
    expect(classifier).not.toContain('const addLabels = async');
    expect(classifier).not.toContain('const removeLabel = async');
  });

  it('documents exact-head human merge requirements without granting merge authority', () => {
    expect(policy.manualMergeRequirements.requireApprovedReview).toBe(true);
    expect(policy.manualMergeRequirements.requireAllThreadsResolved).toBe(true);
    expect(policy.manualMergeRequirements.requireStatusRollupSuccess).toBe(true);
    expect(policy.manualMergeRequirements.requireExactHeadSha).toBe(true);
    expect(agentsContract).toContain('Never merge a pull request automatically.');
    expect(agentsContract).toContain('The final merge action belongs to a human owner');
    expect(seniorAgent).toContain('automatic_merge: false');
    expect(seniorAgent).toContain('require_owner_merge_click: true');
  });

  it('uses the official bounded Codex action and repairs only the same branch', () => {
    expect(autofix).toContain('workflow_run:');
    expect(autofix).toContain('workflows: [CI]');
    expect(autofix).toContain('openai/codex-action@v1');
    expect(autofix).toContain('sandbox: workspace-write');
    expect(autofix).toContain('safety-strategy: drop-sudo');
    expect(autofix).not.toContain('sandbox: danger-full-access');
    expect(autofix).not.toContain('safety-strategy: unsafe');
    expect(autofix).not.toContain('pulls.merge');
    expect(autofix).not.toContain('pulls.updateBranch');
    expect(autofix).toContain('persist-credentials: false');
    expect(autofix).toContain('npm ci --ignore-scripts');
    expect(autofix).toContain('HEAD:"$HEAD_BRANCH"');
    expect(autofix).toContain('The PR head moved during repair; refusing a stale push.');
    expect(policy.limits.maxAutofixAttempts).toBe(2);
  });

  it('continues PR delivery while classifying Vercel quota as an external blocker', () => {
    expect(policy.externalProviderHandling.vercel.allowPullRequestCreation).toBe(true);
    expect(policy.externalProviderHandling.vercel.treatAsCodeFailure).toBe(false);
    expect(policy.externalProviderHandling.vercel.allowAutofixForProviderFailure).toBe(false);
    expect(policy.externalProviderHandling.vercel.requireTruthfulBlockedDeploymentEvidence).toBe(true);
    expect(policy.externalProviderHandling.vercel.mergeBehavior).toBe(
      'human-controlled-branch-protection-authoritative',
    );
    expect(vercelPrompt).toContain('Do not stop before creating the PR solely because Vercel is rate-limited.');
    expect(vercelPrompt).toContain('Branch protection remains authoritative');
    expect(seniorAgent).toContain('pr_creation_prompt: .github/agents/pr-creation-with-vercel-limit.prompt.md');
    expect(seniorAgent).toContain('create_when_vercel_rate_limited: true');
    expect(seniorAgent).toContain('create_or_update_code_pr: true');
    expect(seniorAgent).toContain('infer_code_failure: false');
    expect(agentsContract).toContain('## Vercel rate-limit PR delivery rule');
    expect(agentsContract).toContain('continue authorized implementation, branch creation, commits, push, and PR creation');
    expect(agentRunbook).toContain('A Vercel rate limit, quota, plan-capacity message, or temporary deployment-provider blocker must not prevent a reviewable code PR');
    expect(prTemplate).toContain('## External deployment status');
    expect(prTemplate).toContain('A provider-only quota signal must not prevent branch, commit, push, or PR creation.');
    expect(runbook).toContain('Vercel quota and rate-limit signals do not block repository delivery.');
  });

  it('blocks protected product, security, provider, release, and governance paths', () => {
    expect(policy.blockedPathPrefixes).toEqual(
      expect.arrayContaining([
        '.github/workflows/',
        '.github/agents/',
        'supabase/',
        'scripts/security/',
        'scripts/release/',
        'src/app/api/',
        'src/lib/billing',
        'src/lib/stripe',
        'package.json',
        'package-lock.json',
        'AGENTS.md',
        '.github/pr-autopilot-policy.json',
      ]),
    );
  });

  it('allows only the reviewed read-only classifier to use pull_request_target', () => {
    expect(permissionsGate).toContain("'.github/workflows/pr-autopilot.yml'");
    expect(permissionsGate).toContain('allowlisted pull_request_target workflows must never checkout pull request code');
    expect(sensitiveGate).toContain("'.github/workflows/pr-autopilot.yml'");
    expect(sensitiveGate).toContain('allowlisted pull_request_target workflow must load policy from the trusted default branch');
  });
});

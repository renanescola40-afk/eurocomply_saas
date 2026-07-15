import { readFileSync } from 'node:fs';

describe('PR Autopilot security contract', () => {
  const controller = readFileSync('.github/workflows/pr-autopilot.yml', 'utf8');
  const autofix = readFileSync('.github/workflows/codex-autofix.yml', 'utf8');
  const permissionsGate = readFileSync('scripts/security/check-workflow-permissions.mjs', 'utf8');
  const sensitiveGate = readFileSync('scripts/security/check-workflow-sensitive-patterns.mjs', 'utf8');
  const policy = JSON.parse(readFileSync('.github/pr-autopilot-policy.json', 'utf8')) as {
    limits: { maxAutofixAttempts: number };
    blockedPathPrefixes: string[];
    mergeRequirements: {
      requireApprovedReview: boolean;
      requireAllThreadsResolved: boolean;
      requireStatusRollupSuccess: boolean;
    };
  };

  it('keeps the privileged controller on the trusted default branch without checking out PR code', () => {
    expect(controller).toContain('pull_request_target:');
    expect(controller).toContain("ref: context.payload.repository.default_branch");
    expect(controller).not.toContain('actions/checkout@');
    expect(controller).toContain("HAS_AUTOPILOT_TOKEN: ${{ secrets.PR_AUTOPILOT_TOKEN != '' }}");
  });

  it('requires exact-head checks, approval, resolved threads, and a clean merge state', () => {
    expect(controller).toContain("state.reviewDecision === 'APPROVED'");
    expect(controller).toContain("statusState === 'SUCCESS'");
    expect(controller).toContain('unresolvedThreads === 0');
    expect(controller).toContain("state.mergeStateStatus === 'CLEAN'");
    expect(controller).toContain('sha: pull.head.sha');
    expect(controller).toContain('expected_head_sha: pull.head.sha');
    expect(policy.mergeRequirements.requireApprovedReview).toBe(true);
    expect(policy.mergeRequirements.requireAllThreadsResolved).toBe(true);
    expect(policy.mergeRequirements.requireStatusRollupSuccess).toBe(true);
  });

  it('uses the official bounded Codex action and repairs the same branch', () => {
    expect(autofix).toContain('workflow_run:');
    expect(autofix).toContain('workflows: [CI]');
    expect(autofix).toContain('openai/codex-action@v1');
    expect(autofix).toContain("permission-profile: ':workspace'");
    expect(autofix).toContain('persist-credentials: false');
    expect(autofix).toContain('npm ci --ignore-scripts');
    expect(autofix).toContain('HEAD:"$HEAD_BRANCH"');
    expect(autofix).toContain('The PR head moved during repair; refusing a stale push.');
    expect(policy.limits.maxAutofixAttempts).toBe(2);
  });

  it('blocks protected product, security, provider, release, and governance paths', () => {
    expect(policy.blockedPathPrefixes).toEqual(
      expect.arrayContaining([
        '.github/workflows/',
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

  it('allows only the reviewed controller to use pull_request_target', () => {
    expect(permissionsGate).toContain("'.github/workflows/pr-autopilot.yml'");
    expect(permissionsGate).toContain('allowlisted pull_request_target workflows must never checkout pull request code');
    expect(sensitiveGate).toContain("'.github/workflows/pr-autopilot.yml'");
    expect(sensitiveGate).toContain('allowlisted pull_request_target workflow must load policy from the trusted default branch');
  });
});

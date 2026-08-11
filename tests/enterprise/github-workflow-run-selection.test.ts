import { describe, expect, it } from 'vitest';
import {
  isCreditEligibleWorkflowRun,
  latestCreditEligibleRunsByName,
} from '../../scripts/enterprise/github-workflow-run-selection.mjs';

const sha = '0b5165b8f76b257109c67985e96e0787b8f806ac';

function run(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Enterprise Production Gate',
    event: 'workflow_run',
    head_sha: sha,
    status: 'completed',
    conclusion: 'success',
    created_at: '2026-08-11T18:26:00Z',
    ...overrides,
  };
}

describe('GitHub workflow run selection for enterprise evidence', () => {
  it('does not let a newer no-op skipped production gate shadow a real success', () => {
    const realSuccess = run({ id: 10, event: 'push', created_at: '2026-08-11T18:25:00Z' });
    const noOpSkipped = run({
      id: 11,
      conclusion: 'skipped',
      event: 'workflow_run',
      created_at: '2026-08-11T18:27:00Z',
    });

    const selected = latestCreditEligibleRunsByName([realSuccess, noOpSkipped], { targetSha: sha });
    expect(selected.get('Enterprise Production Gate')?.id).toBe(10);
    expect(isCreditEligibleWorkflowRun(noOpSkipped)).toBe(false);
  });

  it('still lets a newer real production gate failure replace an older success', () => {
    const olderSuccess = run({ id: 20, event: 'push', created_at: '2026-08-11T18:25:00Z' });
    const newerFailure = run({
      id: 21,
      conclusion: 'failure',
      event: 'workflow_run',
      created_at: '2026-08-11T18:28:00Z',
    });

    const selected = latestCreditEligibleRunsByName([olderSuccess, newerFailure], { targetSha: sha });
    expect(selected.get('Enterprise Production Gate')?.id).toBe(21);
  });

  it('does not globally ignore skipped required workflows', () => {
    const skippedCodeql = run({
      id: 30,
      name: 'CodeQL',
      conclusion: 'skipped',
      created_at: '2026-08-11T18:29:00Z',
    });

    expect(isCreditEligibleWorkflowRun(skippedCodeql)).toBe(true);
    const selected = latestCreditEligibleRunsByName([skippedCodeql], { targetSha: sha });
    expect(selected.get('CodeQL')?.id).toBe(30);
  });

  it('keeps exact-SHA isolation and chooses the newest eligible run', () => {
    const otherSha = run({
      id: 40,
      head_sha: '1111111111111111111111111111111111111111',
      created_at: '2026-08-11T18:40:00Z',
    });
    const older = run({ id: 41, created_at: '2026-08-11T18:20:00Z' });
    const newer = run({ id: 42, created_at: '2026-08-11T18:30:00Z' });

    const selected = latestCreditEligibleRunsByName([otherSha, older, newer], { targetSha: sha });
    expect(selected.get('Enterprise Production Gate')?.id).toBe(42);
  });
});

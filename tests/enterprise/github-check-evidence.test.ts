import { describe, expect, it } from 'vitest';
import {
  buildEvidenceDocument,
  findStepConclusion,
  latestRunsByName,
  normalizeConclusion,
} from '../../scripts/enterprise/collect-github-check-evidence.mjs';

const targetSha = 'a'.repeat(40);

function successfulRun(name: string, id: number) {
  return {
    id,
    name,
    status: 'completed',
    conclusion: 'success',
    run_attempt: 1,
    created_at: '2026-07-14T00:00:00Z',
  };
}

const requiredNames = [
  'CI',
  'CodeQL',
  'Semgrep',
  'Gitleaks',
  'Secret Scanning',
  'Dependency Review',
  'Actionlint',
  'RISCK COMPLY Security CI',
  'RISCK COMPLY Upload Security CI',
  'Full Security Suite',
  'Enterprise Production Gate',
  'Scan repository for accidental secret exposure',
];

const ciJobs = [
  {
    name: 'quality',
    steps: [
      'Install dependencies deterministically without lifecycle scripts',
      'Package lock alignment gate',
      'Lint',
      'Typecheck',
      'Unit tests',
      'Build',
      'E2E tests when runtime is configured',
      'npm audit moderate gate',
      'Route quality gate',
    ].map((name) => ({ name, conclusion: 'success' })),
  },
];

describe('GitHub check evidence collector', () => {
  it('normalizes skipped checks as not verified instead of success', () => {
    expect(normalizeConclusion('skipped')).toEqual({
      status: 'Open',
      outcome: 'not_verified',
    });
  });

  it('selects the newest workflow attempt by name', () => {
    const selected = latestRunsByName([
      successfulRun('CI', 1),
      {
        ...successfulRun('CI', 2),
        run_attempt: 2,
        created_at: '2026-07-14T00:01:00Z',
      },
    ]);
    expect(selected.get('CI')?.id).toBe(2);
  });

  it('finds exact step conclusions without fuzzy matching', () => {
    expect(findStepConclusion(ciJobs, 'Build')).toBe('success');
    expect(findStepConclusion(ciJobs, 'build')).toBeNull();
  });

  it('marks requiredChecks passed only when all exact-SHA workflows pass', () => {
    const selectedRuns = new Map(
      requiredNames.map((name, index) => [name, successfulRun(name, index + 1)]),
    );
    const evidence = buildEvidenceDocument({ targetSha, selectedRuns, ciJobs });
    expect(evidence.status).toBe('Complete');
    expect(evidence.outcome).toBe('passed');
    expect(evidence.targetSha).toBe(targetSha);
    expect(evidence.checks.find((check) => check.name === 'requiredChecks')?.passed).toBe(true);
  });

  it('does not claim completion when a required workflow is missing', () => {
    const selectedRuns = new Map(
      requiredNames.slice(1).map((name, index) => [name, successfulRun(name, index + 1)]),
    );
    const evidence = buildEvidenceDocument({ targetSha, selectedRuns, ciJobs });
    expect(evidence.status).toBe('Open');
    expect(evidence.unverified).toContain('ci');
    expect(evidence.checks.find((check) => check.name === 'requiredChecks')?.passed).toBeUndefined();
  });

  it('records a failed workflow as failure without exposing payload data', () => {
    const selectedRuns = new Map(
      requiredNames.map((name, index) => [name, successfulRun(name, index + 1)]),
    );
    selectedRuns.set('CodeQL', {
      ...successfulRun('CodeQL', 99),
      conclusion: 'failure',
    });
    const evidence = buildEvidenceDocument({ targetSha, selectedRuns, ciJobs });
    expect(evidence.status).toBe('Failed');
    expect(evidence.failures).toContain('codeql');
    expect(JSON.stringify(evidence)).not.toContain('Authorization');
  });
});

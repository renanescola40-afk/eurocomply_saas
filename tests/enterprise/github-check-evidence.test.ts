import { describe, expect, it } from 'vitest';
import {
  buildEvidenceDocument,
  findStepConclusion,
  latestRunsByName,
  normalizeConclusion,
} from '../../scripts/enterprise/collect-github-check-evidence.mjs';

const targetSha = 'a'.repeat(40);
const names = [
  'CI', 'CodeQL', 'Semgrep', 'Gitleaks', 'Secret Scanning', 'Dependency Review',
  'Actionlint', 'RISCK COMPLY Security CI', 'RISCK COMPLY Upload Security CI',
  'Full Security Suite', 'Enterprise Production Gate',
  'Scan repository for accidental secret exposure',
];

const successRun = (name: string, id: number) => ({
  id,
  name,
  status: 'completed',
  conclusion: 'success',
  run_attempt: 1,
  created_at: '2026-07-14T00:00:00Z',
});

const ciJobs = [{
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
}];

describe('exact-SHA GitHub evidence', () => {
  it('treats skipped as not verified', () => {
    expect(normalizeConclusion('skipped')).toEqual({ status: 'Open', outcome: 'not_verified' });
  });

  it('selects the latest attempt', () => {
    const selected = latestRunsByName([
      successRun('CI', 1),
      { ...successRun('CI', 2), run_attempt: 2, created_at: '2026-07-14T00:01:00Z' },
    ]);
    expect(selected.get('CI')?.id).toBe(2);
  });

  it('uses exact step names', () => {
    expect(findStepConclusion(ciJobs, 'Build')).toBe('success');
    expect(findStepConclusion(ciJobs, 'build')).toBeNull();
  });

  it('marks evidence complete only when all workflows pass', () => {
    const selectedRuns = new Map(names.map((name, index) => [name, successRun(name, index + 1)]));
    const evidence = buildEvidenceDocument({ targetSha, selectedRuns, ciJobs });
    expect(evidence.status).toBe('Complete');
    expect(evidence.targetSha).toBe(targetSha);
    expect(evidence.checks.find((item) => item.name === 'requiredChecks')?.passed).toBe(true);
  });

  it('keeps missing workflows unverified', () => {
    const selectedRuns = new Map(names.slice(1).map((name, index) => [name, successRun(name, index + 1)]));
    const evidence = buildEvidenceDocument({ targetSha, selectedRuns, ciJobs });
    expect(evidence.status).toBe('Open');
    expect(evidence.unverified).toContain('ci');
  });

  it('records failed workflows without secrets', () => {
    const selectedRuns = new Map(names.map((name, index) => [name, successRun(name, index + 1)]));
    selectedRuns.set('CodeQL', { ...successRun('CodeQL', 99), conclusion: 'failure' });
    const evidence = buildEvidenceDocument({ targetSha, selectedRuns, ciJobs });
    expect(evidence.status).toBe('Failed');
    expect(evidence.failures).toContain('codeql');
    expect(JSON.stringify(evidence)).not.toContain('Authorization');
  });
});

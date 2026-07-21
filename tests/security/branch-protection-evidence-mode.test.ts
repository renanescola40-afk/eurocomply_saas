import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('scripts/security/check-branch-protection-evidence.mjs', 'utf8');

describe('branch protection evidence execution mode', () => {
  it('keeps expired open evidence visible without blocking ordinary pull requests', () => {
    expect(source).toContain("!isEnterpriseRelease");
    expect(source).toContain("['Exception', 'Open'].includes(evidence.status)");
    expect(source).toContain('isTimeBoundExceptionFailure(failure)');
    expect(source).toContain('warnings.push');
  });

  it('continues to fail closed for enterprise release validation', () => {
    expect(source).toContain("isEnterpriseRelease && ['Exception', 'Open'].includes(evidence.status)");
    expect(source).toContain("isEnterpriseRelease && evidence.status !== 'Complete'");
    expect(source).toContain('branch protection evidence must be Complete');
  });

  it('does not promote exception evidence or mutate readiness progress', () => {
    expect(source).not.toContain("evidence.status = 'Complete'");
    expect(source).not.toContain('scorePercent');
    expect(source).toContain('enterprise release validation must continue to fail closed');
  });
});

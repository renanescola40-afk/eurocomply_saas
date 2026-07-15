import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import {
  STATUS,
  applyEvidenceOverrides,
  calculateScorecard,
  createEvidenceReader,
  evaluateEvidenceDocument,
  validateConfig,
} from '../../scripts/enterprise/generate-readiness-scorecard.mjs';

const control = (title: string, critical = false) => ({
  title,
  critical,
  evidence: { path: `evidence/${title}.json` },
});

const config = {
  schemaVersion: 1,
  controlCount: 100,
  totalWeight: 100,
  domains: Array.from({ length: 10 }, (_, domainIndex) => ({
    id: `domain-${domainIndex + 1}`,
    name: `Domain ${domainIndex + 1}`,
    prefix: `D${domainIndex + 1}`,
    weight: 10,
    controls: Array.from({ length: 10 }, (_, controlIndex) =>
      control(`control-${domainIndex + 1}-${controlIndex + 1}`, controlIndex === 0),
    ),
  })),
};

describe('enterprise readiness scorecard', () => {
  it('requires exactly 100 controls and 100 total weight', () => {
    expect(validateConfig(config)).toEqual([]);
    expect(validateConfig({ ...config, controlCount: 99 })).toContain(
      'control count must be 100, received 100',
    );
  });

  it('normalizes complete and passed evidence to PASS', () => {
    expect(evaluateEvidenceDocument({ status: 'Complete', outcome: 'passed' })).toBe(STATUS.PASS);
    expect(
      evaluateEvidenceDocument({ checks: [{ name: 'build', passed: true }] }, 'build'),
    ).toBe(STATUS.PASS);
  });

  it('does not treat Open or missing named checks as success', () => {
    expect(evaluateEvidenceDocument({ status: 'Open' })).toBe(STATUS.NOT_VERIFIED);
    expect(evaluateEvidenceDocument({ checks: [] }, 'build')).toBe(STATUS.NOT_VERIFIED);
  });

  it('applies explicit evidence-only overrides without mutating the base controls', () => {
    const applied = applyEvidenceOverrides(config, {
      schemaVersion: 1,
      overrides: [
        {
          controlId: 'D10-01',
          evidence: { path: 'artifacts/trust.json', check: 'publicClaims' },
        },
      ],
    });

    expect(applied.failures).toEqual([]);
    expect(applied.config.domains[9].controls[0].evidence).toEqual({
      path: 'artifacts/trust.json',
      check: 'publicClaims',
    });
    expect(config.domains[9].controls[0].evidence).toEqual({
      path: 'evidence/control-10-1.json',
    });
  });

  it('rejects unknown, duplicate or policy-changing evidence overrides', () => {
    const applied = applyEvidenceOverrides(config, {
      schemaVersion: 1,
      overrides: [
        { controlId: 'UNKNOWN-01', evidence: { path: 'missing.json' } },
        { controlId: 'D1-01', evidence: { path: 'one.json' } },
        { controlId: 'D1-01', evidence: { path: 'two.json' }, critical: false },
      ],
    });

    expect(applied.failures).toContain('unknown evidence override control: UNKNOWN-01');
    expect(applied.failures).toContain('duplicate evidence override: D1-01');
    expect(applied.failures).toContain('evidence override contains unsupported field(s): critical');
  });

  it('uses exact-sha GitHub evidence only when the artifact matches the expected SHA', () => {
    const directory = mkdtempSync(join(tmpdir(), 'enterprise-scorecard-'));
    const githubChecksPath = join(directory, 'github-checks.json');
    const expectedSha = 'a'.repeat(40);

    try {
      writeFileSync(
        githubChecksPath,
        JSON.stringify({
          targetSha: expectedSha,
          checks: [
            { name: 'build', status: 'PASS' },
            { name: 'publicClaims', status: 'PASS' },
          ],
        }),
      );

      const reader = createEvidenceReader({ githubChecksPath, expectedSha });
      expect(reader({ path: 'missing.json', check: 'build' })).toEqual({
        status: STATUS.PASS,
        reason: 'derived_from_exact_sha_check:build',
      });
      expect(reader({ path: 'missing-trust.json', check: 'publicClaims' })).toEqual({
        status: STATUS.PASS,
        reason: 'derived_from_exact_sha_check:publicClaims',
      });

      const mismatchedReader = createEvidenceReader({
        githubChecksPath,
        expectedSha: 'b'.repeat(40),
      });
      expect(mismatchedReader({ path: 'missing.json', check: 'build' }).status).toBe(
        STATUS.NOT_VERIFIED,
      );
      expect(mismatchedReader({ path: 'missing-trust.json', check: 'publicClaims' }).status).toBe(
        STATUS.NOT_VERIFIED,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('does not use repository CI evidence for runtime-only controls', () => {
    const directory = mkdtempSync(join(tmpdir(), 'enterprise-scorecard-runtime-'));
    const githubChecksPath = join(directory, 'github-checks.json');

    try {
      writeFileSync(
        githubChecksPath,
        JSON.stringify({
          targetSha: 'a'.repeat(40),
          checks: [{ name: 'login', status: 'PASS' }],
        }),
      );

      const reader = createEvidenceReader({
        githubChecksPath,
        expectedSha: 'a'.repeat(40),
      });
      expect(reader({ path: join(directory, 'missing-runtime.json'), check: 'login' }).status).toBe(
        STATUS.NOT_VERIFIED,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('gives PARTIAL half weight and blocks GO when critical evidence is missing', () => {
    let index = 0;
    const scorecard = calculateScorecard(config, () => {
      index += 1;
      if (index <= 50) return { status: STATUS.PASS, reason: 'test' };
      if (index <= 70) return { status: STATUS.PARTIAL, reason: 'test' };
      return { status: STATUS.NOT_VERIFIED, reason: 'test' };
    });

    expect(scorecard.scorePercent).toBe(60);
    expect(scorecard.remainingPercent).toBe(40);
    expect(scorecard.releaseDecision).toBe('NO_GO');
    expect(scorecard.classification).toBe('CONTROLLED_BETA');
  });

  it('permits Enterprise GO only at 100 percent with every critical control PASS', () => {
    const scorecard = calculateScorecard(config, () => ({
      status: STATUS.PASS,
      reason: 'test',
    }));

    expect(scorecard.scorePercent).toBe(100);
    expect(scorecard.criticalOpen).toBe(0);
    expect(scorecard.releaseDecision).toBe('GO');
    expect(scorecard.classification).toBe('ENTERPRISE_GO');
    expect(scorecard.publishRecommendation).toBe('ENTERPRISE_PRODUCTION');
  });
});

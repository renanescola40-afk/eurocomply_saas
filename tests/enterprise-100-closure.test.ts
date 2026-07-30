import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
const originalSha = process.env.ENTERPRISE_CLOSURE_EXPECTED_SHA;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.chdir(originalCwd);
  if (originalSha === undefined) delete process.env.ENTERPRISE_CLOSURE_EXPECTED_SHA;
  else process.env.ENTERPRISE_CLOSURE_EXPECTED_SHA = originalSha;
});

describe('enterprise 100 closure contract', () => {
  it('fails closed when no exact SHA or evidence is available', async () => {
    delete process.env.ENTERPRISE_CLOSURE_EXPECTED_SHA;
    const { evaluateEnterpriseClosure } = await import('../scripts/release/check-enterprise-100-closure.mjs');

    const result = evaluateEnterpriseClosure({
      expectedSha: null,
      config: {
        requiredDecision: 'GO',
        controls: [
          {
            id: 'production-smoke',
            owner: 'sre',
            evidence: 'release-validation/does-not-exist.json',
            acceptedStatuses: ['PASS'],
          },
        ],
      },
    });

    expect(result.passed).toBe(false);
    expect(result.decision).toBe('NO_GO');
    expect(result.blockers).toContain('exact_sha_unavailable');
    expect(result.blockers).toContain('production-smoke:evidence_missing');
  });

  it('does not accept evidence that is not bound to the promoted SHA', async () => {
    const { evaluateEnterpriseClosure } = await import('../scripts/release/check-enterprise-100-closure.mjs');

    const result = evaluateEnterpriseClosure({
      expectedSha: 'expected-sha',
      config: {
        requiredDecision: 'GO',
        controls: [
          {
            id: 'missing-runtime-proof',
            owner: 'sre',
            evidence: 'release-validation/does-not-exist.json',
            acceptedStatuses: ['PASS'],
          },
        ],
      },
    });

    expect(result.passed).toBe(false);
    expect(result.controls[0]?.accepted).toBe(false);
  });
});

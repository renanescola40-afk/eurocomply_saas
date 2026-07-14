import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  evaluateRuntimeReleaseSha,
  normalizeReleaseSha,
} from '../../scripts/release/runtime-release-sha-contract.mjs';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

describe('runtime release SHA binding', () => {
  it('requires full unambiguous Git SHAs', () => {
    expect(normalizeReleaseSha(SHA_A.toUpperCase())).toBe(SHA_A);
    expect(normalizeReleaseSha('abc1234')).toBeNull();
    expect(normalizeReleaseSha('not-a-sha')).toBeNull();
  });

  it('passes only when expected commit, build and observed runtime SHAs match exactly', () => {
    expect(evaluateRuntimeReleaseSha({
      expectedCommitSha: SHA_A,
      expectedBuildSha: SHA_A,
      observedCommitSha: SHA_A,
      endpointStatus: 200,
      cacheControl: 'private, no-store',
    })).toMatchObject({
      passed: true,
      expectedCommitSha: SHA_A,
      expectedBuildSha: SHA_A,
      observedCommitSha: SHA_A,
      failures: [],
    });
  });

  it('fails closed for a stale or different runtime deployment', () => {
    const result = evaluateRuntimeReleaseSha({
      expectedCommitSha: SHA_A,
      expectedBuildSha: SHA_A,
      observedCommitSha: SHA_B,
      endpointStatus: 200,
      cacheControl: 'no-store',
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain('observedRuntimeCommitMatchesExpected');
  });

  it('fails closed when expected commit and build metadata disagree', () => {
    const result = evaluateRuntimeReleaseSha({
      expectedCommitSha: SHA_A,
      expectedBuildSha: SHA_B,
      observedCommitSha: SHA_A,
      endpointStatus: 200,
      cacheControl: 'no-store',
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain('expectedCommitAndBuildShaMatch');
  });

  it('keeps the verifier in both final release profiles and preserves its evidence artifact', () => {
    const wrapper = readFileSync('scripts/release/run-public-production-release.mjs', 'utf8');
    const workflow = readFileSync('.github/workflows/public-production-final.yml', 'utf8');
    const verifier = readFileSync('scripts/release/verify-runtime-release-sha.mjs', 'utf8');

    expect(wrapper.match(/verifyRuntimeReleaseSha\(\)/g)).toHaveLength(3);
    expect(wrapper).toContain("await import('./run-public-production-release-v2.mjs');\n  await verifyRuntimeReleaseSha();");
    expect(wrapper).toContain("await import('./run-public-production-release-final.mjs');\n  await verifyRuntimeReleaseSha();");
    expect(workflow).toContain('runtime-release-sha-validation.json');
    expect(verifier).toContain('production-final-validation.json');
    expect(verifier).toContain('final-validation-runner.json');
    expect(verifier).toContain("document.status = 'Open'");
    expect(verifier).toContain("document.outcome = 'failed'");
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  evaluateRuntimeReleaseSha,
  normalizeReleaseSha,
  sanitizeRuntimeReleaseResponse,
  selectPersistedObservedCommitSha,
} from '../../scripts/release/runtime-release-sha-contract.mjs';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

describe('runtime release SHA binding', () => {
  it('requires full unambiguous Git SHAs', () => {
    expect(normalizeReleaseSha(SHA_A.toUpperCase())).toBe(SHA_A);
    expect(normalizeReleaseSha('abc1234')).toBeNull();
    expect(normalizeReleaseSha('not-a-sha')).toBeNull();
  });

  it('sanitizes the protected runtime response before evaluation', () => {
    expect(sanitizeRuntimeReleaseResponse({
      status: 'ok',
      release: {
        available: true,
        commitSha: SHA_A.toUpperCase(),
        provenance: 'vercel',
        ignored: 'do-not-persist',
      },
    })).toEqual({
      statusOk: true,
      available: true,
      observedCommitSha: SHA_A,
      provenance: 'vercel',
    });
    expect(sanitizeRuntimeReleaseResponse({
      status: 'unsafe-status',
      release: {
        available: 'yes',
        commitSha: `${SHA_A}malicious-suffix`,
        provenance: 'attacker-controlled',
      },
    })).toEqual({
      statusOk: false,
      available: false,
      observedCommitSha: null,
      provenance: 'unavailable',
    });
  });

  it('persists an observed SHA only by selecting the trusted expected SHA after exact equality', () => {
    expect(selectPersistedObservedCommitSha({
      expectedCommitSha: SHA_A,
      observedCommitSha: SHA_A,
    })).toBe(SHA_A);
    expect(selectPersistedObservedCommitSha({
      expectedCommitSha: SHA_A,
      observedCommitSha: SHA_B,
    })).toBeNull();
    expect(selectPersistedObservedCommitSha({
      expectedCommitSha: SHA_A,
      observedCommitSha: `${SHA_A}untrusted`,
    })).toBeNull();
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

  it('keeps the verifier in the shared finalizer and preserves evidence-specific failure states', () => {
    const wrapper = readFileSync('scripts/release/run-public-production-release.mjs', 'utf8');
    const workflow = readFileSync('.github/workflows/public-production-final.yml', 'utf8');
    const verifier = readFileSync('scripts/release/verify-runtime-release-sha.mjs', 'utf8');

    const finalizerStart = wrapper.indexOf('async function finalizeSecurityResponseEvidence()');
    const finalizerEnd = wrapper.indexOf('\n}\n\nif (enterpriseRequested)', finalizerStart);
    const finalizer = wrapper.slice(finalizerStart, finalizerEnd);
    const enterpriseStart = wrapper.indexOf('if (enterpriseRequested)');
    const publicStart = wrapper.indexOf("} else if (releaseTarget === 'public-production'");
    const unsupportedStart = wrapper.indexOf('} else {', publicStart);
    const enterpriseBlock = wrapper.slice(enterpriseStart, publicStart);
    const publicBlock = wrapper.slice(publicStart, unsupportedStart);

    expect(finalizerStart).toBeGreaterThan(-1);
    expect(finalizer).toContain('verifyRuntimeReleaseSha();');
    expect(wrapper).toContain("runNodeScript('scripts/release/verify-runtime-release-sha.mjs');");
    expect(enterpriseBlock).toContain("await import('./run-public-production-release-v2.mjs');");
    expect(enterpriseBlock).toContain('await finalizeSecurityResponseEvidence();');
    expect(publicBlock).toContain("await import('./run-public-production-release-final.mjs');");
    expect(publicBlock).toContain('await finalizeSecurityResponseEvidence();');
    expect(workflow).toContain('runtime-release-sha-validation.json');
    expect(verifier).toContain('production-final-validation.json');
    expect(verifier).toContain('final-validation-runner.json');
    expect(verifier).toContain('export function applyRuntimeShaBindingStatus');
    expect(verifier).toContain("next.status = 'Open'");
    expect(verifier).toContain("next.evidenceItem === 'final-validation-runner'");
    expect(verifier).toContain("next.outcome = 'blocked'");
    expect(verifier).toContain("next.releaseDecision = 'No-Go'");
    expect(verifier).toContain("next.outcome = 'failed'");
    expect(verifier).toContain("next.overallResult = 'failed'");
    expect(verifier).toContain('readJsonIfPresent(path)');
    expect(verifier).not.toContain('existsSync');
    expect(verifier).toContain('selectPersistedObservedCommitSha({');
    expect(verifier).toContain('observedCommitSha: persistedObservedCommitSha');
    expect(verifier).toContain("requestFailure: requestFailed ? 'request_failed' : null");
    expect(verifier).not.toContain("error.message : 'request_failed'");
    expect(verifier).toContain('rawNetworkPayloadStored: false');
    expect(verifier).toContain('mismatchedObservedShaStored: false');
  });
});

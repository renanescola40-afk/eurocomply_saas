import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeRuntimeCommitSha, runtimeReleaseMetadata } from './runtime-release-metadata';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

describe('runtime release metadata', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts full Git commit SHAs and normalizes them to lowercase', () => {
    expect(normalizeRuntimeCommitSha(SHA_A.toUpperCase())).toBe(SHA_A);
    expect(normalizeRuntimeCommitSha('abc1234')).toBeNull();
    expect(normalizeRuntimeCommitSha('not-a-sha')).toBeNull();
  });

  it('prefers Vercel runtime provenance over configured build metadata', () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', SHA_A);
    vi.stubEnv('RELEASE_BUILD_SHA', SHA_B);

    expect(runtimeReleaseMetadata()).toEqual({
      available: true,
      commitSha: SHA_A,
      provenance: 'vercel',
    });
  });

  it('uses explicit build metadata when platform metadata is unavailable', () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '');
    vi.stubEnv('NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', '');
    vi.stubEnv('RELEASE_BUILD_SHA', SHA_B);

    expect(runtimeReleaseMetadata()).toEqual({
      available: true,
      commitSha: SHA_B,
      provenance: 'build-env',
    });
  });

  it('fails closed for missing or malformed runtime metadata', () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'invalid');
    vi.stubEnv('NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', '');
    vi.stubEnv('RELEASE_BUILD_SHA', '');
    vi.stubEnv('NEXT_PUBLIC_BUILD_SHA', '');

    expect(runtimeReleaseMetadata()).toEqual({
      available: false,
      commitSha: null,
      provenance: 'unavailable',
    });
  });
});

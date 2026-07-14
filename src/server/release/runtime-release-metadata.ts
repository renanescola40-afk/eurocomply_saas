const FULL_GIT_SHA_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;

type ReleaseEnvironment = Record<string, string | undefined>;

export type RuntimeReleaseMetadata = {
  available: boolean;
  commitSha: string | null;
  provenance: 'vercel' | 'build-env' | 'unavailable';
};

export function normalizeRuntimeCommitSha(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return FULL_GIT_SHA_PATTERN.test(normalized) ? normalized : null;
}

export function runtimeReleaseMetadata(
  environment: ReleaseEnvironment = process.env,
): RuntimeReleaseMetadata {
  const candidates = [
    { value: environment.VERCEL_GIT_COMMIT_SHA, provenance: 'vercel' as const },
    { value: environment.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA, provenance: 'vercel' as const },
    { value: environment.RELEASE_BUILD_SHA, provenance: 'build-env' as const },
    { value: environment.NEXT_PUBLIC_BUILD_SHA, provenance: 'build-env' as const },
  ];

  for (const candidate of candidates) {
    const commitSha = normalizeRuntimeCommitSha(candidate.value);
    if (commitSha) {
      return {
        available: true,
        commitSha,
        provenance: candidate.provenance,
      };
    }
  }

  return {
    available: false,
    commitSha: null,
    provenance: 'unavailable',
  };
}

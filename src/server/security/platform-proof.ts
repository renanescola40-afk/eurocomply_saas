import { runtimeReleaseMetadata, normalizeRuntimeCommitSha } from '@/server/release/runtime-release-metadata';
import { validateBearerToken } from '@/server/security/bearer-token';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export type PlatformProofAuthorization =
  | { ok: true; releaseSha: string }
  | { ok: false; response: Response };

export async function authorizePlatformProofRequest(
  request: Request,
  options: { route: string; action: string; authLimit?: number },
): Promise<PlatformProofAuthorization> {
  const rateLimited = await enforceInternalAuthenticationRateLimit(request, {
    route: options.route,
    action: options.action,
    limit: options.authLimit ?? 30,
    windowMs: 60_000,
  });
  if (rateLimited) return { ok: false, response: rateLimited };

  const configuredToken = String(process.env.PLATFORM_PROOF_TOKEN ?? '').trim();
  if (!configuredToken) {
    return {
      ok: false,
      response: noStoreJson({ error: 'platform_proof_not_configured' }, { status: 503 }),
    };
  }

  if (!validateBearerToken(request, configuredToken, { allowMissingTokenOutsideProduction: false })) {
    return {
      ok: false,
      response: noStoreJson({ error: 'unauthorized' }, { status: 401 }),
    };
  }

  const requestedSha = normalizeRuntimeCommitSha(request.headers.get('x-release-sha'));
  const runtime = runtimeReleaseMetadata();
  if (!requestedSha || !runtime.available || !runtime.commitSha || runtime.commitSha !== requestedSha) {
    return {
      ok: false,
      response: noStoreJson({ error: 'release_sha_mismatch' }, { status: 409 }),
    };
  }

  return { ok: true, releaseSha: requestedSha };
}

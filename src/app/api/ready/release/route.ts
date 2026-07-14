import { requireEnterpriseRateLimit } from '@/server/security/api-guards';
import { validateBearerToken } from '@/server/security/bearer-token';
import { noStoreJson } from '@/server/security/no-store';
import { logSecurityEvent, requestIdFromHeaders } from '@/server/observability/logger';
import { runtimeReleaseMetadata } from '@/server/release/runtime-release-metadata';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function hasHealthcheckToken(request: Request) {
  return validateBearerToken(request, process.env.HEALTHCHECK_TOKEN, {
    allowMissingTokenOutsideProduction: false,
  });
}

export async function GET(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  const rateLimitDenied = await requireEnterpriseRateLimit(request, {
    policy: 'health-internal',
    action: 'release_metadata_auth',
    route: '/api/ready/release',
    failureMode: 'fail-closed',
  });
  if (rateLimitDenied) return rateLimitDenied;

  if (!hasHealthcheckToken(request)) {
    logSecurityEvent('security_denied', {
      requestId,
      route: '/api/ready/release',
      reason: 'missing_or_invalid_healthcheck_token',
    });

    return noStoreJson({ status: 'unauthorized', requestId }, { status: 401 });
  }

  const release = runtimeReleaseMetadata();
  return noStoreJson(
    {
      status: release.available ? 'ok' : 'not_ready',
      requestId,
      release,
    },
    { status: release.available ? 200 : 503 },
  );
}

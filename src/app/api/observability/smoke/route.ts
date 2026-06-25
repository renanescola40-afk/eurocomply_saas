import { reportError } from '@/lib/observability/report-error';
import { logSecurityEvent, requestIdFromHeaders } from '@/server/observability/logger';
import { validateBearerToken } from '@/server/security/bearer-token';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/observability/smoke';
const SMOKE_TEST_ERROR_MESSAGE = 'risck_comply_observability_smoke_test';

function hasHealthcheckToken(request: Request) {
  return validateBearerToken(request, process.env.HEALTHCHECK_TOKEN, {
    allowMissingTokenOutsideProduction: false,
  });
}

export async function POST(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);

  if (!hasHealthcheckToken(request)) {
    logSecurityEvent('security_denied', {
      requestId,
      route: ROUTE,
      reason: 'missing_or_invalid_healthcheck_token',
    });

    return noStoreJson({ status: 'unauthorized', requestId }, { status: 401 });
  }

  const report = reportError(new Error(SMOKE_TEST_ERROR_MESSAGE), {
    area: 'observability_smoke',
    route: ROUTE,
    requestId,
    smokeTest: true,
  });

  return noStoreJson({
    status: 'sent',
    provider: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN ? 'sentry' : 'local_log',
    requestId,
    report,
  });
}

export function GET(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);

  return noStoreJson(
    {
      status: 'method_not_allowed',
      requestId,
      allowedMethods: ['POST'],
    },
    {
      status: 405,
      headers: {
        Allow: 'POST',
      },
    },
  );
}

import { reportError } from '@/lib/observability/report-error';
import { noStoreJson } from '@/server/security/no-store';
import { authorizePlatformProofRequest } from '@/server/security/platform-proof';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/internal/platform-proof/sentry';
const PROOF_ERROR = 'risck_comply_platform_provider_sentry_proof';

export async function POST(request: Request) {
  const authorization = await authorizePlatformProofRequest(request, {
    route: ROUTE,
    action: 'platform_proof_sentry',
  });
  if (!authorization.ok) return authorization.response;

  if (!(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN)) {
    return noStoreJson({ error: 'sentry_not_configured' }, { status: 503 });
  }

  reportError(new Error(PROOF_ERROR), {
    area: 'platform_provider_runtime_proof',
    synthetic: true,
    releaseSha: authorization.releaseSha,
  });

  return noStoreJson(
    { ok: true, provider: 'sentry', synthetic: true },
    {
      headers: {
        'x-sentry-release': authorization.releaseSha,
      },
    },
  );
}

import * as Sentry from '@sentry/nextjs';

import { noStoreJson } from '@/server/security/no-store';
import { authorizePlatformProofRequest } from '@/server/security/platform-proof';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/internal/platform-proof/sentry';
const PROOF_EVENT = 'risck_comply_platform_provider_sentry_proof';
const SENTRY_FLUSH_TIMEOUT_MS = 5_000;

export async function POST(request: Request) {
  const authorization = await authorizePlatformProofRequest(request, {
    route: ROUTE,
    action: 'platform_proof_sentry',
  });
  if (!authorization.ok) return authorization.response;

  if (!(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN)) {
    return noStoreJson({ error: 'sentry_not_configured' }, { status: 503 });
  }

  const eventId = Sentry.captureEvent({
    message: PROOF_EVENT,
    level: 'info',
    release: authorization.releaseSha,
    tags: {
      area: 'platform_provider_runtime_proof',
      synthetic: 'true',
    },
  });

  const flushed = await Sentry.flush(SENTRY_FLUSH_TIMEOUT_MS);
  if (!flushed || !/^[a-f0-9]{32}$/i.test(eventId)) {
    return noStoreJson({ error: 'sentry_transport_unconfirmed' }, { status: 503 });
  }

  return noStoreJson({
    ok: true,
    provider: 'sentry',
    synthetic: true,
    eventId,
    release: authorization.releaseSha,
  });
}

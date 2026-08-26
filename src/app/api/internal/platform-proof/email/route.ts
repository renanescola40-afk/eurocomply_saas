import { sendEmail } from '@/lib/email/client';
import { noStoreJson } from '@/server/security/no-store';
import { authorizePlatformProofRequest } from '@/server/security/platform-proof';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/internal/platform-proof/email';
const RESEND_DELIVERY_TEST_RECIPIENT = 'delivered@resend.dev';

export async function POST(request: Request) {
  const authorization = await authorizePlatformProofRequest(request, {
    route: ROUTE,
    action: 'platform_proof_email',
  });
  if (!authorization.ok) return authorization.response;

  try {
    const delivery = await sendEmail({
      to: RESEND_DELIVERY_TEST_RECIPIENT,
      subject: 'RISCK COMPLY platform provider proof',
      text: 'Bounded synthetic transactional-email delivery proof.',
      html: '<p>Bounded synthetic transactional-email delivery proof.</p>',
      template: 'security_alert',
      idempotencyKey: `platform-proof/email/${authorization.releaseSha}`,
      metadata: {
        source: 'platform_provider_runtime_proof',
        synthetic: true,
      },
    });

    if (!delivery.sent || delivery.provider !== 'resend') {
      return noStoreJson({ error: 'email_delivery_not_confirmed' }, { status: 503 });
    }

    return noStoreJson({ ok: true, provider: 'resend', synthetic: true });
  } catch {
    return noStoreJson({ error: 'email_delivery_unavailable' }, { status: 503 });
  }
}

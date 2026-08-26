import { getStripeClient } from '@/server/billing/stripe';
import { noStoreJson } from '@/server/security/no-store';
import { authorizePlatformProofRequest } from '@/server/security/platform-proof';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/internal/platform-proof/stripe-checkout';

export async function POST(request: Request) {
  const authorization = await authorizePlatformProofRequest(request, {
    route: ROUTE,
    action: 'platform_proof_stripe_checkout',
  });
  if (!authorization.ok) return authorization.response;

  try {
    const stripe = getStripeClient();
    await stripe.checkout.sessions.list({ limit: 1 });
    return noStoreJson({ ok: true, provider: 'stripe', operation: 'checkout_read_probe' });
  } catch {
    return noStoreJson({ error: 'stripe_checkout_probe_unavailable' }, { status: 503 });
  }
}

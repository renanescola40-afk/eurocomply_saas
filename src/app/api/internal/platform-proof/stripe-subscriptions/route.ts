import { getStripeClient } from '@/server/billing/stripe';
import { noStoreJson } from '@/server/security/no-store';
import { authorizePlatformProofRequest } from '@/server/security/platform-proof';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/internal/platform-proof/stripe-subscriptions';

export async function GET(request: Request) {
  const authorization = await authorizePlatformProofRequest(request, {
    route: ROUTE,
    action: 'platform_proof_stripe_subscriptions',
  });
  if (!authorization.ok) return authorization.response;

  try {
    const stripe = getStripeClient();
    await stripe.subscriptions.list({ limit: 1, status: 'all' });
    return noStoreJson({ ok: true, provider: 'stripe', operation: 'subscription_read_probe' });
  } catch {
    return noStoreJson({ error: 'stripe_subscription_probe_unavailable' }, { status: 503 });
  }
}

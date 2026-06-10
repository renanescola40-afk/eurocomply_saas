import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeClient } from '@/server/billing/stripe';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? 'http://localhost:3000';

function getBaseUrl() {
  if (APP_URL.startsWith('http')) return APP_URL;
  return `https://${APP_URL}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) {
    return NextResponse.json({ error: 'Organization required.' }, { status: 403 });
  }

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'manage_billing',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const supabase = createAdminClient();
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('organization_id', organization.id)
    .not('stripe_customer_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Unable to load billing profile.' }, { status: 500 });
  }

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error: 'No active Stripe customer found.' }, { status: 404 });
  }

  const url = new URL(request.url);
  const locale = url.searchParams.get('locale') ?? 'en';
  const returnUrl = `${getBaseUrl()}/${locale}/settings/billing`;

  const stripe = getStripeClient();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: portalSession.url });
}

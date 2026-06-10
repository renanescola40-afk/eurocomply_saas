import { NextResponse } from 'next/server';

import { getStripeClient } from '@/server/billing/stripe';
import { getStripePriceId, isSelfServePlan } from '@/server/billing/plans';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'authentication_required' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { plan?: string; locale?: string } | null;
  const plan = body?.plan;
  const locale = body?.locale?.match(/^(en|pt|es|fr|it|de)$/) ? body.locale : 'en';

  if (!plan || !isSelfServePlan(plan)) {
    return NextResponse.json({ error: 'invalid_plan' }, { status: 400 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization?.id) {
    return NextResponse.json({ error: 'organization_required' }, { status: 400 });
  }

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'manage_billing',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const stripe = getStripeClient();
  const priceId = getStripePriceId(plan);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/${locale}/dashboard/organizations?checkout=success`,
    cancel_url: `${appUrl}/${locale}/pricing?checkout=cancelled`,
    client_reference_id: organization.id,
    metadata: {
      organization_id: organization.id,
      user_id: user.id,
      plan,
      actor_role: permission.role ?? 'unknown',
    },
    subscription_data: {
      metadata: {
        organization_id: organization.id,
        user_id: user.id,
        plan,
        actor_role: permission.role ?? 'unknown',
      },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}

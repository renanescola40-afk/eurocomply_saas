import { NextResponse } from 'next/server';
import { getBillingPlan, getStripePriceId } from '@/lib/billing/plans';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';

export const dynamic = 'force-dynamic';

type CheckoutIntentRequest = {
  plan?: string;
  planId?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function resolvePlanId(request: Request) {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    return url.searchParams.get('plan') ?? url.searchParams.get('planId') ?? '';
  }

  try {
    const body = (await request.json()) as CheckoutIntentRequest;
    return body.planId ?? body.plan ?? '';
  } catch {
    return '';
  }
}

async function handleCheckoutIntent(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonResponse({ ok: false, error: 'authentication_required' }, 401);
  }

  const planId = await resolvePlanId(request);
  const plan = getBillingPlan(planId);

  if (!plan) {
    return jsonResponse({ ok: false, error: 'invalid_plan' }, 400);
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization?.id) {
    return jsonResponse({ ok: false, error: 'organization_required' }, 409);
  }

  const entitlements = await getOrganizationEntitlements(organization.id);
  const priceId = getStripePriceId(plan);
  const alreadyOnPlan = entitlements.plan === plan.id;

  return jsonResponse({
    ok: true,
    checkoutIntent: {
      plan: {
        id: plan.id,
        name: plan.name,
        priceMonthly: plan.priceMonthly,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      currentPlan: entitlements.plan,
      alreadyOnPlan,
      checkoutReady: Boolean(priceId) && !alreadyOnPlan,
      nextAction: alreadyOnPlan
        ? 'already_subscribed'
        : priceId
          ? 'create_checkout_session'
          : 'configure_plan_price',
    },
  });
}

export async function GET(request: Request) {
  return handleCheckoutIntent(request);
}

export async function POST(request: Request) {
  return handleCheckoutIntent(request);
}

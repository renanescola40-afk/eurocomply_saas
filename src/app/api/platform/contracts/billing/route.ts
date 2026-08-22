import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { noStoreJson } from '@/server/security/no-store';
import {
  requireApiUser,
  requireTrustedMutation,
  secureApiError,
} from '@/server/security/api-guards';
import {
  PlatformAdminError,
  requirePlatformCapability,
} from '@/server/security/platform-admin';

const MAX_BILLING_CONFIGURATION_BYTES = 12 * 1024;
const billingSchema = z.object({
  contractId: z.string().uuid(),
  paymentMethod: z.enum(['stripe_subscription', 'stripe_invoice', 'bank_transfer', 'manual_invoice']),
  billingStatus: z.enum(['unlinked', 'pending', 'active', 'paid', 'past_due', 'manual_invoice', 'canceled', 'failed']),
  stripeCustomerId: z.string().trim().max(255).nullable().optional(),
  stripeSubscriptionId: z.string().trim().max(255).nullable().optional(),
  stripePriceId: z.string().trim().max(255).nullable().optional(),
  externalReference: z.string().trim().max(255).nullable().optional(),
  paymentDueAt: z.string().datetime({ offset: true }).nullable().optional(),
  reason: z.string().trim().min(5).max(1000),
}).superRefine((value, context) => {
  if (value.paymentMethod === 'stripe_subscription' && !value.stripeSubscriptionId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['stripeSubscriptionId'],
      message: 'Stripe subscription ID is required.',
    });
  }
  if (value.paymentMethod === 'stripe_invoice' && !value.stripeCustomerId && !value.externalReference) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['stripeCustomerId'],
      message: 'Stripe customer or invoice reference is required.',
    });
  }
  if (value.billingStatus === 'past_due' && !value.paymentDueAt) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['paymentDueAt'],
      message: 'Payment due date is required for past due contracts.',
    });
  }
});

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

type BillingRow = {
  outcome?: unknown;
  contract_id?: unknown;
  organization_id?: unknown;
  billing_status?: unknown;
  contract_status?: unknown;
  version?: unknown;
};

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === 'object' ? (data as T) : null;
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function integerOrNull(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `platform-contract-billing:${user.id}:${getClientIp(request)}`,
        policy: 'billing-checkout',
        userId: user.id,
        action: 'enterprise_contract_billing_configure',
        route: '/api/platform/contracts/billing',
        limit: 20,
        windowMs: 10 * 60_000,
        failureMode: 'fail-closed',
      },
    });
    if (mutationDenied) return mutationDenied;

    await requirePlatformCapability(user.id, 'billing');

    const payload = await readBoundedJsonRequest(request, {
      maxBytes: MAX_BILLING_CONFIGURATION_BYTES,
    }).catch(() => null);
    const parsed = billingSchema.safeParse(payload);
    if (!parsed.success) {
      return noStoreJson({ error: 'invalid_enterprise_billing_configuration' }, { status: 400 });
    }

    const client = createAdminClient() as unknown as RpcClient;
    const { data, error } = await client.rpc('configure_enterprise_contract_billing_v2_atomic', {
      p_contract_id: parsed.data.contractId,
      p_payment_method: parsed.data.paymentMethod,
      p_billing_status: parsed.data.billingStatus,
      p_stripe_customer_id: parsed.data.stripeCustomerId ?? null,
      p_stripe_subscription_id: parsed.data.stripeSubscriptionId ?? null,
      p_stripe_price_id: parsed.data.stripePriceId ?? null,
      p_external_reference: parsed.data.externalReference ?? null,
      p_payment_due_at: parsed.data.paymentDueAt ?? null,
      p_actor_user_id: user.id,
      p_reason: parsed.data.reason,
    });

    if (error) {
      console.warn('[enterprise-billing] configuration_failed', { code: error.code ?? 'unknown' });
      return noStoreJson({ error: 'enterprise_billing_configuration_unavailable' }, { status: 503 });
    }

    const row = firstRow<BillingRow>(data);
    if (!row || row.outcome === 'not_found') {
      return noStoreJson({ error: 'enterprise_contract_not_found' }, { status: 404 });
    }
    if (row.outcome === 'platform_role_required') {
      return noStoreJson({ error: 'platform_billing_role_required' }, { status: 403 });
    }
    if (row.outcome === 'invalid_input') {
      return noStoreJson({ error: 'invalid_enterprise_billing_configuration' }, { status: 400 });
    }
    if (row.outcome !== 'configured') {
      return noStoreJson({ error: 'enterprise_billing_configuration_unavailable' }, { status: 503 });
    }

    return noStoreJson({
      configured: true,
      contractId: stringOrNull(row.contract_id),
      organizationId: stringOrNull(row.organization_id),
      billingStatus: stringOrNull(row.billing_status),
      contractStatus: stringOrNull(row.contract_status),
      version: integerOrNull(row.version),
    });
  } catch (error) {
    if (error instanceof PlatformAdminError) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    return secureApiError(error, request);
  }
}

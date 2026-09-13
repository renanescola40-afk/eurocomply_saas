import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { isAddOnCheckoutEnabled } from '@/server/billing/add-on-release';
import { beginAddOnPurchase, isAddOnPurchaseError } from '@/server/billing/add-on-purchase';
import { readBillingIdempotencyKey } from '@/server/billing/idempotency';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, requirePermission, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const BODY_MAX_BYTES = 2 * 1024;
const schema = z.object({
  addOnSlug: z.string().trim().min(1).max(80),
  quantity: z.number().int().min(1).max(10_000).optional(),
}).strict();

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization?.id) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    const permission = await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_billing',
    });

    const denied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `billing:add-on-purchase:${organization.id}:${user.id}`,
        policy: 'billing-checkout',
        userId: user.id,
        organizationId: organization.id,
        action: 'billing_add_on_purchase',
        route: '/api/billing/add-ons/purchase',
        limit: 8,
        windowMs: 60 * 1000,
        failureMode: 'fail-closed',
      },
    });
    if (denied) return denied;

    const parsed = schema.safeParse(
      await readBoundedJsonRequest(request, { maxBytes: BODY_MAX_BYTES }).catch(() => null),
    );
    if (!parsed.success) return noStoreJson({ error: 'invalid_add_on_purchase_request' }, { status: 400 });

    if (!isAddOnCheckoutEnabled()) {
      return noStoreJson({ error: 'add_on_checkout_not_enabled' }, { status: 409 });
    }

    const idempotency = readBillingIdempotencyKey(request, {
      scope: 'subscription',
      organizationId: organization.id,
      userId: user.id,
    });
    if (!idempotency.ok) return noStoreJson({ error: idempotency.error }, { status: 400 });

    const stepUp = await requireStepUpForRequest({
      request,
      action: 'manage_billing',
      userId: user.id,
      organizationId: organization.id,
    });
    if (!stepUp.ok) return stepUp.response;

    const result = await beginAddOnPurchase({
      organizationId: organization.id,
      userId: user.id,
      actorRole: permission.role ?? 'unknown',
      addOnSlug: parsed.data.addOnSlug,
      quantity: parsed.data.quantity,
      idempotency: idempotency.context,
    });

    return noStoreJson({
      outcome: result.outcome,
      paymentState: result.paymentState,
      invoiceId: result.invoiceId,
      hostedInvoiceUrl: result.hostedInvoiceUrl,
      // The browser receives payment navigation/processing state only. It never
      // receives or writes an entitlement grant or provider secret.
      entitlementGranted: false,
      stepUp: publicStepUpSummary(stepUp.assessment),
    });
  } catch (error) {
    if (isAddOnPurchaseError(error)) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    return secureApiError(error, request);
  }
}

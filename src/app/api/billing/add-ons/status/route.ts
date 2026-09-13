import { z } from 'zod';

import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { getOrganizationAddOnPurchaseStatus, isAddOnPurchaseError } from '@/server/billing/add-on-purchase';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, secureApiError } from '@/server/security/api-guards';
import {
  buildRateLimitSubjectFromRequest,
  checkDistributedRateLimit,
} from '@/server/security/rate-limit';

const slugSchema = z.string().trim().min(1).max(80);
const invoiceSchema = z.string().trim().regex(/^in_[A-Za-z0-9_]+$/).max(128).optional();
const ADD_ON_STATUS_ROUTE = '/api/billing/add-ons/status';
const ADD_ON_STATUS_LIMIT = 60;
const ADD_ON_STATUS_WINDOW_MS = 60_000;

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization?.id) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    const rateLimit = await checkDistributedRateLimit({
      ...buildRateLimitSubjectFromRequest(request, {
        userId: user.id,
        organizationId: organization.id,
        action: 'billing.add-ons.status.poll',
        route: ADD_ON_STATUS_ROUTE,
      }),
      policy: 'general-api',
      limit: ADD_ON_STATUS_LIMIT,
      windowMs: ADD_ON_STATUS_WINDOW_MS,
      failureMode: 'fail-closed',
    });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const url = new URL(request.url);
    const parsedSlug = slugSchema.safeParse(url.searchParams.get('addon'));
    if (!parsedSlug.success) return noStoreJson({ error: 'invalid_add_on' }, { status: 400 });
    const rawInvoice = url.searchParams.get('invoice') ?? undefined;
    const parsedInvoice = invoiceSchema.safeParse(rawInvoice);
    if (!parsedInvoice.success) return noStoreJson({ error: 'invalid_invoice' }, { status: 400 });

    const result = await getOrganizationAddOnPurchaseStatus(
      organization.id,
      parsedSlug.data,
      parsedInvoice.data,
    );
    return noStoreJson(result);
  } catch (error) {
    if (isAddOnPurchaseError(error)) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    return secureApiError(error, request);
  }
}
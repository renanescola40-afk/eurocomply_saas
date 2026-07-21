import { z } from 'zod';

import {
  getSeatAvailability,
  resolveEnterpriseEntitlements,
} from '@/server/enterprise/licensing';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, secureApiError } from '@/server/security/api-guards';
import { requirePlatformCapability } from '@/server/security/platform-admin';

const organizationIdSchema = z.string().uuid();

export async function GET(
  _request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    const user = await requireApiUser();
    await requirePlatformCapability(user.id, 'organizations');

    const params = await context.params;
    const parsedOrganizationId = organizationIdSchema.safeParse(params.organizationId);

    if (!parsedOrganizationId.success) {
      return noStoreJson({ error: 'invalid_organization_id' }, { status: 400 });
    }

    const entitlement = await resolveEnterpriseEntitlements(parsedOrganizationId.data);

    return noStoreJson({
      organizationId: entitlement.organizationId,
      contractId: entitlement.contractId,
      contractStatus: entitlement.contractStatus,
      canAddMembers: entitlement.canAddMembers,
      limits: entitlement.limits,
      usage: entitlement.usage,
      available: {
        members: entitlement.canAddMembers
          ? Math.max(entitlement.limits.members - entitlement.usage.activeMembers, 0)
          : 0,
        fullUsers: getSeatAvailability(entitlement, 'full'),
        participants: getSeatAvailability(entitlement, 'participant'),
        viewers: getSeatAvailability(entitlement, 'viewer'),
        admins: entitlement.canAddMembers
          ? Math.max(entitlement.limits.admins - entitlement.usage.activeAdmins, 0)
          : 0,
      },
      features: entitlement.features,
    });
  } catch (error) {
    return secureApiError(error);
  }
}

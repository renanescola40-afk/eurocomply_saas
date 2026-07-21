import { z } from 'zod';

import {
  getSeatAvailability,
  resolveEnterpriseEntitlements,
} from '@/server/enterprise/licensing';
import { noStoreJson } from '@/server/security/no-store';
import { requireApiUser, secureApiError } from '@/server/security/api-guards';
import {
  PlatformAdminError,
  requirePlatformCapability,
} from '@/server/security/platform-admin';

const organizationIdSchema = z.string().uuid();

export async function GET(
  request: Request,
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
      contractVersion: entitlement.contractVersion,
      canAddMembers: entitlement.canAddMembers,
      limits: entitlement.limits,
      usage: entitlement.usage,
      pending: entitlement.pending,
      available: {
        members: entitlement.canAddMembers
          ? Math.max(
              entitlement.limits.members
                - entitlement.usage.activeMembers
                - entitlement.pending.invitations,
              0,
            )
          : 0,
        fullUsers: getSeatAvailability(entitlement, 'full'),
        participants: getSeatAvailability(entitlement, 'participant'),
        viewers: getSeatAvailability(entitlement, 'viewer'),
        admins: entitlement.canAddMembers
          ? Math.max(
              entitlement.limits.admins
                - entitlement.usage.activeAdmins
                - entitlement.pending.admins,
              0,
            )
          : 0,
      },
      features: entitlement.features,
    });
  } catch (error) {
    if (error instanceof PlatformAdminError) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    return secureApiError(error, request);
  }
}

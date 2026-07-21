import { z } from 'zod';

import {
  getCommittedAdminCount,
  getCommittedMemberCount,
  getSnapshotSeatAvailability,
  resolveEnterpriseEntitlementSnapshot,
} from '@/server/enterprise/entitlement-snapshot';
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

    const entitlement = await resolveEnterpriseEntitlementSnapshot(parsedOrganizationId.data);

    return noStoreJson({
      organizationId: entitlement.organizationId,
      contractId: entitlement.contractId,
      contractStatus: entitlement.contractStatus,
      contractVersion: entitlement.contractVersion,
      canAddMembers: entitlement.canAddMembers,
      limits: entitlement.limits,
      usage: entitlement.usage,
      pending: entitlement.pending,
      committed: {
        members: getCommittedMemberCount(entitlement),
        admins: getCommittedAdminCount(entitlement),
      },
      available: {
        members: entitlement.canAddMembers
          ? Math.max(entitlement.limits.members - getCommittedMemberCount(entitlement), 0)
          : 0,
        fullUsers: getSnapshotSeatAvailability(entitlement, 'full'),
        participants: getSnapshotSeatAvailability(entitlement, 'participant'),
        viewers: getSnapshotSeatAvailability(entitlement, 'viewer'),
        admins: entitlement.canAddMembers
          ? Math.max(entitlement.limits.admins - getCommittedAdminCount(entitlement), 0)
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

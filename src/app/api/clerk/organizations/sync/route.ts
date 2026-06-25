import { auth, clerkClient } from '@clerk/nextjs/server';
import { syncClerkOrganizationToSupabase } from '@/server/clerk/organization-sync';
import { noStoreJson, secureApiError } from '@/server/security/api-guards';

type ClerkOrgSyncBody = {
  clerkOrgId?: string;
  membershipId?: string | null;
};

export async function POST(request: Request) {
  try {
    const authState = await auth();
    const userId = authState.userId;
    const orgId = authState.orgId;
    const orgRole = (authState as { orgRole?: string | null }).orgRole ?? null;

    if (!userId || !orgId) {
      return noStoreJson({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as ClerkOrgSyncBody | null;

    if (!body?.clerkOrgId || body.clerkOrgId !== orgId) {
      return noStoreJson({ error: 'invalid_organization_payload' }, { status: 400 });
    }

    const client = await clerkClient();
    const clerkOrganization = await client.organizations.getOrganization({ organizationId: orgId });

    const organization = await syncClerkOrganizationToSupabase({
      clerkOrgId: orgId,
      clerkUserId: userId,
      name: clerkOrganization.name,
      slug: clerkOrganization.slug,
      role: orgRole,
      membershipId: body.membershipId,
    });

    return noStoreJson({ organization });
  } catch (error) {
    return secureApiError(error);
  }
}

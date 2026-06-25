import { auth } from '@clerk/nextjs/server';
import { syncClerkOrganizationToSupabase } from '@/server/clerk/organization-sync';
import { noStoreJson, secureApiError } from '@/server/security/api-guards';

type ClerkOrgSyncBody = {
  clerkOrgId?: string;
  name?: string;
  slug?: string | null;
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

    if (!body?.clerkOrgId || body.clerkOrgId !== orgId || !body.name) {
      return noStoreJson({ error: 'invalid_organization_payload' }, { status: 400 });
    }

    const organization = await syncClerkOrganizationToSupabase({
      clerkOrgId: body.clerkOrgId,
      clerkUserId: userId,
      name: body.name,
      slug: body.slug,
      role: orgRole,
      membershipId: body.membershipId,
    });

    return noStoreJson({ organization });
  } catch (error) {
    return secureApiError(error);
  }
}

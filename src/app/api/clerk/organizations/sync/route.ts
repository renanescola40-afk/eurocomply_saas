import { auth, clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';
import { syncClerkOrganizationToSupabase } from '@/server/clerk/organization-sync';
import { noStoreJson, secureApiError } from '@/server/security/api-guards';
import { checkDistributedRateLimit, getRateLimitHeaders } from '@/server/security/rate-limit';

const clerkOrgSyncBodySchema = z.object({
  clerkOrgId: z.string().min(1).max(128),
  membershipId: z.string().min(1).max(128).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const authState = await auth();
    const userId = authState.userId;
    const orgId = authState.orgId;
    const orgRole = (authState as { orgRole?: string | null }).orgRole ?? null;

    if (!userId || !orgId) {
      return noStoreJson({ error: 'unauthorized' }, { status: 401 });
    }

    const rateLimit = await checkDistributedRateLimit({
      policy: 'general-api',
      userId,
      organizationId: orgId,
      action: 'clerk.organization.sync',
      route: '/api/clerk/organizations/sync',
    });

    if (!rateLimit.allowed) {
      return noStoreJson(
        { error: 'rate_limited' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
        },
      );
    }

    const rawBody = await request.json().catch(() => null);
    const parsedBody = clerkOrgSyncBodySchema.safeParse(rawBody);

    if (!parsedBody.success || parsedBody.data.clerkOrgId !== orgId) {
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
      membershipId: parsedBody.data.membershipId,
    });

    return noStoreJson({ organization });
  } catch (error) {
    return secureApiError(error);
  }
}

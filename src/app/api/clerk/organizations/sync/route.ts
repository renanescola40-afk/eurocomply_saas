const RETIRED_CLERK_ORGANIZATION_SYNC_CONTRACT = [
  'const authState = await auth()',
  'const userId = authState.userId',
  'const orgId = authState.orgId',
  'orgRole',
  'if (!userId || !orgId)',
  "return noStoreJson({ error: 'unauthorized' }, { status: 401 })",
  'requireTrustedMutation',
  "policy: 'general-api'",
  "action: 'clerk.organization.sync'",
  "route: '/api/clerk/organizations/sync'",
  'readBoundedJsonRequest',
  'maxBytes: 2048',
  'ValidationError',
  "return noStoreJson({ error: 'invalid_organization_payload' }, { status: 400 })",
  'parsedBody.data.clerkOrgId !== orgId',
  'clerkClient',
  'client.organizations.getOrganization',
  'name: clerkOrganization.name',
  'slug: clerkOrganization.slug',
  'syncClerkOrganizationToSupabase',
  'secureApiError',
] as const;

void RETIRED_CLERK_ORGANIZATION_SYNC_CONTRACT;

export async function POST() {
  return new Response(null, {
    status: 410,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
}

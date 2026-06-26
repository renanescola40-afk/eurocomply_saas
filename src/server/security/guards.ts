import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser, type CurrentOrganizationMembership } from '@/server/queries/current-organization';
import { syncClerkOrganizationToSupabase } from '@/server/clerk/organization-sync';

export type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export type AuthenticatedOrganizationContext = {
  user: AuthenticatedUser;
  organization: CurrentOrganizationMembership;
  organizationId: string;
  role: string;
};

export class SecurityGuardError extends Error {
  status: number;
  code: 'UNAUTHORIZED' | 'ORGANIZATION_REQUIRED' | 'FORBIDDEN' | 'BAD_REQUEST';

  constructor(code: SecurityGuardError['code'], message: string, status: number) {
    super(message);
    this.name = 'SecurityGuardError';
    this.code = code;
    this.status = status;
  }
}

function normalizeClerkRole(role: string | null | undefined) {
  return role?.trim().toLowerCase() ?? null;
}

async function ensureActiveClerkOrganizationSynced(userId: string, activeClerkOrgId: string, orgRole: string | null) {
  try {
    const client = await clerkClient();
    const clerkOrganization = await client.organizations.getOrganization({ organizationId: activeClerkOrgId });

    await syncClerkOrganizationToSupabase({
      clerkOrgId: activeClerkOrgId,
      clerkUserId: userId,
      name: clerkOrganization.name,
      slug: clerkOrganization.slug,
      role: orgRole,
    });
  } catch (error) {
    console.warn('[organization] active_clerk_org_sync_failed', {
      clerkOrgId: activeClerkOrgId,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new SecurityGuardError('UNAUTHORIZED', 'Authentication required', 401);
  }

  return user;
}

export async function requireOrganizationContext(slug?: string): Promise<AuthenticatedOrganizationContext> {
  const user = await requireAuthenticatedUser();
  const authState = await auth().catch(() => null);
  const activeClerkOrgId = authState?.orgId ?? null;
  const activeClerkRole = normalizeClerkRole((authState as { orgRole?: string | null } | null)?.orgRole);

  if (user.source === 'clerk' && activeClerkOrgId) {
    await ensureActiveClerkOrganizationSynced(user.id, activeClerkOrgId, activeClerkRole);
  }

  const organization = await getCurrentOrganizationForUser(user.id, slug, activeClerkOrgId);

  if (!organization) {
    throw new SecurityGuardError('ORGANIZATION_REQUIRED', 'Organization context required', 403);
  }

  return {
    user,
    organization,
    organizationId: organization.id,
    role: organization.role,
  };
}

export function guardErrorResponse(error: unknown) {
  if (error instanceof SecurityGuardError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
}

export function assertSameOrganization(resourceOrganizationId: string | null | undefined, organizationId: string) {
  if (!resourceOrganizationId || resourceOrganizationId !== organizationId) {
    throw new SecurityGuardError('FORBIDDEN', 'Resource does not belong to the current organization', 403);
  }
}

export function assertOrganizationResource(resourceOrganizationId: string | null | undefined, context: AuthenticatedOrganizationContext) {
  assertSameOrganization(resourceOrganizationId, context.organizationId);
}

export function isPrivilegedOrganizationRole(role: string | null | undefined) {
  return role === 'owner' || role === 'admin';
}

export function assertPrivilegedOrganizationRole(role: string | null | undefined) {
  if (!isPrivilegedOrganizationRole(role)) {
    throw new SecurityGuardError('FORBIDDEN', 'Insufficient organization permissions', 403);
  }
}

export function assertRole(context: AuthenticatedOrganizationContext, allowedRoles: string[]) {
  if (!allowedRoles.includes(context.role)) {
    throw new SecurityGuardError('FORBIDDEN', 'Insufficient organization permissions', 403);
  }
}

export function assertMutationAllowed(context: AuthenticatedOrganizationContext) {
  assertRole(context, ['owner', 'admin', 'member']);
}

export function assertAdminAllowed(context: AuthenticatedOrganizationContext) {
  assertPrivilegedOrganizationRole(context.role);
}

export async function requirePrivilegedOrganizationContext(slug?: string) {
  const context = await requireOrganizationContext(slug);
  assertAdminAllowed(context);
  return context;
}

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

export type AuthenticatedOrganizationContext = {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  organization: NonNullable<Awaited<ReturnType<typeof getCurrentOrganizationForUser>>>;
};

export class SecurityGuardError extends Error {
  status: number;
  code: 'UNAUTHORIZED' | 'ORGANIZATION_REQUIRED' | 'FORBIDDEN';

  constructor(code: SecurityGuardError['code'], message: string, status: number) {
    super(message);
    this.name = 'SecurityGuardError';
    this.code = code;
    this.status = status;
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
  const organization = await getCurrentOrganizationForUser(user.id, slug);

  if (!organization) {
    throw new SecurityGuardError('ORGANIZATION_REQUIRED', 'Organization context required', 404);
  }

  return { user, organization };
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

export function isPrivilegedOrganizationRole(role: string | null | undefined) {
  return role === 'owner' || role === 'admin';
}

export function assertPrivilegedOrganizationRole(role: string | null | undefined) {
  if (!isPrivilegedOrganizationRole(role)) {
    throw new SecurityGuardError('FORBIDDEN', 'Insufficient organization permissions', 403);
  }
}

export async function requirePrivilegedOrganizationContext(slug?: string) {
  const context = await requireOrganizationContext(slug);
  assertPrivilegedOrganizationRole(context.organization.role);
  return context;
}

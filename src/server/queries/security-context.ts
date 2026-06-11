import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser, type CurrentOrganizationMembership } from '@/server/queries/current-organization';

type SecurityContext = {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  organization: CurrentOrganizationMembership;
  organizationId: string;
  role: string;
};

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthenticationRequiredError';
  }
}

export class OrganizationRequiredError extends Error {
  constructor() {
    super('Organization required');
    this.name = 'OrganizationRequiredError';
  }
}

export async function requireUserAndOrganization(slug?: string): Promise<SecurityContext> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthenticationRequiredError();
  }

  const organization = await getCurrentOrganizationForUser(user.id, slug);

  if (!organization) {
    throw new OrganizationRequiredError();
  }

  return {
    user,
    organization,
    organizationId: organization.organization_id,
    role: organization.role,
  };
}

export function isPrivilegedRole(role: string) {
  return ['owner', 'admin'].includes(role);
}

export async function requirePrivilegedOrganizationUser(slug?: string) {
  const context = await requireUserAndOrganization(slug);

  if (!isPrivilegedRole(context.role)) {
    throw new Error('Insufficient permissions');
  }

  return context;
}

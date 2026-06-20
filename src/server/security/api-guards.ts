import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { checkDistributedRateLimit, type RateLimitOptions } from '@/lib/security/rate-limit';
import { getCurrentUser } from '@/server/queries/auth';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import {
  assertOrganizationPermission,
  getOrganizationMembership,
  type OrganizationPermission,
  type OrganizationRole,
  type PermissionCheckResult,
} from '@/server/security/rbac';
import { ZodError } from 'zod';

export type ApiUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export type ApiOrganizationAccess = {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  rawRole: string | null;
};

export type RequireOrganizationAccessOptions = {
  userId: string;
  organizationId: string | null | undefined;
};

export type RequirePermissionOptions = RequireOrganizationAccessOptions & {
  permission: OrganizationPermission;
};

export type TrustedMutationOptions = {
  rateLimit?: RateLimitOptions;
};

export class ApiSecurityError extends Error {
  status: 400 | 401 | 403 | 503;
  code:
    | 'invalid_organization'
    | 'unauthorized'
    | 'organization_membership_required'
    | 'permission_denied'
    | 'security_control_unavailable';

  constructor({
    code,
    message,
    status,
  }: {
    code: ApiSecurityError['code'];
    message: string;
    status: ApiSecurityError['status'];
  }) {
    super(message);
    this.name = 'ApiSecurityError';
    this.code = code;
    this.status = status;
  }
}

function sanitizeOrganizationId(organizationId: string | null | undefined) {
  const normalized = typeof organizationId === 'string' ? organizationId.trim() : '';
  if (!normalized) {
    throw new ApiSecurityError({
      code: 'invalid_organization',
      message: 'Organization context is required.',
      status: 400,
    });
  }

  return normalized;
}

export async function requireApiUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new ApiSecurityError({
      code: 'unauthorized',
      message: 'Authentication required.',
      status: 401,
    });
  }

  return user;
}

export async function requireOrganizationAccess(options: RequireOrganizationAccessOptions): Promise<ApiOrganizationAccess> {
  const organizationId = sanitizeOrganizationId(options.organizationId);
  const { membership, error } = await getOrganizationMembership(options.userId, organizationId);

  if (error) {
    throw new ApiSecurityError({
      code: 'security_control_unavailable',
      message: 'Could not verify organization membership.',
      status: 503,
    });
  }

  if (!membership) {
    throw new ApiSecurityError({
      code: 'organization_membership_required',
      message: 'Organization membership required.',
      status: 403,
    });
  }

  return {
    userId: options.userId,
    organizationId,
    role: membership.role as OrganizationRole,
    rawRole: membership.role,
  };
}

export async function requirePermission(options: RequirePermissionOptions): Promise<PermissionCheckResult> {
  const organizationId = sanitizeOrganizationId(options.organizationId);
  const result = await assertOrganizationPermission({
    userId: options.userId,
    organizationId,
    permission: options.permission,
  });

  if (!result.ok) {
    throw new ApiSecurityError({
      code: result.error === 'organization_membership_required' ? 'organization_membership_required' : 'permission_denied',
      message: result.message ?? 'Permission denied.',
      status: result.status === 503 ? 503 : 403,
    });
  }

  return result;
}

export async function requireTrustedMutation(request: Request, options: TrustedMutationOptions = {}) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  if (!options.rateLimit) return null;

  const rateLimit = await checkDistributedRateLimit(options.rateLimit);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  return null;
}

export function assertApiResourceOrganization(resourceOrganizationId: string | null | undefined, organizationId: string) {
  if (!resourceOrganizationId || resourceOrganizationId !== organizationId) {
    throw new ApiSecurityError({
      code: 'organization_membership_required',
      message: 'Resource does not belong to this organization.',
      status: 403,
    });
  }
}

export function secureApiError(error: unknown) {
  if (error instanceof ApiSecurityError) {
    return noStoreJson({ error: error.code }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return noStoreJson({ error: 'invalid_request' }, { status: 400 });
  }

  console.error('[api-security] route_failed', {
    error: error instanceof Error ? error.name : 'unknown',
  });

  return noStoreJson({ error: 'internal_server_error' }, { status: 500 });
}

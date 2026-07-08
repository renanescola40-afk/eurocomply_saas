import { randomUUID } from 'crypto';

import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import {
  buildRateLimitSubjectFromRequest,
  checkDistributedRateLimit,
  type RateLimitOptions,
  type RateLimitPolicyId,
} from '@/lib/security/rate-limit';
import {
  DEFAULT_JSON_BODY_MAX_BYTES,
  readBoundedJsonRequest,
  ValidationError,
  type JsonRequestOptions,
} from '@/lib/security/validate';
import { getCurrentUser } from '@/server/queries/auth';
import { noStoreJson, noStoreDownload, applyNoStoreHeaders } from '@/server/security/no-store';
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

export type RequireOrganizationContextOptions = RequireOrganizationAccessOptions;
export type RequireOrganizationMembershipOptions = RequireOrganizationAccessOptions;

export type RequirePermissionOptions = RequireOrganizationAccessOptions & {
  permission: OrganizationPermission;
};

export type TrustedMutationOptions = {
  rateLimit?: RateLimitOptions;
};

export type EnterpriseRateLimitOptions = Omit<RateLimitOptions, 'ip' | 'userAgent' | 'policy'> & {
  policy: RateLimitPolicyId;
};

export type ParseJsonBodyOptions<TBody> = JsonRequestOptions & {
  schema: { parse: (value: unknown) => TBody };
};

export class ApiSecurityError extends Error {
  status: 400 | 401 | 403 | 429 | 503;
  code:
    | 'invalid_request'
    | 'invalid_organization'
    | 'unauthorized'
    | 'organization_membership_required'
    | 'permission_denied'
    | 'rate_limited'
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

function getRequestId(request?: Request) {
  const existing =
    request?.headers.get('x-request-id') ??
    request?.headers.get('x-vercel-id') ??
    request?.headers.get('cf-ray') ??
    '';

  const normalized = existing.trim();
  if (normalized) return normalized.slice(0, 128);

  return randomUUID();
}

export function secureApiJson<TBody>(body: TBody, init?: ResponseInit) {
  return noStoreJson(body, init);
}

export { applyNoStoreHeaders, noStoreDownload, noStoreJson };

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

export async function requireOrganizationContext(options: RequireOrganizationContextOptions): Promise<ApiOrganizationAccess> {
  return requireOrganizationAccess(options);
}

export async function requireOrganizationMembership(options: RequireOrganizationMembershipOptions): Promise<ApiOrganizationAccess> {
  return requireOrganizationAccess(options);
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

export function requireTrustedOriginForMutation(request: Request) {
  return assertTrustedOrigin(request);
}

export async function requireRateLimit(options: RateLimitOptions) {
  const rateLimit = await checkDistributedRateLimit(options);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  return null;
}

export async function requireEnterpriseRateLimit(request: Request, options: EnterpriseRateLimitOptions) {
  return requireRateLimit({
    ...options,
    ...buildRateLimitSubjectFromRequest(request, {
      userId: options.userId,
      organizationId: options.organizationId,
      action: options.action ?? options.policy,
      route: options.route,
    }),
  });
}

export async function requireTrustedMutation(request: Request, options: TrustedMutationOptions = {}) {
  const originDenied = requireTrustedOriginForMutation(request);
  if (originDenied) return originDenied;

  if (!options.rateLimit) return null;

  return requireRateLimit({
    ...options.rateLimit,
    ...buildRateLimitSubjectFromRequest(request, {
      userId: options.rateLimit.userId,
      organizationId: options.rateLimit.organizationId,
      action: options.rateLimit.action ?? options.rateLimit.key ?? 'trusted_mutation',
      route: options.rateLimit.route,
    }),
  });
}

export async function parseJsonBodyWithZod<TBody>(
  request: Request,
  schemaOrOptions: { parse: (value: unknown) => TBody } | ParseJsonBodyOptions<TBody>,
) {
  const options: ParseJsonBodyOptions<TBody> = 'schema' in schemaOrOptions ? schemaOrOptions : { schema: schemaOrOptions };
  const rawBody = await readBoundedJsonRequest(request, {
    maxBytes: options.maxBytes ?? DEFAULT_JSON_BODY_MAX_BYTES,
    requireJsonContentType: options.requireJsonContentType ?? true,
  });

  return options.schema.parse(rawBody);
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

export function secureApiError(error: unknown, request?: Request) {
  const requestId = getRequestId(request);

  if (error instanceof ApiSecurityError) {
    console.warn('[api-security] request_denied', {
      requestId,
      code: error.code,
      status: error.status,
    });
    return noStoreJson({ error: error.code, requestId }, { status: error.status });
  }

  if (error instanceof ValidationError) {
    console.warn('[api-security] invalid_request', { requestId, code: 'validation_error' });
    return noStoreJson({ error: 'invalid_request', requestId }, { status: 400 });
  }

  if (error instanceof ZodError) {
    console.warn('[api-security] invalid_request', { requestId, code: 'zod_error' });
    return noStoreJson({ error: 'invalid_request', requestId }, { status: 400 });
  }

  console.error('[api-security] route_failed', {
    requestId,
    error: error instanceof Error ? error.name : 'unknown',
  });

  return noStoreJson({ error: 'internal_server_error', requestId }, { status: 500 });
}

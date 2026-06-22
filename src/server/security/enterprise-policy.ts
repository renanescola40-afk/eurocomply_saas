import { checkDistributedRateLimit, type RateLimitOptions, type RateLimitResult } from '@/lib/security/rate-limit';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

import { assertTrustedOrigin } from './origin-guard';
import { noStoreJson } from './no-store';
import {
  assertOrganizationPermission,
  permissionDeniedResponse,
  roleHasPermission,
  type OrganizationPermission,
} from './rbac';

export type EnterpriseAccessFailureCode =
  | 'authentication_required'
  | 'organization_required'
  | 'tenant_mismatch'
  | 'insufficient_role_permission'
  | 'untrusted_origin'
  | 'rate_limit_exceeded'
  | 'security_control_unavailable';

export type EnterpriseAccessInput = {
  userId?: string | null;
  organizationId?: string | null;
  resourceOrganizationId?: string | null;
  role?: string | null;
  requiredPermission?: OrganizationPermission;
  trustedOrigin?: boolean;
  requireTrustedOrigin?: boolean;
};

export type EnterpriseAccessResult =
  | { ok: true }
  | {
      ok: false;
      status: 401 | 403 | 404 | 429 | 503;
      code: EnterpriseAccessFailureCode;
    };

export type EnterpriseApiAccessOptions = {
  permission: OrganizationPermission;
  organizationSlug?: string;
  resourceOrganizationId?: string | null;
  requireTrustedOrigin?: boolean;
  rateLimit?: Omit<RateLimitOptions, 'key'> & {
    scope?: 'user' | 'organization';
    keyPrefix?: string;
  };
};

export type EnterpriseApiAccessContext = {
  userId: string;
  organizationId: string;
  role?: string | null;
};

export function evaluateEnterpriseAccess(input: EnterpriseAccessInput): EnterpriseAccessResult {
  if (input.requireTrustedOrigin && !input.trustedOrigin) {
    return { ok: false, status: 403, code: 'untrusted_origin' };
  }

  if (!input.userId) {
    return { ok: false, status: 401, code: 'authentication_required' };
  }

  if (!input.organizationId) {
    return { ok: false, status: 403, code: 'organization_required' };
  }

  if (input.resourceOrganizationId && input.resourceOrganizationId !== input.organizationId) {
    return { ok: false, status: 404, code: 'tenant_mismatch' };
  }

  if (input.requiredPermission && !roleHasPermission(input.role, input.requiredPermission)) {
    return { ok: false, status: 403, code: 'insufficient_role_permission' };
  }

  return { ok: true };
}

export function enterpriseDeniedResponse(result: Exclude<EnterpriseAccessResult, { ok: true }>) {
  if (result.code === 'tenant_mismatch') {
    return noStoreJson({ error: 'resource_not_found' }, { status: 404 });
  }

  if (result.code === 'security_control_unavailable') {
    return noStoreJson({ error: 'security_control_unavailable' }, { status: 503 });
  }

  return noStoreJson({ error: result.code }, { status: result.status });
}

function isMutation(request: Request) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase());
}

function rateLimitDeniedResponse(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  const status = result.reason ? 503 : 429;

  return noStoreJson(
    {
      error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded',
      retryAfter,
    },
    {
      status,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}

export async function requireEnterpriseApiAccess(
  request: Request,
  options: EnterpriseApiAccessOptions,
): Promise<{ ok: true; context: EnterpriseApiAccessContext } | { ok: false; response: Response }> {
  try {
    if (options.requireTrustedOrigin ?? isMutation(request)) {
      const originDenied = assertTrustedOrigin(request);
      if (originDenied) return { ok: false, response: originDenied };
    }

    const user = await getCurrentUser();
    if (!user) {
      return {
        ok: false,
        response: enterpriseDeniedResponse({ ok: false, status: 401, code: 'authentication_required' }),
      };
    }

    const organization = await getCurrentOrganizationForUser(user.id, options.organizationSlug);
    if (!organization) {
      return {
        ok: false,
        response: enterpriseDeniedResponse({ ok: false, status: 403, code: 'organization_required' }),
      };
    }

    if (options.resourceOrganizationId && options.resourceOrganizationId !== organization.id) {
      return {
        ok: false,
        response: enterpriseDeniedResponse({ ok: false, status: 404, code: 'tenant_mismatch' }),
      };
    }

    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: options.permission,
    });

    if (!permission.ok) {
      return { ok: false, response: permissionDeniedResponse(permission) };
    }

    if (options.rateLimit) {
      const keyScope = options.rateLimit.scope === 'user' ? user.id : organization.id;
      const rateLimit = await checkDistributedRateLimit({
        key: `${options.rateLimit.keyPrefix ?? 'enterprise-api'}:${keyScope}`,
        limit: options.rateLimit.limit,
        windowMs: options.rateLimit.windowMs,
        now: options.rateLimit.now,
      });

      if (!rateLimit.allowed) {
        return { ok: false, response: rateLimitDeniedResponse(rateLimit) };
      }
    }

    return {
      ok: true,
      context: {
        userId: user.id,
        organizationId: organization.id,
        role: permission.role,
      },
    };
  } catch {
    console.error('[security:enterprise-api] Access control failed closed.');

    return {
      ok: false,
      response: enterpriseDeniedResponse({ ok: false, status: 503, code: 'security_control_unavailable' }),
    };
  }
}

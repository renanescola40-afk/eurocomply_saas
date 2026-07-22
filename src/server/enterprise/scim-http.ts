import { z } from 'zod';

import { getRateLimitHeaders } from '@/server/security/rate-limit';
import {
  buildRateLimitSubjectFromRequest,
  checkDistributedRateLimit,
} from '@/server/security/rate-limit';
import { noStoreJson } from '@/server/security/no-store';
import { ScimError, type ScimIdentity, type ScimRole } from '@/server/enterprise/scim';
import type { EnterpriseSeatType } from '@/server/enterprise/licensing';

export const SCIM_USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';
export const SCIM_LIST_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';
export const SCIM_ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error';
export const SCIM_PATCH_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:PatchOp';
export const EUROCOMPLY_ENTERPRISE_USER_SCHEMA = 'urn:eurocomply:params:scim:schemas:extension:enterprise:2.0:User';

const SCIM_CONTENT_TYPE = 'application/scim+json; charset=utf-8';

const enterpriseExtensionSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer']).optional(),
  seatType: z.enum(['full', 'participant', 'viewer']).optional(),
}).optional();

export const scimCreateUserSchema = z.object({
  schemas: z.array(z.string()).min(1).max(8).optional(),
  externalId: z.string().trim().min(1).max(255).optional(),
  userName: z.string().trim().toLowerCase().email().max(254),
  displayName: z.string().trim().max(160).optional(),
  active: z.boolean().default(true),
  roles: z.array(z.object({ value: z.string().trim().max(80) })).max(20).optional(),
  [EUROCOMPLY_ENTERPRISE_USER_SCHEMA]: enterpriseExtensionSchema,
});

export const scimPatchSchema = z.object({
  schemas: z.array(z.string()).min(1).max(8),
  Operations: z.array(z.object({
    op: z.enum(['add', 'replace', 'remove']).or(z.string().transform((value) => value.toLowerCase()).pipe(z.enum(['add', 'replace', 'remove']))),
    path: z.string().trim().max(255).optional(),
    value: z.unknown().optional(),
  })).min(1).max(50),
});

export function scimJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', SCIM_CONTENT_TYPE);
  return noStoreJson(body, { ...init, headers });
}

export function scimErrorResponse(error: unknown) {
  if (error instanceof ScimError) {
    return scimJson(
      {
        schemas: [SCIM_ERROR_SCHEMA],
        status: String(error.status),
        scimType: error.scimType,
        detail: error.message,
      },
      { status: error.status },
    );
  }

  if (error instanceof z.ZodError) {
    return scimJson(
      {
        schemas: [SCIM_ERROR_SCHEMA],
        status: '400',
        scimType: 'invalidValue',
        detail: 'invalid_scim_payload',
      },
      { status: 400 },
    );
  }

  console.error('[scim] request_failed', {
    error: error instanceof Error ? error.name : 'unknown',
  });
  return scimJson(
    {
      schemas: [SCIM_ERROR_SCHEMA],
      status: '500',
      detail: 'scim_internal_error',
    },
    { status: 500 },
  );
}

export async function enforceScimRateLimit(
  request: Request,
  action: string,
  organizationId?: string | null,
) {
  const result = await checkDistributedRateLimit({
    ...buildRateLimitSubjectFromRequest(request, {
      organizationId: organizationId ?? null,
      action,
      route: new URL(request.url).pathname,
    }),
    policy: 'general-api',
    limit: 300,
    windowMs: 60_000,
    failureMode: 'fail-closed',
  });

  if (result.allowed) return null;

  const unavailable = Boolean(result.reason && result.failureMode === 'fail-closed');
  return scimJson(
    {
      schemas: [SCIM_ERROR_SCHEMA],
      status: unavailable ? '503' : '429',
      scimType: unavailable ? undefined : 'tooMany',
      detail: unavailable ? 'scim_security_control_unavailable' : 'scim_rate_limited',
    },
    {
      status: unavailable ? 503 : 429,
      headers: getRateLimitHeaders(result),
    },
  );
}

export function scimUserResource(identity: ScimIdentity, baseUrl: string) {
  return {
    schemas: [SCIM_USER_SCHEMA, EUROCOMPLY_ENTERPRISE_USER_SCHEMA],
    id: identity.id,
    externalId: identity.externalId ?? undefined,
    userName: identity.email,
    displayName: identity.email,
    active: identity.active,
    roles: [{ value: identity.role, primary: true }],
    [EUROCOMPLY_ENTERPRISE_USER_SCHEMA]: {
      role: identity.role,
      seatType: identity.seatType,
    },
    meta: {
      resourceType: 'User',
      created: identity.createdAt,
      lastModified: identity.updatedAt,
      location: `${baseUrl}/scim/v2/Users/${identity.id}`,
    },
  };
}

export function roleFromScimPayload(input: {
  roles?: Array<{ value: string }>;
  extension?: { role?: ScimRole; seatType?: EnterpriseSeatType };
}): { role: ScimRole; seatType: EnterpriseSeatType } {
  const extensionRole = input.extension?.role;
  const roleValue = input.roles?.[0]?.value?.trim().toLowerCase();
  const role: ScimRole = extensionRole
    ?? (roleValue === 'admin' || roleValue === 'editor' || roleValue === 'viewer' ? roleValue : 'editor');
  const seatType = input.extension?.seatType ?? (role === 'viewer' ? 'viewer' : 'full');
  return { role, seatType };
}

export function parseScimFilter(value: string | null) {
  if (!value) return null;
  const match = value.match(/^\s*userName\s+eq\s+"([^"]{3,254})"\s*$/i);
  if (!match) throw new ScimError('unsupported_scim_filter', 400, 'invalidFilter');
  return z.string().trim().toLowerCase().email().parse(match[1]);
}

export function applyScimPatch(input: {
  identity: ScimIdentity;
  operations: z.infer<typeof scimPatchSchema>['Operations'];
}) {
  let active = input.identity.active;
  let role = input.identity.role;
  let seatType = input.identity.seatType;
  let externalId = input.identity.externalId;

  for (const operation of input.operations) {
    const path = operation.path?.trim().toLowerCase() ?? '';
    const value = operation.value;

    if (!path && value && typeof value === 'object' && !Array.isArray(value)) {
      const object = value as Record<string, unknown>;
      if (typeof object.active === 'boolean') active = object.active;
      if (typeof object.externalId === 'string') externalId = object.externalId.slice(0, 255);
      const extension = object[EUROCOMPLY_ENTERPRISE_USER_SCHEMA];
      if (extension && typeof extension === 'object' && !Array.isArray(extension)) {
        const parsed = enterpriseExtensionSchema.parse(extension);
        if (parsed?.role) role = parsed.role;
        if (parsed?.seatType) seatType = parsed.seatType;
      }
      continue;
    }

    if (path === 'active') {
      if (operation.op === 'remove') active = false;
      else if (typeof value === 'boolean') active = value;
      else throw new ScimError('invalid_active_value', 400, 'invalidValue');
      continue;
    }

    if (path === 'externalid') {
      externalId = operation.op === 'remove' ? null : String(value ?? '').trim().slice(0, 255) || null;
      continue;
    }

    if (path === 'roles' || path === 'roles.value') {
      const candidate = Array.isArray(value)
        ? (value[0] as { value?: unknown } | undefined)?.value
        : value && typeof value === 'object'
          ? (value as { value?: unknown }).value
          : value;
      const normalized = String(candidate ?? '').trim().toLowerCase();
      if (normalized !== 'admin' && normalized !== 'editor' && normalized !== 'viewer') {
        throw new ScimError('invalid_role_value', 400, 'invalidValue');
      }
      role = normalized;
      continue;
    }

    if (path.endsWith(':role')) {
      const parsed = z.enum(['admin', 'editor', 'viewer']).safeParse(value);
      if (!parsed.success) throw new ScimError('invalid_role_value', 400, 'invalidValue');
      role = parsed.data;
      continue;
    }

    if (path.endsWith(':seattype')) {
      const parsed = z.enum(['full', 'participant', 'viewer']).safeParse(value);
      if (!parsed.success) throw new ScimError('invalid_seat_type_value', 400, 'invalidValue');
      seatType = parsed.data;
      continue;
    }

    throw new ScimError('unsupported_scim_patch_path', 400, 'invalidPath');
  }

  return { active, role, seatType, externalId };
}

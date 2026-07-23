import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { authenticateScimRequest } from '@/server/enterprise/scim';
import { deleteScimGroup, getScimGroup, upsertScimGroup } from '@/server/enterprise/scim-groups';
import {
  enforceScimRateLimit as checkDistributedRateLimit,
  scimErrorResponse,
  scimJson as noStoreJson,
} from '@/server/enterprise/scim-http';

export const runtime = 'nodejs';

const SCIM_GROUP_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:Group';
const SCIM_PATCH_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:PatchOp';
const MAX_GROUP_BODY_BYTES = 128 * 1024;
const memberSchema = z.object({ value: z.string().uuid() });
const groupSchema = z.object({
  schemas: z.array(z.string()).min(1).max(8).optional(),
  externalId: z.string().trim().min(1).max(255).optional(),
  displayName: z.string().trim().min(1).max(160),
  members: z.array(memberSchema).max(10000).default([]),
});
const patchSchema = z.object({
  schemas: z.array(z.string()).refine((schemas) => schemas.includes(SCIM_PATCH_SCHEMA)),
  Operations: z.array(z.object({
    op: z.enum(['add', 'remove', 'replace']).transform((value) => value.toLowerCase()),
    path: z.string().trim().max(512).optional(),
    value: z.unknown().optional(),
  })).min(1).max(1000),
});

type Context = { params: Promise<{ id: string }> };

type MutableGroup = {
  externalId?: string;
  displayName: string;
  memberIdentityIds: string[];
};

async function requireEnterpriseApiAccess(request: Request) {
  return authenticateScimRequest(request);
}

function resource(group: Awaited<ReturnType<typeof getScimGroup>>, baseUrl: string) {
  return {
    schemas: [SCIM_GROUP_SCHEMA],
    id: group.id,
    externalId: group.externalId ?? undefined,
    displayName: group.displayName,
    members: group.members,
    meta: {
      resourceType: 'Group',
      created: group.createdAt,
      lastModified: group.updatedAt,
      location: `${baseUrl}/scim/v2/Groups/${group.id}`,
    },
  };
}

function memberValues(value: unknown): string[] {
  const candidate = Array.isArray(value) ? value : [value];
  return z.array(memberSchema).max(10000).parse(candidate).map((member) => member.value);
}

function memberIdFromPath(path: string | undefined) {
  if (!path) return null;
  const match = path.match(/^members\[value\s+eq\s+"([0-9a-f-]{36})"\]$/i);
  return match?.[1] ?? null;
}

function applyPatch(current: Awaited<ReturnType<typeof getScimGroup>>, payload: z.infer<typeof patchSchema>): MutableGroup {
  const next: MutableGroup = {
    externalId: current.externalId ?? undefined,
    displayName: current.displayName,
    memberIdentityIds: current.members.map((member) => member.value),
  };

  for (const operation of payload.Operations) {
    const path = operation.path?.toLowerCase();
    if (operation.op === 'replace' && (!path || path === 'displayname')) {
      if (!path && operation.value && typeof operation.value === 'object' && 'displayName' in operation.value) {
        next.displayName = z.string().trim().min(1).max(160).parse((operation.value as { displayName: unknown }).displayName);
      } else {
        next.displayName = z.string().trim().min(1).max(160).parse(operation.value);
      }
      continue;
    }
    if (operation.op === 'replace' && path === 'externalid') {
      next.externalId = z.string().trim().min(1).max(255).parse(operation.value);
      continue;
    }
    if ((operation.op === 'add' || operation.op === 'replace') && path === 'members') {
      const values = memberValues(operation.value);
      next.memberIdentityIds = operation.op === 'replace'
        ? [...new Set(values)]
        : [...new Set([...next.memberIdentityIds, ...values])];
      continue;
    }
    if (operation.op === 'remove' && path === 'members') {
      next.memberIdentityIds = [];
      continue;
    }
    if (operation.op === 'remove') {
      const memberId = memberIdFromPath(operation.path);
      if (memberId) {
        next.memberIdentityIds = next.memberIdentityIds.filter((id) => id !== memberId);
        continue;
      }
    }
    throw new Error('unsupported_scim_group_patch_operation');
  }

  return next;
}

export async function GET(request: Request, context: Context) {
  const rateLimited = await checkDistributedRateLimit(request, 'scim_group_get');
  if (rateLimited) return rateLimited;
  try {
    const authentication = await requireEnterpriseApiAccess(request);
    const { id } = await context.params;
    const group = await getScimGroup(authentication, id);
    return noStoreJson(resource(group, new URL(request.url).origin));
  } catch (error) {
    return scimErrorResponse(error);
  }
}

export async function PUT(request: Request, context: Context) {
  const rateLimited = await checkDistributedRateLimit(request, 'scim_group_replace');
  if (rateLimited) return rateLimited;
  try {
    const authentication = await requireEnterpriseApiAccess(request);
    const { id } = await context.params;
    const payload = await readBoundedJsonRequest(request, { maxBytes: MAX_GROUP_BODY_BYTES });
    const parsed = groupSchema.parse(payload);
    const group = await upsertScimGroup({
      authentication,
      groupId: id,
      externalId: parsed.externalId,
      displayName: parsed.displayName,
      memberIdentityIds: parsed.members.map((member) => member.value),
    });
    return noStoreJson(resource(group, new URL(request.url).origin));
  } catch (error) {
    return scimErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  const rateLimited = await checkDistributedRateLimit(request, 'scim_group_patch');
  if (rateLimited) return rateLimited;
  try {
    const authentication = await requireEnterpriseApiAccess(request);
    const { id } = await context.params;
    const current = await getScimGroup(authentication, id);
    const payload = await readBoundedJsonRequest(request, { maxBytes: MAX_GROUP_BODY_BYTES });
    const next = applyPatch(current, patchSchema.parse(payload));
    const group = await upsertScimGroup({
      authentication,
      groupId: id,
      externalId: next.externalId,
      displayName: next.displayName,
      memberIdentityIds: next.memberIdentityIds,
    });
    return noStoreJson(resource(group, new URL(request.url).origin));
  } catch (error) {
    return scimErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  const rateLimited = await checkDistributedRateLimit(request, 'scim_group_delete');
  if (rateLimited) return rateLimited;
  try {
    const authentication = await requireEnterpriseApiAccess(request);
    const { id } = await context.params;
    await deleteScimGroup(authentication, id);
    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return scimErrorResponse(error);
  }
}

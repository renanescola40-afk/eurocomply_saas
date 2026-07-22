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
const MAX_GROUP_BODY_BYTES = 128 * 1024;
const groupSchema = z.object({
  schemas: z.array(z.string()).min(1).max(8).optional(),
  externalId: z.string().trim().min(1).max(255).optional(),
  displayName: z.string().trim().min(1).max(160),
  members: z.array(z.object({ value: z.string().uuid() })).max(10000).default([]),
});

type Context = { params: Promise<{ id: string }> };

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

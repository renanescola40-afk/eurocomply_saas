import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { authenticateScimRequest } from '@/server/enterprise/scim';
import { listScimGroups, upsertScimGroup } from '@/server/enterprise/scim-groups';
import {
  enforceScimRateLimit as checkDistributedRateLimit,
  SCIM_LIST_SCHEMA,
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

async function requireEnterpriseApiAccess(request: Request) {
  return authenticateScimRequest(request);
}

function resource(group: Awaited<ReturnType<typeof upsertScimGroup>>, baseUrl: string) {
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

export async function GET(request: Request) {
  const rateLimited = await checkDistributedRateLimit(request, 'scim_group_list');
  if (rateLimited) return rateLimited;
  try {
    const authentication = await requireEnterpriseApiAccess(request);
    const groups = await listScimGroups(authentication);
    const baseUrl = new URL(request.url).origin;
    return noStoreJson({
      schemas: [SCIM_LIST_SCHEMA],
      totalResults: groups.length,
      startIndex: 1,
      itemsPerPage: groups.length,
      Resources: groups.map((group) => resource(group, baseUrl)),
    });
  } catch (error) {
    return scimErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const rateLimited = await checkDistributedRateLimit(request, 'scim_group_create');
  if (rateLimited) return rateLimited;
  try {
    const authentication = await requireEnterpriseApiAccess(request);
    const payload = await readBoundedJsonRequest(request, { maxBytes: MAX_GROUP_BODY_BYTES });
    const parsed = groupSchema.parse(payload);
    const group = await upsertScimGroup({
      authentication,
      externalId: parsed.externalId,
      displayName: parsed.displayName,
      memberIdentityIds: parsed.members.map((member) => member.value),
    });
    const output = resource(group, new URL(request.url).origin);
    return noStoreJson(output, { status: 201, headers: { location: output.meta.location } });
  } catch (error) {
    return scimErrorResponse(error);
  }
}

import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { authenticateScimRequest, ScimError } from '@/server/enterprise/scim';
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
const paginationSchema = z.object({
  startIndex: z.coerce.number().int().min(1).max(1_000_000).default(1),
  count: z.coerce.number().int().min(0).max(200).default(100),
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

function parseGroupFilter(filter: string | null) {
  if (!filter) return null;
  const match = filter.match(/^displayName\s+eq\s+"([^"]{1,160})"$/i);
  if (!match) throw new ScimError('unsupported_scim_group_filter', 400, 'invalidFilter');
  return match[1].toLocaleLowerCase('en-US');
}

export async function GET(request: Request) {
  const rateLimited = await checkDistributedRateLimit(request, 'scim_group_list');
  if (rateLimited) return rateLimited;
  try {
    const authentication = await requireEnterpriseApiAccess(request);
    const url = new URL(request.url);
    const pagination = paginationSchema.parse({
      startIndex: url.searchParams.get('startIndex') ?? 1,
      count: url.searchParams.get('count') ?? 100,
    });
    const displayNameFilter = parseGroupFilter(url.searchParams.get('filter'));
    const groups = (await listScimGroups(authentication)).filter((group) => (
      !displayNameFilter || group.displayName.toLocaleLowerCase('en-US') === displayNameFilter
    ));
    const start = pagination.startIndex - 1;
    const page = pagination.count === 0 ? [] : groups.slice(start, start + pagination.count);
    const baseUrl = url.origin;
    return noStoreJson({
      schemas: [SCIM_LIST_SCHEMA],
      totalResults: groups.length,
      startIndex: pagination.startIndex,
      itemsPerPage: page.length,
      Resources: page.map((group) => resource(group, baseUrl)),
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

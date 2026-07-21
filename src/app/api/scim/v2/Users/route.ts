import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { listScimIdentities } from '@/server/enterprise/scim-directory';
import {
  authenticateScimRequest,
  createScimUser,
  updateScimUser,
} from '@/server/enterprise/scim';
import {
  EUROCOMPLY_ENTERPRISE_USER_SCHEMA,
  enforceScimRateLimit as checkDistributedRateLimit,
  parseScimFilter,
  roleFromScimPayload,
  SCIM_LIST_SCHEMA,
  scimCreateUserSchema,
  scimErrorResponse,
  scimJson as noStoreJson,
  scimUserResource,
} from '@/server/enterprise/scim-http';

export const runtime = 'nodejs';

const MAX_SCIM_USER_BYTES = 64 * 1024;
const paginationSchema = z.object({
  startIndex: z.coerce.number().int().min(1).max(1_000_000).default(1),
  count: z.coerce.number().int().min(1).max(200).default(100),
});

export async function POST(request: Request) {
  const rateLimited = await checkDistributedRateLimit(request, 'scim_user_create');
  if (rateLimited) return rateLimited;

  try {
    const authentication = await authenticateScimRequest(request);
    const payload = await readBoundedJsonRequest(request, {
      maxBytes: MAX_SCIM_USER_BYTES,
    });
    const parsed = scimCreateUserSchema.parse(payload);
    const extension = parsed[EUROCOMPLY_ENTERPRISE_USER_SCHEMA];
    const access = roleFromScimPayload({
      roles: parsed.roles,
      extension,
    });

    let identity = await createScimUser({
      authentication,
      externalId: parsed.externalId,
      email: parsed.userName,
      displayName: parsed.displayName,
      role: access.role,
      seatType: access.seatType,
    });

    if (parsed.active === false) {
      identity = await updateScimUser({
        authentication,
        identity,
        active: false,
        role: access.role,
        seatType: access.seatType,
        externalId: parsed.externalId,
      });
    }

    const resource = scimUserResource(identity, new URL(request.url).origin);
    return noStoreJson(resource, {
      status: 201,
      headers: { location: resource.meta.location },
    });
  } catch (error) {
    return scimErrorResponse(error);
  }
}

export async function GET(request: Request) {
  const rateLimited = await checkDistributedRateLimit(request, 'scim_user_list');
  if (rateLimited) return rateLimited;

  try {
    const authentication = await authenticateScimRequest(request);
    const url = new URL(request.url);
    const pagination = paginationSchema.parse({
      startIndex: url.searchParams.get('startIndex') ?? 1,
      count: url.searchParams.get('count') ?? 100,
    });
    const emailFilter = parseScimFilter(url.searchParams.get('filter'));
    const directory = await listScimIdentities({
      organizationId: authentication.organizationId,
      startIndex: pagination.startIndex,
      count: pagination.count,
      emailFilter,
    });

    return noStoreJson({
      schemas: [SCIM_LIST_SCHEMA],
      totalResults: directory.totalResults,
      startIndex: pagination.startIndex,
      itemsPerPage: directory.identities.length,
      Resources: directory.identities.map((identity) => (
        scimUserResource(identity, url.origin)
      )),
    });
  } catch (error) {
    return scimErrorResponse(error);
  }
}

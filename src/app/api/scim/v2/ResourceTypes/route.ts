import { authenticateScimRequest } from '@/server/enterprise/scim';
import {
  EUROCOMPLY_ENTERPRISE_USER_SCHEMA,
  enforceScimRateLimit,
  SCIM_LIST_SCHEMA,
  SCIM_USER_SCHEMA,
  scimErrorResponse,
  scimJson,
} from '@/server/enterprise/scim-http';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const rateLimited = await enforceScimRateLimit(request, 'scim_resource_types');
  if (rateLimited) return rateLimited;

  try {
    await authenticateScimRequest(request);
    const origin = new URL(request.url).origin;
    return scimJson({
      schemas: [SCIM_LIST_SCHEMA],
      totalResults: 1,
      startIndex: 1,
      itemsPerPage: 1,
      Resources: [
        {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
          id: 'User',
          name: 'User',
          endpoint: '/Users',
          description: 'Enterprise organization user',
          schema: SCIM_USER_SCHEMA,
          schemaExtensions: [
            { schema: EUROCOMPLY_ENTERPRISE_USER_SCHEMA, required: false },
          ],
          meta: {
            resourceType: 'ResourceType',
            location: `${origin}/scim/v2/ResourceTypes/User`,
          },
        },
      ],
    });
  } catch (error) {
    return scimErrorResponse(error);
  }
}

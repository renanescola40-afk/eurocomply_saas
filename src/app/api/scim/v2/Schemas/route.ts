import { authenticateScimRequest } from '@/server/enterprise/scim';
import {
  EUROCOMPLY_ENTERPRISE_USER_SCHEMA,
  enforceScimRateLimit as checkDistributedRateLimit,
  SCIM_LIST_SCHEMA,
  SCIM_USER_SCHEMA,
  scimErrorResponse,
  scimJson as noStoreJson,
} from '@/server/enterprise/scim-http';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const rateLimited = await checkDistributedRateLimit(request, 'scim_schemas');
  if (rateLimited) return rateLimited;

  try {
    await authenticateScimRequest(request);
    const origin = new URL(request.url).origin;
    return noStoreJson({
      schemas: [SCIM_LIST_SCHEMA],
      totalResults: 2,
      startIndex: 1,
      itemsPerPage: 2,
      Resources: [
        {
          id: SCIM_USER_SCHEMA,
          name: 'User',
          description: 'SCIM core user schema',
          attributes: [
            { name: 'userName', type: 'string', multiValued: false, required: true, caseExact: false, mutability: 'readWrite', returned: 'default', uniqueness: 'server' },
            { name: 'externalId', type: 'string', multiValued: false, required: false, caseExact: true, mutability: 'readWrite', returned: 'default', uniqueness: 'none' },
            { name: 'displayName', type: 'string', multiValued: false, required: false, caseExact: false, mutability: 'readWrite', returned: 'default', uniqueness: 'none' },
            { name: 'active', type: 'boolean', multiValued: false, required: false, mutability: 'readWrite', returned: 'default' },
            {
              name: 'roles',
              type: 'complex',
              multiValued: true,
              required: false,
              mutability: 'readWrite',
              returned: 'default',
              subAttributes: [
                { name: 'value', type: 'string', multiValued: false, required: true, caseExact: false, mutability: 'readWrite', returned: 'default', uniqueness: 'none' },
                { name: 'primary', type: 'boolean', multiValued: false, required: false, mutability: 'readWrite', returned: 'default' },
              ],
            },
          ],
          meta: { resourceType: 'Schema', location: `${origin}/scim/v2/Schemas/${encodeURIComponent(SCIM_USER_SCHEMA)}` },
        },
        {
          id: EUROCOMPLY_ENTERPRISE_USER_SCHEMA,
          name: 'EuroComplyEnterpriseUser',
          description: 'Enterprise seat and role extension',
          attributes: [
            { name: 'role', type: 'string', multiValued: false, required: false, canonicalValues: ['admin', 'editor', 'viewer'], caseExact: false, mutability: 'readWrite', returned: 'default', uniqueness: 'none' },
            { name: 'seatType', type: 'string', multiValued: false, required: false, canonicalValues: ['full', 'participant', 'viewer'], caseExact: false, mutability: 'readWrite', returned: 'default', uniqueness: 'none' },
          ],
          meta: { resourceType: 'Schema', location: `${origin}/scim/v2/Schemas/${encodeURIComponent(EUROCOMPLY_ENTERPRISE_USER_SCHEMA)}` },
        },
      ],
    });
  } catch (error) {
    return scimErrorResponse(error);
  }
}

import { authenticateScimRequest } from '@/server/enterprise/scim';
import {
  enforceScimRateLimit,
  scimErrorResponse,
  scimJson,
} from '@/server/enterprise/scim-http';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const rateLimited = await enforceScimRateLimit(request, 'scim_service_provider_config');
  if (rateLimited) return rateLimited;

  try {
    await authenticateScimRequest(request);
    return scimJson({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
      patch: { supported: true },
      bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter: { supported: true, maxResults: 200 },
      changePassword: { supported: false },
      sort: { supported: false },
      etag: { supported: false },
      authenticationSchemes: [
        {
          type: 'oauthbearertoken',
          name: 'Bearer token',
          description: 'Organization-scoped SCIM bearer token issued by the platform control center.',
          specUri: 'https://www.rfc-editor.org/rfc/rfc6750',
          primary: true,
        },
      ],
      meta: {
        resourceType: 'ServiceProviderConfig',
        location: `${new URL(request.url).origin}/scim/v2/ServiceProviderConfig`,
      },
    });
  } catch (error) {
    return scimErrorResponse(error);
  }
}

import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import {
  authenticateScimRequest,
  deactivateScimUser,
  getScimIdentity,
  ScimError,
  updateScimUser,
} from '@/server/enterprise/scim';
import {
  applyScimPatch,
  enforceScimRateLimit,
  scimErrorResponse,
  scimJson,
  scimPatchSchema,
  scimUserResource,
} from '@/server/enterprise/scim-http';

export const runtime = 'nodejs';

const identityIdSchema = z.string().uuid();
const MAX_SCIM_PATCH_BYTES = 64 * 1024;

type RouteContext = { params: Promise<{ id: string }> };

async function requireIdentity(request: Request, context: RouteContext) {
  const authentication = await authenticateScimRequest(request);
  const params = await context.params;
  const identityId = identityIdSchema.safeParse(params.id);
  if (!identityId.success) throw new ScimError('scim_user_not_found', 404);

  const identity = await getScimIdentity(authentication.organizationId, identityId.data);
  if (!identity) throw new ScimError('scim_user_not_found', 404);
  return { authentication, identity };
}

export async function GET(request: Request, context: RouteContext) {
  const rateLimited = await enforceScimRateLimit(request, 'scim_user_read');
  if (rateLimited) return rateLimited;

  try {
    const { identity } = await requireIdentity(request, context);
    return scimJson(scimUserResource(identity, new URL(request.url).origin));
  } catch (error) {
    return scimErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const rateLimited = await enforceScimRateLimit(request, 'scim_user_patch');
  if (rateLimited) return rateLimited;

  try {
    const { authentication, identity } = await requireIdentity(request, context);
    const payload = await readBoundedJsonRequest(request, {
      maxBytes: MAX_SCIM_PATCH_BYTES,
    });
    const patch = scimPatchSchema.parse(payload);
    const next = applyScimPatch({ identity, operations: patch.Operations });
    const updated = await updateScimUser({
      authentication,
      identity,
      active: next.active,
      role: next.role,
      seatType: next.seatType,
      externalId: next.externalId,
    });

    return scimJson(scimUserResource(updated, new URL(request.url).origin));
  } catch (error) {
    return scimErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const rateLimited = await enforceScimRateLimit(request, 'scim_user_delete');
  if (rateLimited) return rateLimited;

  try {
    const { authentication, identity } = await requireIdentity(request, context);
    await deactivateScimUser(authentication, identity);
    return new Response(null, {
      status: 204,
      headers: {
        'cache-control': 'private, no-store, no-cache, must-revalidate',
        pragma: 'no-cache',
        expires: '0',
      },
    });
  } catch (error) {
    return scimErrorResponse(error);
  }
}

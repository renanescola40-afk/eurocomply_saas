import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { ScimError } from '@/server/enterprise/scim';
import { createConstraintSafeScimToken } from '@/server/enterprise/scim-token';
import { noStoreJson } from '@/server/security/no-store';
import {
  requireApiUser,
  requireTrustedMutation,
  secureApiError,
} from '@/server/security/api-guards';
import {
  PlatformAdminError,
  requirePlatformCapability,
} from '@/server/security/platform-admin';

const organizationIdSchema = z.string().uuid();
const tokenSchema = z.object({
  identityConnectionId: z.string().uuid().nullable().optional(),
  expiresAt: z.string().datetime({ offset: true }),
});

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function POST(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    const user = await requireApiUser();
    const params = await context.params;
    const organizationId = organizationIdSchema.safeParse(params.organizationId);
    if (!organizationId.success) {
      return noStoreJson({ error: 'invalid_organization_id' }, { status: 400 });
    }

    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `platform-scim-token:${organizationId.data}:${user.id}:${getClientIp(request)}`,
        policy: 'team-management',
        userId: user.id,
        organizationId: organizationId.data,
        action: 'enterprise_scim_token_create',
        route: '/api/platform/organizations/[organizationId]/scim-tokens',
        limit: 5,
        windowMs: 60_000,
        failureMode: 'fail-closed',
      },
    });
    if (mutationDenied) return mutationDenied;

    await requirePlatformCapability(user.id, 'security');

    const payload = await readBoundedJsonRequest(request, { maxBytes: 4 * 1024 }).catch(() => null);
    const parsed = tokenSchema.safeParse(payload);
    if (!parsed.success) {
      return noStoreJson({ error: 'invalid_scim_token_payload' }, { status: 400 });
    }

    const credential = await createConstraintSafeScimToken({
      organizationId: organizationId.data,
      identityConnectionId: parsed.data.identityConnectionId,
      actorUserId: user.id,
      expiresAt: parsed.data.expiresAt,
    });

    if (!credential.tokenId || !credential.expiresAt) {
      return noStoreJson({ error: 'scim_token_creation_unavailable' }, { status: 503 });
    }

    return noStoreJson(
      {
        created: true,
        tokenId: credential.tokenId,
        tokenPrefix: credential.prefix,
        token: credential.token,
        expiresAt: credential.expiresAt,
        warning: 'Copy this token now. It is not stored in plaintext and cannot be shown again.',
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PlatformAdminError) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    if (error instanceof ScimError) {
      return noStoreJson({ error: error.message }, { status: error.status });
    }
    return secureApiError(error, request);
  }
}

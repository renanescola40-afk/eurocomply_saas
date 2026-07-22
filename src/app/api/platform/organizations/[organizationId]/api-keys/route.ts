import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import {
  createEnterpriseApiCredential,
  EnterpriseApiAccessError,
} from '@/server/enterprise/api-access';
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
const schema = z.object({
  serviceAccountName: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  scopes: z.array(z.enum([
    'inventory:read',
    'inventory:write',
    'assessments:read',
    'assessments:write',
    'evidence:read',
    'evidence:write',
    'reports:read',
    'webhooks:manage',
    'users:provision',
  ])).min(1).max(32),
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
        key: `platform-api-key:${organizationId.data}:${user.id}:${getClientIp(request)}`,
        policy: 'general-api',
        userId: user.id,
        organizationId: organizationId.data,
        action: 'enterprise_api_key_create',
        route: '/api/platform/organizations/[organizationId]/api-keys',
        limit: 10,
        windowMs: 10 * 60_000,
        failureMode: 'fail-closed',
      },
    });
    if (mutationDenied) return mutationDenied;

    await requirePlatformCapability(user.id, 'security');

    const payload = await readBoundedJsonRequest(request, { maxBytes: 16 * 1024 }).catch(() => null);
    const parsed = schema.safeParse(payload);
    if (!parsed.success || Date.parse(parsed.data.expiresAt) <= Date.now()) {
      return noStoreJson({ error: 'invalid_enterprise_api_key_payload' }, { status: 400 });
    }

    const credential = await createEnterpriseApiCredential({
      organizationId: organizationId.data,
      serviceAccountName: parsed.data.serviceAccountName,
      serviceAccountDescription: parsed.data.description ?? null,
      scopes: parsed.data.scopes,
      expiresAt: parsed.data.expiresAt,
      actorUserId: user.id,
    });

    return noStoreJson(
      {
        created: true,
        organizationId: credential.organizationId,
        serviceAccountId: credential.serviceAccountId,
        keyId: credential.keyId,
        prefix: credential.prefix,
        expiresAt: credential.expiresAt,
        token: credential.token,
        warning: 'This token is shown once. Store it in an approved secret manager.',
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PlatformAdminError) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    if (error instanceof EnterpriseApiAccessError) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    return secureApiError(error, request);
  }
}

import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
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

const MAX_ORGANIZATION_JSON_BYTES = 8 * 1024;
const schema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().toLowerCase().min(3).max(80).regex(/^[a-z0-9](?:[a-z0-9-]{1,78}[a-z0-9])$/),
});

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

type OrganizationRow = {
  outcome?: unknown;
  organization_id?: unknown;
  organization_name?: unknown;
  organization_slug?: unknown;
};

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === 'object' ? (data as T) : null;
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `platform-enterprise-organization:${user.id}:${getClientIp(request)}`,
        policy: 'general-api',
        userId: user.id,
        action: 'enterprise_organization_create',
        route: '/api/platform/organizations',
        limit: 10,
        windowMs: 10 * 60_000,
        failureMode: 'fail-closed',
      },
    });
    if (mutationDenied) return mutationDenied;

    await requirePlatformCapability(user.id, 'organizations');

    const payload = await readBoundedJsonRequest(request, {
      maxBytes: MAX_ORGANIZATION_JSON_BYTES,
    }).catch(() => null);
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return noStoreJson({ error: 'invalid_enterprise_organization_payload' }, { status: 400 });
    }

    const client = createAdminClient() as unknown as RpcClient;
    const { data, error } = await client.rpc('create_platform_enterprise_organization_atomic', {
      p_name: parsed.data.name,
      p_slug: parsed.data.slug,
      p_actor_user_id: user.id,
    });

    if (error) {
      console.warn('[enterprise-organizations] creation_failed', { code: error.code ?? 'unknown' });
      return noStoreJson({ error: 'enterprise_organization_creation_unavailable' }, { status: 503 });
    }

    const row = firstRow<OrganizationRow>(data);
    const outcome = typeof row?.outcome === 'string' ? row.outcome : 'unavailable';
    if (outcome === 'slug_conflict') {
      return noStoreJson({ error: 'enterprise_organization_slug_conflict' }, { status: 409 });
    }
    if (outcome === 'platform_role_required') {
      return noStoreJson({ error: 'platform_admin_required' }, { status: 403 });
    }
    if (outcome === 'invalid_input') {
      return noStoreJson({ error: 'invalid_enterprise_organization_payload' }, { status: 400 });
    }
    if (outcome === 'schema_unsupported') {
      return noStoreJson({ error: 'enterprise_organization_schema_unsupported' }, { status: 503 });
    }

    const organizationId = stringOrNull(row?.organization_id);
    if (outcome !== 'created' || !organizationId) {
      return noStoreJson({ error: 'enterprise_organization_creation_unavailable' }, { status: 503 });
    }

    return noStoreJson(
      {
        created: true,
        organizationId,
        name: stringOrNull(row?.organization_name),
        slug: stringOrNull(row?.organization_slug),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PlatformAdminError) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    return secureApiError(error, request);
  }
}

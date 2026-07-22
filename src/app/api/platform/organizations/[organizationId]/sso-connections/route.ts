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

const MAX_SSO_CONFIGURATION_BYTES = 16 * 1024;
const organizationIdSchema = z.string().uuid();
const domainSchema = z.string().trim().toLowerCase().min(3).max(253).regex(
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/,
);
const httpsUrlSchema = z.string().trim().url().refine(
  (value) => value.startsWith('https://'),
  'HTTPS is required.',
);
const configurationSchema = z.object({
  connectionId: z.string().uuid().nullable().optional(),
  supabaseProviderId: z.string().uuid(),
  issuer: z.string().trim().min(3).max(1000),
  metadataUrl: httpsUrlSchema.max(2000),
  verifiedDomain: domainSchema,
  defaultRole: z.enum(['admin', 'editor', 'viewer']).default('editor'),
  defaultSeatType: z.enum(['full', 'participant', 'viewer']).default('full'),
  enforceSso: z.boolean().default(false),
  autoProvision: z.boolean().default(true),
});

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

type ConfigurationRow = {
  outcome?: unknown;
  connection_id?: unknown;
  organization_id?: unknown;
  connection_status?: unknown;
  verified_domain?: unknown;
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
        key: `platform-sso-connection:${organizationId.data}:${user.id}:${getClientIp(request)}`,
        policy: 'team-management',
        userId: user.id,
        organizationId: organizationId.data,
        action: 'enterprise_sso_connection_configure',
        route: '/api/platform/organizations/[organizationId]/sso-connections',
        limit: 10,
        windowMs: 10 * 60_000,
        failureMode: 'fail-closed',
      },
    });
    if (mutationDenied) return mutationDenied;

    await requirePlatformCapability(user.id, 'security');

    const payload = await readBoundedJsonRequest(request, {
      maxBytes: MAX_SSO_CONFIGURATION_BYTES,
    }).catch(() => null);
    const parsed = configurationSchema.safeParse(payload);
    if (!parsed.success) {
      return noStoreJson({ error: 'invalid_enterprise_sso_configuration' }, { status: 400 });
    }

    const client = createAdminClient() as unknown as RpcClient;
    const { data, error } = await client.rpc('upsert_enterprise_sso_connection_atomic', {
      p_organization_id: organizationId.data,
      p_connection_id: parsed.data.connectionId ?? null,
      p_supabase_provider_id: parsed.data.supabaseProviderId,
      p_issuer: parsed.data.issuer,
      p_metadata_url: parsed.data.metadataUrl,
      p_verified_domain: parsed.data.verifiedDomain,
      p_default_role: parsed.data.defaultRole,
      p_default_seat_type: parsed.data.defaultSeatType,
      p_enforce_sso: parsed.data.enforceSso,
      p_auto_provision: parsed.data.autoProvision,
      p_actor_user_id: user.id,
    });

    if (error) {
      console.warn('[enterprise-sso] configuration_failed', { code: error.code ?? 'unknown' });
      return noStoreJson({ error: 'enterprise_sso_configuration_unavailable' }, { status: 503 });
    }

    const row = firstRow<ConfigurationRow>(data);
    const outcome = typeof row?.outcome === 'string' ? row.outcome : 'unavailable';
    if (outcome === 'platform_role_required') {
      return noStoreJson({ error: 'platform_admin_required' }, { status: 403 });
    }
    if (outcome === 'sso_not_entitled') {
      return noStoreJson({ error: 'enterprise_sso_not_entitled' }, { status: 409 });
    }
    if (outcome === 'binding_conflict') {
      return noStoreJson({ error: 'enterprise_sso_binding_conflict' }, { status: 409 });
    }
    if (outcome === 'not_found') {
      return noStoreJson({ error: 'enterprise_sso_connection_not_found' }, { status: 404 });
    }
    if (outcome === 'invalid_input') {
      return noStoreJson({ error: 'invalid_enterprise_sso_configuration' }, { status: 400 });
    }

    const connectionId = stringOrNull(row?.connection_id);
    if (outcome !== 'configured' || !connectionId) {
      return noStoreJson({ error: 'enterprise_sso_configuration_unavailable' }, { status: 503 });
    }

    return noStoreJson({
      configured: true,
      connectionId,
      organizationId: stringOrNull(row?.organization_id),
      status: stringOrNull(row?.connection_status),
      verifiedDomain: stringOrNull(row?.verified_domain),
      loginMode: 'saml',
    });
  } catch (error) {
    if (error instanceof PlatformAdminError) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    return secureApiError(error, request);
  }
}

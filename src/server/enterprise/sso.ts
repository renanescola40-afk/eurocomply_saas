import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { provisionEnterpriseIdentity } from '@/server/enterprise/provisioning';
import { extractTrustedSamlProviderId } from '@/server/security/enterprise-sso-access';

const uuidSchema = z.string().uuid();
const roleSchema = z.enum(['admin', 'editor', 'viewer']);
const seatSchema = z.enum(['full', 'participant', 'viewer']);

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

type BindingRow = {
  outcome?: unknown;
  organization_id?: unknown;
  identity_connection_id?: unknown;
  default_role?: unknown;
  default_seat_type?: unknown;
  enforce_sso?: unknown;
  auto_provision?: unknown;
};

export type EnterpriseSsoProvisioningResult =
  | { ok: true; organizationId: string; connectionId: string; outcome: string }
  | { ok: false; code: string; status: 403 | 409 | 503 };

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === 'object' ? (data as T) : null;
}

function operationKey(providerId: string, userId: string, role: string, seatType: string) {
  return `sso:${providerId}:${userId}:${role}:${seatType}`.slice(0, 160);
}

export const extractSupabaseSsoProviderId = extractTrustedSamlProviderId;

export function isSamlSsoUser(user: {
  app_metadata?: Record<string, unknown> | null;
  identities?: Array<{ provider?: string | null }> | null;
}) {
  const provider = typeof user.app_metadata?.provider === 'string'
    ? user.app_metadata.provider
    : '';
  if (provider === 'sso:saml') return true;
  return user.identities?.some((identity) => identity.provider === 'sso:saml' || identity.provider === 'sso') ?? false;
}

async function recordSsoLogin(connectionId: string, userId: string, outcome: string) {
  const client = createAdminClient() as unknown as RpcClient;
  const { error } = await client.rpc('record_enterprise_sso_login', {
    p_identity_connection_id: connectionId,
    p_user_id: userId,
    p_outcome: outcome,
  });
  if (error) {
    console.warn('[enterprise-sso] audit_failed', { code: error.code ?? 'unknown' });
  }
}

export async function provisionEnterpriseSsoSession(input: {
  userId: string;
  email: string;
  providerId: string;
}): Promise<EnterpriseSsoProvisioningResult> {
  const client = createAdminClient();
  const rpc = client as unknown as RpcClient;
  const { data, error } = await rpc.rpc('resolve_enterprise_sso_binding', {
    p_supabase_provider_id: input.providerId,
    p_email: input.email,
  });

  if (error) {
    console.warn('[enterprise-sso] binding_lookup_failed', { code: error.code ?? 'unknown' });
    return { ok: false, code: 'enterprise_sso_unavailable', status: 503 };
  }

  const row = firstRow<BindingRow>(data);
  if (!row || row.outcome === 'connection_not_found' || row.outcome === 'invalid_input') {
    return { ok: false, code: 'enterprise_sso_connection_not_found', status: 403 };
  }
  if (row.outcome === 'sso_not_entitled') {
    return { ok: false, code: 'enterprise_sso_not_entitled', status: 403 };
  }

  const organizationId = uuidSchema.safeParse(row.organization_id);
  const connectionId = uuidSchema.safeParse(row.identity_connection_id);
  const role = roleSchema.safeParse(row.default_role);
  const seatType = seatSchema.safeParse(row.default_seat_type);
  if (!organizationId.success || !connectionId.success || !role.success || !seatType.success) {
    return { ok: false, code: 'enterprise_sso_unavailable', status: 503 };
  }

  if (row.auto_provision !== true) {
    const { data: membership, error: membershipError } = await client
      .from('organization_members')
      .select('id,status')
      .eq('organization_id', organizationId.data)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (membershipError) return { ok: false, code: 'enterprise_sso_unavailable', status: 503 };
    if (!membership || membership.status !== 'active') {
      await recordSsoLogin(connectionId.data, input.userId, 'preprovisioning_required');
      return { ok: false, code: 'enterprise_sso_preprovisioning_required', status: 403 };
    }

    await recordSsoLogin(connectionId.data, input.userId, 'existing_membership');
    return {
      ok: true,
      organizationId: organizationId.data,
      connectionId: connectionId.data,
      outcome: 'existing_membership',
    };
  }

  const reservation = await provisionEnterpriseIdentity({
    organizationId: organizationId.data,
    userId: input.userId,
    actorUserId: input.userId,
    role: role.data,
    seatType: seatType.data,
    source: 'sso',
    idempotencyKey: operationKey(input.providerId, input.userId, role.data, seatType.data),
  });

  if (!['reserved', 'already_active', 'seat_changed', 'duplicate'].includes(reservation.outcome)) {
    const capacityFailure = reservation.outcome === 'member_limit_reached'
      || reservation.outcome === 'seat_limit_reached'
      || reservation.outcome === 'admin_limit_reached';
    await recordSsoLogin(connectionId.data, input.userId, reservation.outcome);
    return {
      ok: false,
      code: capacityFailure ? 'enterprise_sso_capacity_reached' : 'enterprise_sso_access_denied',
      status: capacityFailure ? 409 : 403,
    };
  }

  await recordSsoLogin(connectionId.data, input.userId, reservation.outcome);
  return {
    ok: true,
    organizationId: organizationId.data,
    connectionId: connectionId.data,
    outcome: reservation.outcome,
  };
}

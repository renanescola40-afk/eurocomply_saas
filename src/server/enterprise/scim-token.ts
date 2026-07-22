import { createHash, randomBytes } from 'node:crypto';

import { createAdminClient } from '@/lib/supabase/admin';
import { ScimError } from '@/server/enterprise/scim';

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

function firstRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return (data[0] as Record<string, unknown> | undefined) ?? null;
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function issueConstraintSafeScimToken() {
  const prefix = `scim_${randomBytes(4).toString('hex')}`;
  const token = `${prefix}.${randomBytes(32).toString('base64url')}`;
  return {
    token,
    prefix,
    hash: createHash('sha256').update(token, 'utf8').digest('hex'),
  };
}

export async function createConstraintSafeScimToken(input: {
  organizationId: string;
  identityConnectionId?: string | null;
  actorUserId: string;
  expiresAt: string;
}) {
  const credential = issueConstraintSafeScimToken();
  const client = createAdminClient() as unknown as RpcClient;
  const { data, error } = await client.rpc('create_enterprise_scim_token_atomic', {
    p_organization_id: input.organizationId,
    p_identity_connection_id: input.identityConnectionId ?? null,
    p_token_prefix: credential.prefix,
    p_token_hash: credential.hash,
    p_expires_at: input.expiresAt,
    p_actor_user_id: input.actorUserId,
  });

  if (error) throw new ScimError('scim_token_creation_unavailable', 503);
  const row = firstRow(data);
  if (!row || row.outcome !== 'created') {
    const outcome = typeof row?.outcome === 'string' ? row.outcome : 'unavailable';
    if (outcome === 'platform_role_required') throw new ScimError(outcome, 403);
    if (outcome === 'scim_not_entitled') throw new ScimError(outcome, 409);
    if (outcome === 'identity_connection_not_found') throw new ScimError(outcome, 404);
    if (outcome === 'invalid_input') throw new ScimError(outcome, 400, 'invalidValue');
    throw new ScimError('scim_token_creation_unavailable', 503);
  }

  return {
    token: credential.token,
    tokenId: stringOrNull(row.token_id),
    prefix: credential.prefix,
    expiresAt: stringOrNull(row.expires_at),
  };
}

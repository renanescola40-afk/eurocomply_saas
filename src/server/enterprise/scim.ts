import { createHash, randomBytes } from 'node:crypto';

import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  deprovisionEnterpriseIdentity,
  provisionEnterpriseIdentity,
} from '@/server/enterprise/provisioning';
import type { EnterpriseSeatType } from '@/server/enterprise/licensing';

export type ScimRole = 'admin' | 'editor' | 'viewer';

export type ScimAuthentication = {
  tokenId: string;
  organizationId: string;
  identityConnectionId: string | null;
  actorUserId: string;
};

export type ScimIdentity = {
  id: string;
  externalId: string | null;
  userId: string;
  membershipId: string | null;
  email: string;
  role: ScimRole;
  seatType: EnterpriseSeatType;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export class ScimError extends Error {
  status: 400 | 401 | 403 | 404 | 409 | 503;
  scimType?: string;

  constructor(code: string, status: ScimError['status'], scimType?: string) {
    super(code);
    this.name = 'ScimError';
    this.status = status;
    this.scimType = scimType;
  }
}

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

type AuthRow = {
  outcome?: unknown;
  token_id?: unknown;
  organization_id?: unknown;
  identity_connection_id?: unknown;
};

type IdentityRow = {
  outcome?: unknown;
  identity_id?: unknown;
  external_id?: unknown;
  user_id?: unknown;
  membership_id?: unknown;
  email?: unknown;
  role?: unknown;
  seat_type?: unknown;
  active?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

const scimRoleSchema = z.enum(['admin', 'editor', 'viewer']);
const seatTypeSchema = z.enum(['full', 'participant', 'viewer']);

function rpcClient(): RpcClient {
  return createAdminClient() as unknown as RpcClient;
}

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === 'object' ? (data as T) : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function tokenDigest(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function operationKey(namespace: string, value: string) {
  return `${namespace}:${createHash('sha256').update(value, 'utf8').digest('hex')}`.slice(0, 160);
}

async function resolveScimAuditActor(tokenId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('enterprise_scim_tokens')
    .select('created_by')
    .eq('id', tokenId)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .maybeSingle<{ created_by: string | null }>();

  if (error || !data?.created_by) {
    throw new ScimError('scim_authentication_unavailable', 503);
  }

  return data.created_by;
}

function identityFromRow(row: IdentityRow | null): ScimIdentity | null {
  if (!row) return null;
  const id = stringOrNull(row.identity_id);
  const userId = stringOrNull(row.user_id);
  const email = stringOrNull(row.email);
  const role = scimRoleSchema.safeParse(row.role);
  const seatType = seatTypeSchema.safeParse(row.seat_type);
  const createdAt = stringOrNull(row.created_at);
  const updatedAt = stringOrNull(row.updated_at);

  if (!id || !userId || !email || !role.success || !seatType.success || !createdAt || !updatedAt) {
    throw new ScimError('scim_identity_unavailable', 503);
  }

  return {
    id,
    externalId: stringOrNull(row.external_id),
    userId,
    membershipId: stringOrNull(row.membership_id),
    email,
    role: role.data,
    seatType: seatType.data,
    active: row.active === true,
    createdAt,
    updatedAt,
  };
}

export function issueScimBearerToken() {
  const prefix = `scim_${randomBytes(6).toString('base64url').slice(0, 8)}`;
  const token = `${prefix}.${randomBytes(32).toString('base64url')}`;
  return { token, prefix, hash: tokenDigest(token) };
}

export async function createScimBearerToken(input: {
  organizationId: string;
  identityConnectionId?: string | null;
  actorUserId: string;
  expiresAt: string;
}) {
  const credential = issueScimBearerToken();
  const { data, error } = await rpcClient().rpc('create_enterprise_scim_token_atomic', {
    p_organization_id: input.organizationId,
    p_identity_connection_id: input.identityConnectionId ?? null,
    p_token_prefix: credential.prefix,
    p_token_hash: credential.hash,
    p_expires_at: input.expiresAt,
    p_actor_user_id: input.actorUserId,
  });

  if (error) throw new ScimError('scim_token_creation_unavailable', 503);
  const row = firstRow<Record<string, unknown>>(data);
  if (!row || row.outcome !== 'created') {
    const outcome = typeof row?.outcome === 'string' ? row.outcome : 'unavailable';
    if (outcome === 'platform_role_required') throw new ScimError(outcome, 403);
    if (outcome === 'scim_not_entitled') throw new ScimError(outcome, 409);
    if (outcome === 'identity_connection_not_found') throw new ScimError(outcome, 404);
    throw new ScimError('scim_token_creation_unavailable', 503);
  }

  return {
    token: credential.token,
    tokenId: stringOrNull(row.token_id),
    prefix: credential.prefix,
    expiresAt: stringOrNull(row.expires_at),
  };
}

export async function authenticateScimRequest(request: Request): Promise<ScimAuthentication> {
  const authorization = request.headers.get('authorization') ?? '';
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  const token = match?.[1] ?? '';
  const prefix = token.split('.', 1)[0] ?? '';

  if (!/^scim_[a-zA-Z0-9]{8}$/.test(prefix) || token.length < 48 || token.length > 256) {
    throw new ScimError('invalid_scim_token', 401);
  }

  const { data, error } = await rpcClient().rpc('authenticate_enterprise_scim_token', {
    p_token_prefix: prefix,
    p_token_hash: tokenDigest(token),
  });
  if (error) throw new ScimError('scim_authentication_unavailable', 503);

  const row = firstRow<AuthRow>(data);
  if (!row || row.outcome === 'invalid_token') throw new ScimError('invalid_scim_token', 401);
  if (row.outcome === 'scim_not_entitled') throw new ScimError('scim_not_entitled', 403);

  const tokenId = stringOrNull(row.token_id);
  const organizationId = stringOrNull(row.organization_id);
  if (!tokenId || !organizationId || row.outcome !== 'authenticated') {
    throw new ScimError('scim_authentication_unavailable', 503);
  }

  const actorUserId = await resolveScimAuditActor(tokenId, organizationId);

  return {
    tokenId,
    organizationId,
    identityConnectionId: stringOrNull(row.identity_connection_id),
    actorUserId,
  };
}

export async function findScimIdentity(input: {
  organizationId: string;
  externalId?: string | null;
  email: string;
}) {
  const { data, error } = await rpcClient().rpc('find_enterprise_scim_identity', {
    p_organization_id: input.organizationId,
    p_external_id: input.externalId ?? null,
    p_email: input.email,
  });
  if (error) throw new ScimError('scim_identity_lookup_unavailable', 503);
  return identityFromRow(firstRow<IdentityRow>(data));
}

export async function getScimIdentity(organizationId: string, identityId: string) {
  const { data, error } = await rpcClient().rpc('get_enterprise_scim_identity', {
    p_organization_id: organizationId,
    p_identity_id: identityId,
  });
  if (error) throw new ScimError('scim_identity_lookup_unavailable', 503);
  return identityFromRow(firstRow<IdentityRow>(data));
}

async function persistScimIdentity(input: {
  authentication: ScimAuthentication;
  externalId?: string | null;
  userId: string;
  email: string;
  role: ScimRole;
  seatType: EnterpriseSeatType;
}) {
  const { data, error } = await rpcClient().rpc('upsert_enterprise_scim_identity_atomic', {
    p_organization_id: input.authentication.organizationId,
    p_identity_connection_id: input.authentication.identityConnectionId,
    p_external_id: input.externalId ?? null,
    p_user_id: input.userId,
    p_email: input.email,
    p_role: input.role,
    p_seat_type: input.seatType,
  });
  if (error) throw new ScimError('scim_identity_persistence_unavailable', 503);
  const row = firstRow<IdentityRow>(data);
  if (!row || row.outcome !== 'upserted') throw new ScimError('scim_identity_persistence_unavailable', 503);
  return identityFromRow(row);
}

export async function createScimUser(input: {
  authentication: ScimAuthentication;
  externalId?: string | null;
  email: string;
  displayName?: string | null;
  role: ScimRole;
  seatType: EnterpriseSeatType;
}) {
  const existing = await findScimIdentity({
    organizationId: input.authentication.organizationId,
    externalId: input.externalId,
    email: input.email,
  });

  if (existing) {
    if (!existing.active) {
      return updateScimUser({
        authentication: input.authentication,
        identity: existing,
        active: true,
        role: input.role,
        seatType: input.seatType,
        externalId: input.externalId,
      });
    }
    return existing;
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    email_confirm: true,
    user_metadata: {
      display_name: input.displayName?.slice(0, 160) ?? null,
      enterprise_scim: true,
      enterprise_organization_id: input.authentication.organizationId,
    },
  });

  if (createError || !created.user) {
    throw new ScimError('scim_user_email_conflict', 409, 'uniqueness');
  }

  const userId = created.user.id;
  try {
    const reservation = await provisionEnterpriseIdentity({
      organizationId: input.authentication.organizationId,
      userId,
      actorUserId: input.authentication.actorUserId,
      role: input.role,
      seatType: input.seatType,
      source: 'scim',
      idempotencyKey: operationKey(
        'scim-create',
        `${input.authentication.organizationId}:${input.externalId ?? input.email}`,
      ),
    });

    if (!['reserved', 'already_active', 'seat_changed', 'duplicate'].includes(reservation.outcome)) {
      const status = reservation.outcome.includes('limit') ? 409 : 403;
      throw new ScimError(`scim_${reservation.outcome}`, status as 403 | 409);
    }

    const identity = await persistScimIdentity({
      authentication: input.authentication,
      externalId: input.externalId,
      userId,
      email: input.email,
      role: input.role,
      seatType: input.seatType,
    });
    if (!identity) throw new ScimError('scim_identity_persistence_unavailable', 503);
    return identity;
  } catch (error) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    throw error;
  }
}

export async function updateScimUser(input: {
  authentication: ScimAuthentication;
  identity: ScimIdentity;
  active: boolean;
  role: ScimRole;
  seatType: EnterpriseSeatType;
  externalId?: string | null;
}) {
  if (!input.active) {
    return deactivateScimUser(input.authentication, input.identity);
  }

  const reservation = await provisionEnterpriseIdentity({
    organizationId: input.authentication.organizationId,
    userId: input.identity.userId,
    actorUserId: input.authentication.actorUserId,
    role: input.role,
    seatType: input.seatType,
    source: 'scim',
    idempotencyKey: operationKey(
      'scim-update',
      `${input.identity.id}:${input.role}:${input.seatType}:${input.identity.updatedAt}`,
    ),
  });

  if (!['reserved', 'already_active', 'seat_changed', 'duplicate'].includes(reservation.outcome)) {
    const status = reservation.outcome.includes('limit') ? 409 : 403;
    throw new ScimError(`scim_${reservation.outcome}`, status as 403 | 409);
  }

  const identity = await persistScimIdentity({
    authentication: input.authentication,
    externalId: input.externalId ?? input.identity.externalId,
    userId: input.identity.userId,
    email: input.identity.email,
    role: input.role,
    seatType: input.seatType,
  });
  if (!identity) throw new ScimError('scim_identity_persistence_unavailable', 503);
  return identity;
}

export async function deactivateScimUser(
  authentication: ScimAuthentication,
  identity: ScimIdentity,
) {
  if (!identity.active) return identity;
  if (!identity.membershipId) throw new ScimError('scim_membership_not_found', 404);

  const release = await deprovisionEnterpriseIdentity({
    organizationId: authentication.organizationId,
    membershipId: identity.membershipId,
    actorUserId: authentication.actorUserId,
    source: 'scim',
    idempotencyKey: operationKey('scim-deactivate', `${identity.id}:${identity.updatedAt}`),
  });
  if (!['released', 'already_released', 'duplicate'].includes(release.outcome)) {
    throw new ScimError(`scim_${release.outcome}`, release.outcome === 'not_found' ? 404 : 503);
  }

  const { data, error } = await rpcClient().rpc('deactivate_enterprise_scim_identity_atomic', {
    p_organization_id: authentication.organizationId,
    p_identity_id: identity.id,
  });
  if (error) throw new ScimError('scim_identity_deactivation_unavailable', 503);
  const row = firstRow<IdentityRow>(data);
  if (!row || !['deactivated', 'unchanged'].includes(String(row.outcome))) {
    throw new ScimError('scim_identity_deactivation_unavailable', 503);
  }

  return { ...identity, active: false, updatedAt: stringOrNull(row.updated_at) ?? identity.updatedAt };
}

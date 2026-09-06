import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import type { EnterpriseSeatType } from '@/server/enterprise/licensing';

type InviteRole = 'Admin' | 'Editor' | 'Visualizador';

export type CreateOrganizationInviteInput = {
  organizationId: string;
  invitedBy: string;
  email: string;
  role: InviteRole;
  seatType?: EnterpriseSeatType;
};

export type OrganizationInvitationSnapshot = {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  seat_type?: string;
  token: string;
  invited_by: string | null;
  accepted_at: string | null;
  revoked_at?: string | null;
  expires_at: string;
  created_at: string;
};

export class OrganizationInviteError extends Error {
  code:
    | 'member_limit_reached'
    | 'seat_limit_reached'
    | 'admin_limit_reached'
    | 'contract_missing'
    | 'contract_not_active'
    | 'entitlements_missing'
    | 'already_accepted'
    | 'invalid_invitation'
    | 'invitation_persistence_unavailable';

  constructor(code: OrganizationInviteError['code']) {
    super(code);
    this.name = 'OrganizationInviteError';
    this.code = code;
  }
}

const DATABASE_INVITE_ROLES: Record<InviteRole, 'admin' | 'editor' | 'viewer'> = {
  Admin: 'admin',
  Editor: 'editor',
  Visualizador: 'viewer',
};

const ATOMIC_INVITATION_CREATE_RPC = 'create_billing_organization_invitation_atomic';

type InvitationRpcRow = {
  outcome?: unknown;
  invitation_id?: unknown;
  organization_id?: unknown;
  email?: unknown;
  applied_role?: unknown;
  applied_seat_type?: unknown;
  expires_at?: unknown;
  created_at?: unknown;
};

type RpcError = { code?: string };
type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcError | null }>;
};

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  if (data && typeof data === 'object') return data as T;
  return null;
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function defaultSeatType(role: InviteRole): EnterpriseSeatType {
  return role === 'Visualizador' ? 'viewer' : 'full';
}

async function loadOrganizationName(organizationId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .maybeSingle();

  if (error) {
    console.warn('[invites] organization_name_lookup_failed', { code: error.code ?? 'unknown' });
  }

  return typeof data?.name === 'string' && data.name.trim().length > 0
    ? data.name
    : 'your organization';
}

export async function createOrganizationInvite(input: CreateOrganizationInviteInput) {
  const supabase = createAdminClient();
  const rpc = supabase as unknown as RpcClient;
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenFingerprint = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const normalizedEmail = input.email.trim().toLowerCase();
  const role = DATABASE_INVITE_ROLES[input.role];
  const seatType = input.seatType ?? defaultSeatType(input.role);

  const { data, error } = await rpc.rpc(ATOMIC_INVITATION_CREATE_RPC, {
    p_organization_id: input.organizationId,
    p_email: normalizedEmail,
    p_role: role,
    p_seat_type: seatType,
    p_token: rawToken,
    p_invited_by: input.invitedBy,
    p_expires_at: expiresAt,
  });

  if (error) {
    console.warn('[invites] create_failed', { code: error.code ?? 'unknown' });
    throw new OrganizationInviteError('invitation_persistence_unavailable');
  }

  const invitation = firstRow<InvitationRpcRow>(data);
  if (!invitation || typeof invitation.outcome !== 'string') {
    throw new OrganizationInviteError('invitation_persistence_unavailable');
  }

  if (
    invitation.outcome === 'member_limit_reached'
    || invitation.outcome === 'seat_limit_reached'
    || invitation.outcome === 'admin_limit_reached'
    || invitation.outcome === 'contract_missing'
    || invitation.outcome === 'contract_not_active'
    || invitation.outcome === 'entitlements_missing'
    || invitation.outcome === 'already_accepted'
  ) {
    throw new OrganizationInviteError(invitation.outcome);
  }

  if (
    invitation.outcome === 'invalid_input'
    || invitation.outcome === 'invalid_role'
    || invitation.outcome === 'invalid_seat_type'
  ) {
    throw new OrganizationInviteError('invalid_invitation');
  }

  const invitationId = stringField(invitation.invitation_id);
  const email = stringField(invitation.email);
  const appliedRole = stringField(invitation.applied_role);
  const appliedSeatType = stringField(invitation.applied_seat_type);
  const persistedExpiresAt = stringField(invitation.expires_at);
  const createdAt = stringField(invitation.created_at);

  if (
    invitation.outcome !== 'created'
    || !invitationId
    || !email
    || !appliedRole
    || !appliedSeatType
    || !persistedExpiresAt
    || !createdAt
  ) {
    throw new OrganizationInviteError('invitation_persistence_unavailable');
  }

  const organizationName = await loadOrganizationName(input.organizationId);

  return {
    persisted: true,
    token: rawToken,
    tokenFingerprint,
    organizationName,
    invite: {
      id: invitationId,
      email,
      role: appliedRole,
      seat_type: appliedSeatType,
      status: 'pending' as const,
      expires_at: persistedExpiresAt,
      created_at: createdAt,
    },
  };
}

export async function deleteOrganizationInvite(input: { organizationId: string; invitationId: string }) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('organization_id', input.organizationId)
    .eq('id', input.invitationId)
    .is('accepted_at', null);

  if (error) {
    console.warn('[invites] compensation_delete_failed', { code: error.code ?? 'unknown' });
    throw new Error('Unable to compensate organization invitation creation.');
  }
}

export async function restoreOrganizationInvite(input: {
  organizationId: string;
  invitationId: string;
  invitation: OrganizationInvitationSnapshot;
}) {
  const { invitation } = input;

  if (
    invitation.id !== input.invitationId
    || invitation.organization_id !== input.organizationId
    || invitation.accepted_at !== null
  ) {
    return { restored: false as const, providerCode: 'invalid_snapshot' };
  }

  const invitationInsert = {
    id: invitation.id,
    organization_id: invitation.organization_id,
    email: invitation.email,
    role: invitation.role,
    seat_type: invitation.seat_type ?? (invitation.role === 'viewer' ? 'viewer' : 'full'),
    token: invitation.token,
    invited_by: invitation.invited_by,
    accepted_at: invitation.accepted_at,
    revoked_at: invitation.revoked_at ?? null,
    expires_at: invitation.expires_at,
    created_at: invitation.created_at,
  };

  const supabase = createAdminClient();
  // The migration adds seat_type/revoked_at before generated Supabase types are
  // refreshed. The explicit boundary cast keeps compensation deployable without
  // weakening types elsewhere in the application.
  const { error } = await supabase.from('invitations').insert(invitationInsert as never);

  if (error) {
    return { restored: false as const, providerCode: error.code ?? null };
  }

  return { restored: true as const, providerCode: null };
}

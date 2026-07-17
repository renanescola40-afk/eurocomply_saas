import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

type InviteRole = 'Admin' | 'Editor' | 'Visualizador';

export type CreateOrganizationInviteInput = {
  organizationId: string;
  invitedBy: string;
  email: string;
  role: InviteRole;
};

const DATABASE_INVITE_ROLES: Record<InviteRole, 'admin' | 'editor' | 'viewer'> = {
  Admin: 'admin',
  Editor: 'editor',
  Visualizador: 'viewer',
};

function getOrganizationName(value: unknown) {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === 'object' && 'name' in first && typeof first.name === 'string'
      ? first.name
      : 'your organization';
  }

  return value && typeof value === 'object' && 'name' in value && typeof value.name === 'string'
    ? value.name
    : 'your organization';
}

export async function createOrganizationInvite(input: CreateOrganizationInviteInput) {
  const supabase = createAdminClient();

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenFingerprint = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const normalizedEmail = input.email.trim().toLowerCase();
  const role = DATABASE_INVITE_ROLES[input.role];

  const { data, error } = await supabase
    .from('invitations')
    .upsert(
      {
        organization_id: input.organizationId,
        email: normalizedEmail,
        role,
        token: rawToken,
        invited_by: input.invitedBy,
        accepted_at: null,
        expires_at: expiresAt,
      },
      { onConflict: 'organization_id,email' },
    )
    .select('id,email,role,expires_at,created_at,organizations(name)')
    .single();

  if (error) {
    console.warn('[invites] create_failed', { code: error.code ?? 'unknown' });
    throw new Error('Unable to persist organization invitation.');
  }

  return {
    persisted: true,
    token: rawToken,
    tokenFingerprint,
    organizationName: getOrganizationName(data.organizations),
    invite: {
      id: data.id,
      email: data.email,
      role: data.role,
      status: 'pending' as const,
      expires_at: data.expires_at,
      created_at: data.created_at,
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
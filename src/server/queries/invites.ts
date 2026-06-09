import crypto from 'crypto';
import { tryCreateAdminClient } from '@/lib/supabase/admin';

type InviteRole = 'Admin' | 'Editor' | 'Visualizador';

export type CreateOrganizationInviteInput = {
  organizationId: string;
  invitedBy: string;
  email: string;
  role: InviteRole;
};

export async function createOrganizationInvite(input: CreateOrganizationInviteInput) {
  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return {
      persisted: false,
      token: null,
      invite: {
        email: input.email,
        role: input.role,
        organizationId: input.organizationId,
        status: 'pending',
      },
    };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('organization_invites')
    .insert({
      organization_id: input.organizationId,
      email: input.email,
      role: input.role,
      token_hash: tokenHash,
      invited_by: input.invitedBy,
      expires_at: expiresAt,
      status: 'pending',
    })
    .select('id,email,role,status,expires_at,created_at')
    .single();

  if (error) {
    console.warn('[invites] create_failed', { code: error.code ?? 'unknown' });

    return {
      persisted: false,
      token: null,
      invite: {
        email: input.email,
        role: input.role,
        organizationId: input.organizationId,
        status: 'pending',
      },
    };
  }

  return {
    persisted: true,
    token: rawToken,
    invite: data,
  };
}

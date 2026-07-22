import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { ScimError, type ScimIdentity } from '@/server/enterprise/scim';

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

type DirectoryRow = {
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
  total_results?: unknown;
};

const rowSchema = z.object({
  id: z.string().uuid(),
  externalId: z.string().nullable(),
  userId: z.string().uuid(),
  membershipId: z.string().uuid().nullable(),
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']),
  seatType: z.enum(['full', 'participant', 'viewer']),
  active: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  totalResults: z.number().int().nonnegative(),
});

export async function listScimIdentities(input: {
  organizationId: string;
  startIndex: number;
  count: number;
  emailFilter?: string | null;
}): Promise<{ identities: ScimIdentity[]; totalResults: number }> {
  const client = createAdminClient() as unknown as RpcClient;
  const { data, error } = await client.rpc('list_enterprise_scim_identities', {
    p_organization_id: input.organizationId,
    p_start_index: input.startIndex,
    p_count: input.count,
    p_email_filter: input.emailFilter ?? null,
  });

  if (error) {
    console.warn('[scim] directory_list_failed', { code: error.code ?? 'unknown' });
    throw new ScimError('scim_directory_unavailable', 503);
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const parsed = rows.map((value) => {
    const row = value as DirectoryRow;
    return rowSchema.parse({
      id: row.identity_id,
      externalId: typeof row.external_id === 'string' ? row.external_id : null,
      userId: row.user_id,
      membershipId: typeof row.membership_id === 'string' ? row.membership_id : null,
      email: row.email,
      role: row.role,
      seatType: row.seat_type,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      totalResults: Number(row.total_results ?? 0),
    });
  });

  return {
    identities: parsed.map(({ totalResults: _totalResults, ...identity }) => identity),
    totalResults: parsed[0]?.totalResults ?? 0,
  };
}

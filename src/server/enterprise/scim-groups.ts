import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { ScimError, type ScimAuthentication } from '@/server/enterprise/scim';

export type ScimGroup = {
  id: string;
  externalId: string | null;
  displayName: string;
  members: Array<{ value: string; display: string }>;
  createdAt: string;
  updatedAt: string;
};

type RpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string } | null }>;
  from: (table: string) => any;
};

const uuidSchema = z.string().uuid();

function client(): RpcClient {
  return createAdminClient() as unknown as RpcClient;
}

function firstRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return (data[0] as Record<string, unknown> | undefined) ?? null;
  return data && typeof data === 'object' ? data as Record<string, unknown> : null;
}

export async function listScimGroups(authentication: ScimAuthentication): Promise<ScimGroup[]> {
  const db = client();
  const { data: groups, error } = await db
    .from('enterprise_scim_groups')
    .select('id,external_id,display_name,created_at,updated_at')
    .eq('organization_id', authentication.organizationId)
    .order('display_name', { ascending: true })
    .limit(200);

  if (error) throw new ScimError('scim_group_list_unavailable', 503);

  const ids = (groups ?? []).map((group: { id: string }) => group.id);
  const { data: members, error: memberError } = ids.length === 0
    ? { data: [], error: null }
    : await db
      .from('enterprise_scim_group_members')
      .select('group_id,identity_id,enterprise_scim_identities!inner(email)')
      .eq('organization_id', authentication.organizationId)
      .in('group_id', ids);

  if (memberError) throw new ScimError('scim_group_member_list_unavailable', 503);

  return (groups ?? []).map((group: any) => ({
    id: group.id,
    externalId: group.external_id ?? null,
    displayName: group.display_name,
    members: (members ?? [])
      .filter((member: any) => member.group_id === group.id)
      .map((member: any) => ({ value: member.identity_id, display: member.enterprise_scim_identities?.email ?? member.identity_id })),
    createdAt: group.created_at,
    updatedAt: group.updated_at,
  }));
}

export async function getScimGroup(authentication: ScimAuthentication, groupId: string) {
  const id = uuidSchema.parse(groupId);
  const groups = await listScimGroups(authentication);
  const group = groups.find((candidate) => candidate.id === id);
  if (!group) throw new ScimError('scim_group_not_found', 404);
  return group;
}

export async function upsertScimGroup(input: {
  authentication: ScimAuthentication;
  groupId?: string | null;
  externalId?: string | null;
  displayName: string;
  memberIdentityIds: string[];
}) {
  const memberIdentityIds = z.array(uuidSchema).max(10000).parse(input.memberIdentityIds);
  const { data, error } = await client().rpc('upsert_enterprise_scim_group_atomic', {
    p_organization_id: input.authentication.organizationId,
    p_identity_connection_id: input.authentication.identityConnectionId,
    p_group_id: input.groupId ?? null,
    p_external_id: input.externalId ?? null,
    p_display_name: input.displayName,
    p_member_identity_ids: memberIdentityIds,
  });

  if (error) throw new ScimError('scim_group_write_unavailable', 503);
  const row = firstRow(data);
  const outcome = row?.outcome;
  if (outcome === 'not_found') throw new ScimError('scim_group_not_found', 404);
  if (outcome === 'identity_connection_not_found') throw new ScimError(String(outcome), 403);
  if (outcome !== 'upserted') throw new ScimError('invalid_scim_group', 400, 'invalidValue');
  return getScimGroup(input.authentication, String(row?.group_id));
}

export async function deleteScimGroup(authentication: ScimAuthentication, groupId: string) {
  const id = uuidSchema.parse(groupId);
  const { data, error } = await client().rpc('delete_enterprise_scim_group_atomic', {
    p_organization_id: authentication.organizationId,
    p_group_id: id,
  });
  if (error) throw new ScimError('scim_group_delete_unavailable', 503);
  if (data === 'not_found') throw new ScimError('scim_group_not_found', 404);
}

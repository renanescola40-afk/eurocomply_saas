import 'server-only';

import { randomUUID } from 'crypto';
import { Client } from 'pg';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { buildAuditChainRecord } from '@/server/security/audit-chain';
import { ApiSecurityError } from '@/server/security/api-guards';
import type { AiSystemRecord } from '@/server/queries/ai-systems';
import { getUserOrganizationMemberships } from '@/server/queries/current-organization';
import { parseOrganizationRole, roleHasPermission } from '@/lib/security/permissions';

export async function requireQaInventoryRole(userId: string, organizationId: string, permission: 'read_ai_governance' | 'manage_ai_governance') {
  const memberships = await getUserOrganizationMemberships(userId);
  const membership = memberships.find((value) => value.organization_id === organizationId);
  const role = membership && parseOrganizationRole(membership.role);
  if (!role || !roleHasPermission(role, permission)) {
    throw new ApiSecurityError({ code: 'permission_denied', message: 'Inventory permission required.', status: 403 });
  }
  return role;
}

const QA_PROJECT = 'zrxrrfbllsxtleyxjpsz';

function databaseConnection() {
  const raw = process.env.QA_INVENTORY_DATABASE_URL;
  const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw || !authUrl || new URL(authUrl).hostname !== `${QA_PROJECT}.supabase.co`
    || process.env.VERCEL_ENV === 'production') throw new Error('qa_inventory_transport_unavailable');
  const url = new URL(raw);
  if (url.protocol !== 'postgresql:' || url.port !== '6543'
    || !url.hostname.endsWith('.pooler.supabase.com')
    || url.username !== `qa_inventory_writer.${QA_PROJECT}`
    || url.pathname !== '/postgres' || !url.password
    || [...url.searchParams.keys()].some((key) => key !== 'sslmode')
    || (url.searchParams.has('sslmode') && url.searchParams.get('sslmode') !== 'verify-full')) {
    throw new Error('qa_inventory_transport_unavailable');
  }
  return raw;
}

async function verifiedClaims(expectedUserId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: session, error: sessionError } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (sessionError || !token) throw new ApiSecurityError({ code: 'unauthorized', message: 'Authentication required.', status: 401 });
  const [{ data: verified, error: claimsError }, { data: current, error: userError }] = await Promise.all([
    supabase.auth.getClaims(token),
    supabase.auth.getUser(token),
  ]);
  const claims = verified?.claims;
  const issuer = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`;
  if (claimsError || userError || !claims || !current.user
    || current.user.id !== expectedUserId || claims.sub !== expectedUserId
    || claims.iss !== issuer || claims.role !== 'authenticated'
    || claims.aal !== 'aal2' || claims.is_anonymous !== false
    || typeof claims.session_id !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(claims.session_id)) {
    throw new ApiSecurityError({ code: 'permission_denied', message: 'Verified AAL2 session required.', status: 403 });
  }
  return claims;
}

export async function mutateQaInventory(input: {
  organizationId: string;
  actorUserId: string;
  patch: Record<string, unknown>;
  systemId?: string;
  expectedUpdatedAt?: string;
  auditMetadata: (system: AiSystemRecord) => Record<string, unknown>;
}): Promise<{ outcome: string; system?: AiSystemRecord }> {
  const connectionString = databaseConnection();
  const claims = await verifiedClaims(input.actorUserId);
  const secret = process.env.AUDIT_CHAIN_SIGNING_SECRET;
  if (!secret?.trim()) throw new Error('qa_inventory_audit_signing_unavailable');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout='15s'");
    await client.query("SET LOCAL lock_timeout='2s'");
    const { rows: identity } = await client.query('SELECT current_user AS role, current_database() AS db');
    if (identity.length !== 1 || identity[0].role !== 'qa_inventory_writer' || identity[0].db !== 'postgres') {
      throw new Error('qa_inventory_role_mismatch');
    }
    await client.query("SELECT set_config('request.jwt.claims',$1,true), set_config('request.jwt.claim.sub',$2,true)", [JSON.stringify(claims), input.actorUserId]);
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1::text))', [input.organizationId]);
    const { rows: heads } = await client.query<{ head: string | null }>(
      'SELECT app_private.qa_inventory_audit_head($1::uuid) AS head', [input.organizationId],
    );
    if (heads.length !== 1) throw new Error('qa_inventory_head_missing');
    const { rows } = await client.query<{ transition: { outcome: string; system?: AiSystemRecord } }>(
      'SELECT app_private.qa_inventory_mutate($1::uuid,$2::uuid,$3::timestamptz,$4::jsonb) AS transition',
      [input.organizationId, input.systemId ?? null, input.expectedUpdatedAt ?? null, JSON.stringify(input.patch)],
    );
    const transition = rows.length === 1 ? rows[0].transition : null;
    if (!transition || typeof transition.outcome !== 'string') throw new Error('qa_inventory_transition_invalid');
    if (!['created', 'updated'].includes(transition.outcome)) {
      await client.query('ROLLBACK');
      return transition;
    }
    const system = transition.system;
    if (!system?.id || system.organization_id !== input.organizationId) throw new Error('qa_inventory_system_mismatch');
    const event = buildAuditChainRecord({
      id: randomUUID(), organizationId: input.organizationId, actorUserId: input.actorUserId,
      action: input.systemId ? 'ai_system_reassessed' : 'ai_system_created',
      entityType: 'ai_system', entityId: system.id,
      metadata: input.auditMetadata(system), createdAt: new Date().toISOString(),
    }, heads[0].head);
    if (!event.signature) throw new Error('qa_inventory_audit_signing_unavailable');
    await client.query('SELECT app_private.qa_inventory_append($1::uuid,$2::jsonb)', [input.organizationId,
      JSON.stringify({ ...event, eventHash: event.eventHash, previousHash: event.previousHash })]);
    await client.query('COMMIT');
    return { outcome: transition.outcome, system };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* connection already closed */ }
    if (error instanceof ApiSecurityError) throw error;
    console.warn('[qa-inventory] transaction_failed', { code: (error as { code?: string }).code ?? 'unavailable' });
    throw new Error('qa_inventory_transaction_unavailable');
  } finally {
    await client.end().catch(() => undefined);
  }
}

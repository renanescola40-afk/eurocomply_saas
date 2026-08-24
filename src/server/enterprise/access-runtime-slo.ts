import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';

const uuidSchema = z.string().uuid();
const alertActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('acknowledge'), alertId: z.string().uuid() }),
  z.object({ action: z.literal('resolve'), alertId: z.string().uuid(), reason: z.string().trim().min(3).max(500) }),
]);

export const accessExportRequestSchema = z.object({
  format: z.enum(['csv', 'jsonl']).default('csv'),
  status: z.enum(['pending', 'processing', 'paused', 'retry', 'completed', 'cancelled', 'dead_letter']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export { alertActionSchema };

type RpcClient = {
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { code?: string } | null;
  }>;
};

type QueryClient = {
  from: (table: string) => {
    select: (columns: string, options?: Record<string, unknown>) => any;
  };
};

type LooseRow = Record<string, unknown>;

function client() {
  return createAdminClient() as unknown as RpcClient & QueryClient;
}

function first<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === 'object' ? data as T : null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function normalizeSnapshot(row: LooseRow) {
  const legacyShape = 'operations_dead_letter' in row || 'members_processed' in row;
  const rawRate = numberOrNull(row.success_rate);
  const successRate = legacyShape && rawRate !== null ? rawRate * 100 : rawRate;

  return {
    ...row,
    id: String(row.id ?? ''),
    operations_total: numberOrNull(row.operations_total) ?? 0,
    success_rate: successRate,
    p50_duration_ms: numberOrNull(row.p50_duration_ms),
    p95_duration_ms: numberOrNull(row.p95_duration_ms),
    oldest_pending_age_seconds:
      numberOrNull(row.oldest_pending_age_seconds)
      ?? numberOrNull(row.oldest_pending_seconds)
      ?? 0,
    dead_letter_count:
      numberOrNull(row.dead_letter_count)
      ?? numberOrNull(row.operations_dead_letter)
      ?? 0,
    processed_members:
      numberOrNull(row.processed_members)
      ?? numberOrNull(row.members_processed)
      ?? 0,
    failed_members:
      numberOrNull(row.failed_members)
      ?? numberOrNull(row.members_failed)
      ?? 0,
    compensated_members:
      numberOrNull(row.compensated_members)
      ?? numberOrNull(row.members_compensated)
      ?? 0,
    window_ended_at: stringOrNull(row.window_ended_at),
  };
}

function normalizeAlert(row: LooseRow) {
  return {
    ...row,
    id: String(row.id ?? ''),
    alert_type:
      stringOrNull(row.alert_type)
      ?? stringOrNull(row.title)
      ?? stringOrNull(row.alert_key)
      ?? 'Access runtime alert',
    severity: stringOrNull(row.severity),
    status: stringOrNull(row.status),
    first_seen_at: stringOrNull(row.first_seen_at),
    last_seen_at: stringOrNull(row.last_seen_at),
    details:
      row.details && typeof row.details === 'object'
        ? row.details
        : row.evidence && typeof row.evidence === 'object'
          ? row.evidence
          : {},
  };
}

export async function captureAccessRuntimeForOrganization(organizationId: string, windowMinutes = 60) {
  const id = uuidSchema.parse(organizationId);
  const boundedWindow = Math.min(Math.max(windowMinutes, 5), 1440);
  const db = client();
  const snapshot = await db.rpc('capture_enterprise_access_runtime_snapshot', {
    p_organization_id: id,
    p_window_minutes: boundedWindow,
  });
  if (snapshot.error || typeof snapshot.data !== 'string') {
    throw new Error('enterprise_access_runtime_snapshot_failed');
  }
  const alerts = await db.rpc('evaluate_enterprise_access_runtime_alerts', {
    p_organization_id: id,
  });
  if (alerts.error || typeof alerts.data !== 'number') {
    throw new Error('enterprise_access_runtime_alert_evaluation_failed');
  }
  return { snapshotId: snapshot.data, alertsRaised: alerts.data };
}

export async function getAccessRuntimeDashboard(organizationId: string, cursor?: string, limit = 50) {
  const id = uuidSchema.parse(organizationId);
  const boundedLimit = Math.min(Math.max(limit, 1), 100);
  const db = createAdminClient();

  const snapshotsQuery = db
    .from('enterprise_access_runtime_snapshots')
    .select('*')
    .eq('organization_id', id)
    .order('window_ended_at', { ascending: false })
    .limit(24);

  const alertsQuery = db
    .from('enterprise_access_runtime_alerts')
    .select('*')
    .eq('organization_id', id)
    .in('status', ['open', 'acknowledged'])
    .order('last_seen_at', { ascending: false })
    .limit(100);

  let exportsQuery = db
    .from('enterprise_access_export_jobs')
    .select('*')
    .eq('organization_id', id)
    .order('created_at', { ascending: false })
    .limit(boundedLimit + 1);

  if (cursor) exportsQuery = exportsQuery.lt('created_at', cursor);

  const [snapshots, alerts, exports] = await Promise.all([snapshotsQuery, alertsQuery, exportsQuery]);
  if (snapshots.error || alerts.error || exports.error) throw new Error('enterprise_access_runtime_dashboard_failed');

  const rows = exports.data ?? [];
  const hasMore = rows.length > boundedLimit;
  const visible = hasMore ? rows.slice(0, boundedLimit) : rows;
  const nextCursor = hasMore ? visible.at(-1)?.created_at ?? null : null;

  return {
    snapshots: (snapshots.data ?? []).map((row) => normalizeSnapshot(row as LooseRow)),
    alerts: (alerts.data ?? []).map((row) => normalizeAlert(row as LooseRow)),
    exports: visible,
    nextCursor,
  };
}

export async function mutateAccessRuntimeAlert(input: {
  organizationId: string;
  actorUserId: string;
  action: z.infer<typeof alertActionSchema>;
}) {
  const organizationId = uuidSchema.parse(input.organizationId);
  const actorUserId = uuidSchema.parse(input.actorUserId);
  const parsed = alertActionSchema.parse(input.action);
  const db = client();
  const result = parsed.action === 'acknowledge'
    ? await db.rpc('acknowledge_enterprise_access_runtime_alert', {
      p_organization_id: organizationId,
      p_alert_id: parsed.alertId,
      p_actor_user_id: actorUserId,
    })
    : await db.rpc('resolve_enterprise_access_runtime_alert', {
      p_organization_id: organizationId,
      p_alert_id: parsed.alertId,
      p_actor_user_id: actorUserId,
      p_reason: parsed.reason,
    });
  if (result.error || typeof result.data !== 'string') throw new Error('enterprise_access_runtime_alert_mutation_failed');
  return { outcome: result.data };
}

export async function enqueueAccessExport(input: {
  organizationId: string;
  actorUserId: string;
  request: z.infer<typeof accessExportRequestSchema>;
}) {
  const organizationId = uuidSchema.parse(input.organizationId);
  const actorUserId = uuidSchema.parse(input.actorUserId);
  const request = accessExportRequestSchema.parse(input.request);
  const { format, ...filter } = request;
  const result = await client().rpc('enqueue_enterprise_access_export', {
    p_organization_id: organizationId,
    p_requested_by: actorUserId,
    p_format: format,
    p_filter: filter,
  });
  if (result.error || typeof result.data !== 'string') throw new Error('enterprise_access_export_enqueue_failed');
  return { jobId: result.data, format };
}

export async function claimNextAccessExport() {
  const result = await client().rpc('claim_enterprise_access_export_job');
  if (result.error) throw new Error('enterprise_access_export_claim_failed');
  return first<{
    job_id: string;
    organization_id: string;
    format: 'csv' | 'jsonl';
    filter: Record<string, unknown>;
    lease_token: string;
  }>(result.data);
}

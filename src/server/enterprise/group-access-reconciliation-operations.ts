import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { processNextEnterpriseGroupAccessReconciliationJob } from '@/server/enterprise/group-access-reconciliation-queue';

const uuidSchema = z.string().uuid();
type RpcClient = { rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> };

function db(): RpcClient {
  return createAdminClient() as unknown as RpcClient;
}

export function trustedReconciliationActorUserId() {
  return uuidSchema.parse(process.env.ENTERPRISE_RECONCILIATION_ACTOR_USER_ID);
}

export async function drainEnterpriseGroupAccessReconciliationQueue(limit = 25) {
  const boundedLimit = Math.min(Math.max(limit, 1), 100);
  const actorUserId = trustedReconciliationActorUserId();
  const outcomes = { completed: 0, retry: 0, deadLetter: 0, idle: 0 };

  for (let index = 0; index < boundedLimit; index += 1) {
    const result = await processNextEnterpriseGroupAccessReconciliationJob(actorUserId);
    if (result.outcome === 'idle') {
      outcomes.idle += 1;
      break;
    }
    if (result.outcome === 'completed') outcomes.completed += 1;
    if (result.outcome === 'retry') outcomes.retry += 1;
    if (result.outcome === 'dead_letter') outcomes.deadLetter += 1;
  }

  return { limit: boundedLimit, ...outcomes };
}

export async function getEnterpriseGroupAccessReconciliationStatus() {
  const { data, error } = await db().rpc('enterprise_group_access_reconciliation_status');
  if (error) throw new Error('enterprise_reconciliation_status_unavailable');
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? { pending: 0, processing: 0, retrying: 0, dead_letter: 0, completed_24h: 0, oldest_pending_age_seconds: 0 };
}

export async function replayEnterpriseGroupAccessDeadLetterJob(input: { jobId: string; organizationId: string }) {
  const jobId = uuidSchema.parse(input.jobId);
  const organizationId = uuidSchema.parse(input.organizationId);
  const { data, error } = await db().rpc('replay_enterprise_group_access_dead_letter_job', {
    p_job_id: jobId,
    p_organization_id: organizationId,
  });
  if (error || data !== 'replayed') throw new Error('enterprise_reconciliation_replay_failed');
  return { jobId, organizationId, outcome: 'replayed' as const };
}

export async function pruneEnterpriseGroupAccessReconciliationJobs(retentionDays = 30) {
  const days = Math.min(Math.max(retentionDays, 7), 365);
  const { data, error } = await db().rpc('prune_enterprise_group_access_reconciliation_jobs', { p_retention_days: days });
  if (error || typeof data !== 'number') throw new Error('enterprise_reconciliation_prune_failed');
  return { retentionDays: days, deleted: data };
}

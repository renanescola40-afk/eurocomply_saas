import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { reconcileEnterpriseGroupAccess } from '@/server/enterprise/group-access-reconciliation';

const uuidSchema = z.string().uuid();

type RpcResult = { data: unknown; error: { code?: string } | null };
type RpcClient = { rpc: (name: string, args?: Record<string, unknown>) => Promise<RpcResult> };

type ClaimedJob = {
  job_id: string;
  organization_id: string;
  batch_size: number;
  lease_token: string;
};

function client(): RpcClient {
  return createAdminClient() as unknown as RpcClient;
}

function errorCode(error: unknown): string {
  if (error instanceof Error && error.message) return error.message.slice(0, 120);
  return 'enterprise_group_access_worker_failed';
}

export async function enqueueEnterpriseGroupAccessReconciliation(input: {
  organizationId: string;
  batchSize?: number;
}) {
  const organizationId = uuidSchema.parse(input.organizationId);
  const batchSize = Math.min(Math.max(input.batchSize ?? 100, 1), 500);
  const { data, error } = await client().rpc('enqueue_enterprise_group_access_reconciliation', {
    p_organization_id: organizationId,
    p_batch_size: batchSize,
  });
  if (error || typeof data !== 'string') throw new Error('enterprise_group_access_enqueue_failed');
  return { jobId: data, organizationId, batchSize };
}

export async function processNextEnterpriseGroupAccessReconciliationJob(actorUserId: string) {
  const trustedActorUserId = uuidSchema.parse(actorUserId);
  const db = client();
  const claim = await db.rpc('claim_enterprise_group_access_reconciliation_job');
  if (claim.error) throw new Error('enterprise_group_access_claim_failed');

  const row = Array.isArray(claim.data) ? claim.data[0] : null;
  if (!row) return { outcome: 'idle' as const, processed: 0 };

  const job = row as ClaimedJob;
  uuidSchema.parse(job.job_id);
  uuidSchema.parse(job.organization_id);
  uuidSchema.parse(job.lease_token);

  try {
    const result = await reconcileEnterpriseGroupAccess({
      organizationId: job.organization_id,
      actorUserId: trustedActorUserId,
      batchSize: job.batch_size,
    });
    const completion = await db.rpc('complete_enterprise_group_access_reconciliation_job', {
      p_job_id: job.job_id,
      p_lease_token: job.lease_token,
      p_processed_count: result.processed,
    });
    if (completion.error || completion.data !== 'completed') {
      throw new Error('enterprise_group_access_completion_failed');
    }
    return { outcome: 'completed' as const, jobId: job.job_id, processed: result.processed };
  } catch (error) {
    const failure = await db.rpc('fail_enterprise_group_access_reconciliation_job', {
      p_job_id: job.job_id,
      p_lease_token: job.lease_token,
      p_error_code: errorCode(error),
    });
    if (failure.error || !['retry', 'dead_letter'].includes(String(failure.data))) {
      throw new Error('enterprise_group_access_failure_record_failed');
    }
    return {
      outcome: String(failure.data) as 'retry' | 'dead_letter',
      jobId: job.job_id,
      processed: 0,
    };
  }
}

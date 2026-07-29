import { z } from 'zod';

import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { ApiSecurityError } from '@/server/security/api-guards';

const uuidSchema = z.string().uuid();
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const SIGNED_URL_SECONDS = 120;
const DEFAULT_BUCKET = 'enterprise-access-exports';

type DownloadOutcome = 'issued' | 'denied' | 'expired' | 'integrity_failed' | 'provider_failed';

async function recordEvent(input: {
  organizationId: string;
  exportJobId: string;
  actorUserId: string;
  outcome: DownloadOutcome;
  reasonCode: string;
  correlationId: string;
  expiresInSeconds?: number;
}) {
  const db = createAdminClient();
  const { error } = await db.rpc('register_enterprise_access_export_download', {
    p_organization_id: input.organizationId,
    p_export_job_id: input.exportJobId,
    p_actor_user_id: input.actorUserId,
    p_outcome: input.outcome,
    p_reason_code: input.reasonCode,
    p_expires_in_seconds: input.expiresInSeconds ?? null,
    p_correlation_id: input.correlationId,
  });
  if (error) throw new Error('enterprise_access_export_download_audit_failed');
}

export async function createAccessExportSignedDownload(input: {
  organizationId: string;
  exportJobId: string;
  actorUserId: string;
  correlationId: string;
}) {
  const organizationId = uuidSchema.parse(input.organizationId);
  const exportJobId = uuidSchema.parse(input.exportJobId);
  const actorUserId = uuidSchema.parse(input.actorUserId);
  const correlationId = uuidSchema.parse(input.correlationId);

  const rateLimit = await checkDistributedRateLimit({
    key: `enterprise-access-export-download:${organizationId}:${actorUserId}:${exportJobId}`,
    policy: 'export',
    userId: actorUserId,
    organizationId,
    action: 'enterprise_access_export_download',
    route: '/api/team/access-runtime/exports/[jobId]/download',
    limit: 10,
    windowMs: 60_000,
    failureMode: 'fail-closed',
  });
  if (!rateLimit.allowed) {
    await recordEvent({ organizationId, exportJobId, actorUserId, outcome: 'denied', reasonCode: 'rate_limited', correlationId });
    throw new ApiSecurityError({
      code: rateLimit.reason ? 'security_control_unavailable' : 'rate_limited',
      message: rateLimit.reason ? 'Download security control unavailable.' : 'Too many download requests.',
      status: rateLimit.reason ? 503 : 429,
    });
  }

  const db = createAdminClient();
  const { data: job, error } = await db
    .from('enterprise_access_export_jobs')
    .select('id,organization_id,status,format,object_key,sha256,byte_size,row_count,expires_at')
    .eq('id', exportJobId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error || !job) throw new Error('enterprise_access_export_not_found');
  if (job.status !== 'completed' || !job.object_key) {
    await recordEvent({ organizationId, exportJobId, actorUserId, outcome: 'denied', reasonCode: 'export_not_completed', correlationId });
    throw new Error('enterprise_access_export_not_ready');
  }
  const remainingSeconds = job.expires_at
    ? Math.floor((new Date(job.expires_at).getTime() - Date.now()) / 1000)
    : 0;
  if (remainingSeconds < 30) {
    await recordEvent({ organizationId, exportJobId, actorUserId, outcome: 'expired', reasonCode: 'export_expired', correlationId });
    throw new Error('enterprise_access_export_expired');
  }
  if (!SHA256_PATTERN.test(job.sha256 ?? '') || Number(job.byte_size) < 0 || Number(job.row_count) < 0) {
    await recordEvent({ organizationId, exportJobId, actorUserId, outcome: 'integrity_failed', reasonCode: 'invalid_export_integrity_metadata', correlationId });
    throw new Error('enterprise_access_export_integrity_failed');
  }

  const expectedPrefix = `${organizationId}/`;
  if (!job.object_key.startsWith(expectedPrefix) || job.object_key.includes('..')) {
    await recordEvent({ organizationId, exportJobId, actorUserId, outcome: 'integrity_failed', reasonCode: 'invalid_tenant_storage_path', correlationId });
    throw new Error('enterprise_access_export_integrity_failed');
  }

  const bucket = process.env.ENTERPRISE_ACCESS_EXPORT_BUCKET?.trim() || DEFAULT_BUCKET;
  const extension = job.format === 'jsonl' ? 'jsonl' : 'csv';
  const signedUrlSeconds = Math.min(SIGNED_URL_SECONDS, remainingSeconds);
  const { data, error: signedError } = await db.storage
    .from(bucket)
    .createSignedUrl(job.object_key, signedUrlSeconds, { download: `access-evidence-${exportJobId}.${extension}` });

  if (signedError || !data?.signedUrl) {
    await recordEvent({ organizationId, exportJobId, actorUserId, outcome: 'provider_failed', reasonCode: 'signed_url_provider_failed', correlationId });
    throw new Error('enterprise_access_export_signed_url_failed');
  }

  await recordEvent({
    organizationId,
    exportJobId,
    actorUserId,
    outcome: 'issued',
    reasonCode: 'signed_url_issued',
    correlationId,
    expiresInSeconds: signedUrlSeconds,
  });

  return {
    signedUrl: data.signedUrl,
    expiresIn: signedUrlSeconds,
    sha256: job.sha256,
    byteSize: Number(job.byte_size),
    rowCount: Number(job.row_count),
    format: job.format,
  };
}

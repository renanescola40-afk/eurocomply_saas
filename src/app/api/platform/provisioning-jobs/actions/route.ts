import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { processEnterpriseProvisioningBatch } from '@/server/enterprise/bulk-provisioning-worker';
import { noStoreJson } from '@/server/security/no-store';
import {
  requireApiUser,
  requireTrustedMutation,
  secureApiError,
} from '@/server/security/api-guards';
import {
  PlatformAdminError,
  requirePlatformCapability,
} from '@/server/security/platform-admin';

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('process'),
    batchSize: z.number().int().min(1).max(50).default(10),
  }),
  z.object({
    action: z.literal('cancel'),
    jobId: z.string().uuid(),
  }),
]);

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function firstRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return (data[0] as Record<string, unknown> | undefined) ?? null;
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `platform-provisioning-action:${user.id}:${getClientIp(request)}`,
        policy: 'team-management',
        userId: user.id,
        action: 'enterprise_bulk_provisioning_action',
        route: '/api/platform/provisioning-jobs/actions',
        limit: 20,
        windowMs: 60_000,
        failureMode: 'fail-closed',
      },
    });
    if (mutationDenied) return mutationDenied;

    await requirePlatformCapability(user.id, 'organizations');

    const payload = await readBoundedJsonRequest(request, { maxBytes: 4 * 1024 }).catch(() => null);
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return noStoreJson({ error: 'invalid_provisioning_job_action' }, { status: 400 });
    }

    if (parsed.data.action === 'process') {
      const worker = await processEnterpriseProvisioningBatch(parsed.data.batchSize);
      return noStoreJson({ processed: true, worker });
    }

    const client = createAdminClient() as unknown as RpcClient;
    const { data, error } = await client.rpc('cancel_enterprise_provisioning_job_atomic', {
      p_job_id: parsed.data.jobId,
      p_actor_user_id: user.id,
    });

    if (error) {
      return noStoreJson({ error: 'enterprise_provisioning_job_unavailable' }, { status: 503 });
    }

    const row = firstRow(data);
    if (!row || row.outcome === 'not_found') {
      return noStoreJson({ error: 'enterprise_provisioning_job_not_found' }, { status: 404 });
    }
    if (row.outcome === 'operator_required') {
      return noStoreJson({ error: 'platform_admin_required' }, { status: 403 });
    }

    return noStoreJson({ job: row });
  } catch (error) {
    if (error instanceof PlatformAdminError) {
      return noStoreJson({ error: error.code }, { status: error.status });
    }
    return secureApiError(error, request);
  }
}

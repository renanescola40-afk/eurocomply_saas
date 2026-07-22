import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import {
  createEnterpriseProvisioningJob,
  parseEnterpriseProvisioningCsv,
} from '@/server/enterprise/bulk-provisioning';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { isPlanAtLeast } from '@/server/queries/subscription';
import { noStoreJson } from '@/server/security/no-store';
import {
  requireApiUser,
  requirePermission,
  requireTrustedMutation,
  secureApiError,
} from '@/server/security/api-guards';
import { requireStepUpForRequest } from '@/server/security/step-up';

const MAX_IMPORT_JSON_BYTES = 5 * 1024 * 1024;
const jobIdSchema = z.string().uuid();
const importSchema = z.object({
  csv: z.string().min(1).max(4 * 1024 * 1024),
  idempotencyKey: z.string().trim().min(8).max(160),
  defaultRole: z.enum(['admin', 'editor', 'viewer']).optional(),
  defaultSeatType: z.enum(['full', 'participant', 'viewer']).optional(),
});

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

function firstRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return (data[0] as Record<string, unknown> | undefined) ?? null;
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) {
      return noStoreJson({ error: 'organization_not_found' }, { status: 404 });
    }

    await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_team',
    });

    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `team-csv-import:${organization.id}:${user.id}`,
        policy: 'team-management',
        userId: user.id,
        organizationId: organization.id,
        action: 'enterprise_bulk_provisioning_create',
        route: '/api/team/imports/csv',
        limit: 3,
        windowMs: 60_000,
        failureMode: 'fail-closed',
      },
    });
    if (mutationDenied) return mutationDenied;

    const stepUp = await requireStepUpForRequest({
      request,
      action: 'manage_team',
      userId: user.id,
      organizationId: organization.id,
    });
    if (!stepUp.ok) return stepUp.response;

    const entitlements = await getOrganizationEntitlements(organization.id);
    if (!entitlements.employeeInvites || !isPlanAtLeast(entitlements.plan, 'enterprise')) {
      return noStoreJson({ error: 'enterprise_plan_required' }, { status: 402 });
    }

    const payload = await readBoundedJsonRequest(request, {
      maxBytes: MAX_IMPORT_JSON_BYTES,
    }).catch(() => null);
    const parsed = importSchema.safeParse(payload);
    if (!parsed.success) {
      return noStoreJson({ error: 'invalid_enterprise_import_payload' }, { status: 400 });
    }

    let rows;
    try {
      rows = parseEnterpriseProvisioningCsv(parsed.data);
    } catch (error) {
      return noStoreJson(
        { error: error instanceof Error ? error.message : 'enterprise_csv_invalid' },
        { status: 400 },
      );
    }

    const result = await createEnterpriseProvisioningJob({
      organizationId: organization.id,
      actorUserId: user.id,
      source: 'csv',
      idempotencyKey: parsed.data.idempotencyKey,
      rows,
    });

    if (result.outcome === 'capacity_insufficient') {
      return noStoreJson(
        {
          error: 'enterprise_import_capacity_insufficient',
          totalItems: result.totalItems,
          available: result.available,
        },
        { status: 409 },
      );
    }
    if (result.outcome === 'contract_not_active') {
      return noStoreJson({ error: 'organization_contract_not_accepting_members' }, { status: 409 });
    }
    if (result.outcome === 'operator_required') {
      return noStoreJson({ error: 'permission_denied' }, { status: 403 });
    }
    if (['invalid_input', 'invalid_item_count', 'invalid_item', 'duplicate_email'].includes(result.outcome)) {
      return noStoreJson({ error: `enterprise_import_${result.outcome}` }, { status: 400 });
    }
    if (!result.jobId || !['created', 'duplicate'].includes(result.outcome)) {
      return noStoreJson({ error: 'enterprise_provisioning_job_unavailable' }, { status: 503 });
    }

    return noStoreJson(
      {
        created: result.outcome === 'created',
        duplicate: result.outcome === 'duplicate',
        jobId: result.jobId,
        status: result.jobStatus,
        totalItems: result.totalItems,
        availableAfterQueue: result.available,
      },
      { status: result.outcome === 'created' ? 202 : 200 },
    );
  } catch (error) {
    return secureApiError(error, request);
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) {
      return noStoreJson({ error: 'organization_not_found' }, { status: 404 });
    }

    await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_team',
    });

    const jobId = jobIdSchema.safeParse(new URL(request.url).searchParams.get('jobId'));
    if (!jobId.success) {
      return noStoreJson({ error: 'invalid_provisioning_job_selector' }, { status: 400 });
    }

    const client = createAdminClient() as unknown as RpcClient;
    const { data, error } = await client.rpc('get_enterprise_provisioning_job_status', {
      p_job_id: jobId.data,
      p_actor_user_id: user.id,
    });
    if (error) {
      return noStoreJson({ error: 'enterprise_provisioning_job_unavailable' }, { status: 503 });
    }

    const row = firstRow(data);
    if (!row || row.outcome === 'not_found' || row.organization_id !== organization.id) {
      return noStoreJson({ error: 'enterprise_provisioning_job_not_found' }, { status: 404 });
    }
    if (row.outcome === 'operator_required') {
      return noStoreJson({ error: 'permission_denied' }, { status: 403 });
    }

    return noStoreJson({ job: row });
  } catch (error) {
    return secureApiError(error, request);
  }
}

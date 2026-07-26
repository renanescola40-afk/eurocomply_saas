import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { createEnterpriseAccessOperation } from '@/server/enterprise/access-operations-center';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { requireApiUser, requirePermission, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const ROUTE = '/api/team/access-operations';
const MAX_BODY_BYTES = 16 * 1024;

const createSchema = z.object({
  operationType: z.enum(['group_reconciliation', 'member_export', 'policy_recompute']).default('group_reconciliation'),
  reason: z.string().trim().min(8).max(500),
  batchSize: z.number().int().min(1).max(500).optional(),
});

export async function GET() {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_team',
    });

    const { data, error } = await createAdminClient()
      .from('enterprise_access_operations')
      .select('id,operation_type,status,reason,batch_size,attempts,max_attempts,total_candidates,processed_count,succeeded_count,failed_count,skipped_count,last_error_code,started_at,completed_at,cancelled_at,created_at,updated_at')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return noStoreJson({ error: 'access_operations_lookup_failed' }, { status: 503 });
    return noStoreJson({ operations: data ?? [] });
  } catch (error) {
    return secureApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    const permission = await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_team',
    });

    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `access-operations:${organization.id}:${user.id}`,
        policy: 'team-management',
        userId: user.id,
        organizationId: organization.id,
        action: 'create_enterprise_access_operation',
        route: ROUTE,
        limit: 5,
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

    const body = await readBoundedJsonRequest(request, { maxBytes: MAX_BODY_BYTES });
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return noStoreJson({ error: 'invalid_access_operation_payload' }, { status: 400 });

    const operation = await createEnterpriseAccessOperation({
      organizationId: organization.id,
      requestedBy: user.id,
      operationType: parsed.data.operationType,
      reason: parsed.data.reason,
      batchSize: parsed.data.batchSize,
    });

    return noStoreJson({
      operation,
      actorRole: permission.role,
      stepUp: publicStepUpSummary(stepUp.assessment),
    }, { status: 202 });
  } catch (error) {
    return secureApiError(error);
  }
}

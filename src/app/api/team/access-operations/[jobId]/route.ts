import { z } from 'zod';

import { readBoundedJsonRequest } from '@/lib/security/validate';
import { createAdminClient } from '@/lib/supabase/admin';
import { controlEnterpriseAccessOperation } from '@/server/enterprise/access-operations-center';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { requireApiUser, requirePermission, requireTrustedMutation, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { publicStepUpSummary, requireStepUpForRequest } from '@/server/security/step-up';

const MAX_BODY_BYTES = 8 * 1024;
const paramsSchema = z.object({ jobId: z.string().uuid() });
const controlSchema = z.object({
  action: z.enum(['pause', 'resume', 'cancel', 'retry_failed']),
  reason: z.string().trim().min(8).max(500),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    await requirePermission({ userId: user.id, organizationId: organization.id, permission: 'manage_team' });

    const { jobId } = paramsSchema.parse(await context.params);
    const db = createAdminClient();
    const [{ data: operation, error }, { data: items, error: itemsError }] = await Promise.all([
      db
        .from('enterprise_access_operations')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('id', jobId)
        .maybeSingle(),
      db
        .from('enterprise_access_operation_items')
        .select('identity_id,membership_id,user_id,source_group_id,department_key,previous_role,requested_role,previous_seat_type,requested_seat_type,status,outcome_code,attempt_count,error_detail,completed_at')
        .eq('organization_id', organization.id)
        .eq('operation_id', jobId)
        .order('identity_id', { ascending: true })
        .limit(500),
    ]);

    if (error || itemsError) return noStoreJson({ error: 'access_operation_lookup_failed' }, { status: 503 });
    if (!operation) return noStoreJson({ error: 'access_operation_not_found' }, { status: 404 });
    return noStoreJson({ operation, items: items ?? [] });
  } catch (error) {
    return secureApiError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    const permission = await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_team',
    });
    const { jobId } = paramsSchema.parse(await context.params);

    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `access-operation-control:${organization.id}:${user.id}:${jobId}`,
        policy: 'team-management',
        userId: user.id,
        organizationId: organization.id,
        action: 'control_enterprise_access_operation',
        route: '/api/team/access-operations/[jobId]',
        limit: 10,
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
    const parsed = controlSchema.safeParse(body);
    if (!parsed.success) return noStoreJson({ error: 'invalid_access_operation_control' }, { status: 400 });

    const result = await controlEnterpriseAccessOperation({
      operationId: jobId,
      organizationId: organization.id,
      actorUserId: user.id,
      action: parsed.data.action,
      reason: parsed.data.reason,
    });

    if (result.outcome === 'not_found') return noStoreJson({ error: 'access_operation_not_found' }, { status: 404 });
    if (result.outcome === 'invalid_input') return noStoreJson({ error: 'invalid_access_operation_control' }, { status: 400 });

    return noStoreJson({
      result,
      actorRole: permission.role,
      stepUp: publicStepUpSummary(stepUp.assessment),
    });
  } catch (error) {
    return secureApiError(error);
  }
}

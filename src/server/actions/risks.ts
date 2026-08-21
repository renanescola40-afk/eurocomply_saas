import { z } from 'zod';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { assertResourceQuota, verifyResourceQuotaAfterCreate } from '@/server/billing/entitlements';
import { requireCurrentUser } from '@/server/queries/auth';
import { logAuditEvent } from './audit';

const RISK_MUTATION_SELECT =
  'id, organization_id, created_by, owner_user_id, title, description, category, likelihood, impact, risk_score, status, mitigation, due_date, created_at, updated_at';

const riskSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().min(3).max(180),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(80).optional().nullable(),
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  mitigation: z.string().max(2000).optional().nullable(),
  status: z.enum(['open', 'mitigating', 'accepted', 'closed']).default('open'),
  ownerUserId: z.string().uuid().optional().nullable(),
  dueDate: z.string().max(10).optional().nullable(),
});

const updateRiskSchema = z
  .object({
    riskId: z.string().uuid(),
    organizationId: z.string().uuid(),
    title: z.string().min(3).max(180).optional(),
    description: z.string().max(2000).optional().nullable(),
    category: z.string().max(80).optional().nullable(),
    likelihood: z.number().int().min(1).max(5).optional(),
    impact: z.number().int().min(1).max(5).optional(),
    mitigation: z.string().max(2000).optional().nullable(),
    status: z.enum(['open', 'mitigating', 'accepted', 'closed']).optional(),
    ownerUserId: z.string().uuid().optional().nullable(),
    dueDate: z.string().max(10).optional().nullable(),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
  })
  .refine(
    (payload) =>
      payload.title !== undefined ||
      payload.description !== undefined ||
      payload.category !== undefined ||
      payload.likelihood !== undefined ||
      payload.impact !== undefined ||
      payload.mitigation !== undefined ||
      payload.status !== undefined ||
      payload.ownerUserId !== undefined ||
      payload.dueDate !== undefined,
    { message: 'At least one risk field must be changed' },
  );

const deleteRiskSchema = z.object({
  riskId: z.string().uuid(),
  organizationId: z.string().uuid(),
});

function actionError(message: string) {
  return new Error(message);
}

async function requireRiskActionUser() {
  return requireCurrentUser();
}

async function enforceRiskRateLimit(params: {
  action: 'create' | 'update' | 'delete';
  organizationId: string;
  userId: string;
}) {
  const rateLimit = await checkDistributedRateLimit({
    key: `risk:${params.action}:${params.organizationId}:${params.userId}`,
    policy: 'general-api',
    userId: params.userId,
    organizationId: params.organizationId,
    route: `server-action:${params.action}Risk`,
    action: `risk.${params.action}`,
    limit: 30,
    windowMs: 60_000,
    failureMode: 'fail-closed',
  });

  if (!rateLimit.allowed) {
    throw actionError('Too many risk changes. Please try again later.');
  }
}

async function enforceRiskQuota(organizationId: string) {
  const quota = await assertResourceQuota(organizationId, 'risks');
  if (!quota.ok) throw actionError(quota.message);
  return quota;
}

export async function createRisk(input: unknown) {
  const user = await requireRiskActionUser();
  const payload = riskSchema.parse(input);
  const context = { area: 'risk_create_action', organizationId: payload.organizationId, userId: user.id };

  await assertCurrentUserCan(payload.organizationId, user.id, 'risks:write');
  await enforceRiskRateLimit({ action: 'create', organizationId: payload.organizationId, userId: user.id });
  const quota = await enforceRiskQuota(payload.organizationId);

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('risks')
      .insert({
        organization_id: payload.organizationId,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        likelihood: payload.likelihood,
        impact: payload.impact,
        mitigation: payload.mitigation,
        status: payload.status,
        owner_user_id: payload.ownerUserId,
        due_date: payload.dueDate,
        created_by: user.id,
      })
      .select(RISK_MUTATION_SELECT)
      .single();

    if (error) {
      reportError(error, context);
      throw actionError('Unable to create risk');
    }

    const postQuota = await verifyResourceQuotaAfterCreate(payload.organizationId, 'risks', quota.maxAllowed);
    if (!postQuota.ok) {
      reportError(new Error(postQuota.error), {
        ...context,
        area: 'risk_create_quota_postcheck',
        riskId: data.id,
        currentCount: postQuota.currentCount,
        maxAllowed: postQuota.maxAllowed,
      });
      const { error: rollbackError } = await supabase
        .from('risks')
        .delete()
        .eq('id', data.id)
        .eq('organization_id', payload.organizationId)
        .eq('created_by', user.id);

      if (rollbackError) {
        reportError(rollbackError, {
          ...context,
          area: 'risk_create_quota_compensation_failed',
          riskId: data.id,
        });
      }

      throw actionError(postQuota.message);
    }

    const audit = await logAuditEvent({
      organizationId: payload.organizationId,
      actorUserId: user.id,
      action: 'risk.create',
      entityType: 'risk',
      entityId: data.id,
      metadata: { title: payload.title, likelihood: payload.likelihood, impact: payload.impact },
    });

    if (!audit.persisted) {
      const { error: rollbackError } = await supabase
        .from('risks')
        .delete()
        .eq('id', data.id)
        .eq('organization_id', payload.organizationId)
        .eq('created_by', user.id);

      if (rollbackError) {
        reportError(rollbackError, {
          ...context,
          area: 'risk_create_audit_rollback',
          riskId: data.id,
        });
      }

      throw actionError('Unable to create risk');
    }

    return data;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'Unable to create risk' || error.message.includes('quota'))
    ) {
      throw actionError(error.message);
    }

    reportError(error, context);
    throw actionError('Unable to create risk');
  }
}

export async function updateRisk(input: unknown) {
  const user = await requireRiskActionUser();
  const payload = updateRiskSchema.parse(input);
  const context = {
    area: 'risk_update_action',
    organizationId: payload.organizationId,
    riskId: payload.riskId,
    userId: user.id,
  };

  await assertCurrentUserCan(payload.organizationId, user.id, 'risks:write');
  await enforceRiskRateLimit({ action: 'update', organizationId: payload.organizationId, userId: user.id });

  const changes = {
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.category !== undefined ? { category: payload.category } : {}),
    ...(payload.likelihood !== undefined ? { likelihood: payload.likelihood } : {}),
    ...(payload.impact !== undefined ? { impact: payload.impact } : {}),
    ...(payload.mitigation !== undefined ? { mitigation: payload.mitigation } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.ownerUserId !== undefined ? { owner_user_id: payload.ownerUserId } : {}),
    ...(payload.dueDate !== undefined ? { due_date: payload.dueDate } : {}),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = createAdminClient();
    const { data: previous, error: previousError } = await supabase
      .from('risks')
      .select(RISK_MUTATION_SELECT)
      .eq('id', payload.riskId)
      .eq('organization_id', payload.organizationId)
      .eq('updated_at', payload.expectedUpdatedAt)
      .single();

    if (previousError || !previous) {
      if (previousError) reportError(previousError, context);
      throw actionError('Risk changed or no longer exists');
    }

    const { data, error } = await supabase
      .from('risks')
      .update(changes)
      .eq('id', payload.riskId)
      .eq('organization_id', payload.organizationId)
      .eq('updated_at', payload.expectedUpdatedAt)
      .select(RISK_MUTATION_SELECT)
      .single();

    if (error || !data) {
      if (error) reportError(error, context);
      throw actionError('Unable to update risk');
    }

    const audit = await logAuditEvent({
      organizationId: payload.organizationId,
      actorUserId: user.id,
      action: 'risk.update',
      entityType: 'risk',
      entityId: payload.riskId,
      metadata: {
        changedFields: Object.keys(changes).filter((field) => field !== 'updated_at'),
        previousStatus: previous.status,
        status: data.status,
      },
    });

    if (!audit.persisted) {
      const { error: rollbackError } = await supabase
        .from('risks')
        .update({
          title: previous.title,
          description: previous.description,
          category: previous.category,
          likelihood: previous.likelihood,
          impact: previous.impact,
          mitigation: previous.mitigation,
          status: previous.status,
          owner_user_id: previous.owner_user_id,
          due_date: previous.due_date,
          updated_at: previous.updated_at,
        })
        .eq('id', payload.riskId)
        .eq('organization_id', payload.organizationId)
        .eq('updated_at', data.updated_at);

      if (rollbackError) {
        reportError(rollbackError, { ...context, area: 'risk_update_audit_rollback' });
      }

      throw actionError('Unable to update risk');
    }

    return data;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'Unable to update risk' || error.message === 'Risk changed or no longer exists')
    ) {
      throw actionError(error.message);
    }

    reportError(error, context);
    throw actionError('Unable to update risk');
  }
}

export async function deleteRisk(riskId: string, organizationId: string) {
  const user = await requireRiskActionUser();
  const payload = deleteRiskSchema.parse({ riskId, organizationId });
  const context = { area: 'risk_delete_action', organizationId: payload.organizationId, riskId: payload.riskId, userId: user.id };

  await assertCurrentUserCan(payload.organizationId, user.id, 'risks:delete');
  await enforceRiskRateLimit({ action: 'delete', organizationId: payload.organizationId, userId: user.id });

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('risks')
      .delete()
      .eq('id', payload.riskId)
      .eq('organization_id', payload.organizationId)
      .select(RISK_MUTATION_SELECT)
      .single();

    if (error) {
      reportError(error, context);
      throw actionError('Unable to delete risk');
    }

    const audit = await logAuditEvent({ organizationId: payload.organizationId, actorUserId: user.id, action: 'risk.delete', entityType: 'risk', entityId: payload.riskId, metadata: { title: data.title, likelihood: data.likelihood, impact: data.impact } });

    if (!audit.persisted) {
      const { error: rollbackError } = await supabase.from('risks').insert(data);

      if (rollbackError) {
        reportError(rollbackError, {
          ...context,
          area: 'risk_delete_audit_rollback',
        });
      }

      throw actionError('Unable to delete risk');
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.message === 'Unable to delete risk') {
      throw actionError('Unable to delete risk');
    }

    reportError(error, context);
    throw actionError('Unable to delete risk');
  }
}

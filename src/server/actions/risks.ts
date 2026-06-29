import { z } from 'zod';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { requireCurrentUser } from '@/server/queries/auth';
import { logAuditEvent } from './audit';

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
  dueDate: z.string().optional().nullable(),
});

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

export async function createRisk(input: unknown) {
  const user = await requireRiskActionUser();
  const payload = riskSchema.parse(input);
  const context = { area: 'risk_create_action', organizationId: payload.organizationId, userId: user.id };

  await assertCurrentUserCan(payload.organizationId, user.id, 'risks:write');

  const rateLimit = await checkDistributedRateLimit({
    key: `risk:create:${payload.organizationId}:${user.id}`,
    policy: 'general-api',
    userId: user.id,
    organizationId: payload.organizationId,
    route: 'server-action:createRisk',
    action: 'risk.create',
    limit: 30,
    windowMs: 60_000,
    failureMode: 'fail-closed',
  });

  if (!rateLimit.allowed) {
    throw actionError('Too many risk changes. Please try again later.');
  }

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
      .select('*')
      .single();

    if (error) {
      reportError(error, context);
      throw actionError('Unable to create risk');
    }

    await logAuditEvent({
      organizationId: payload.organizationId,
      actorUserId: user.id,
      action: 'risk.create',
      entityType: 'risk',
      entityId: data.id,
      metadata: { title: payload.title, likelihood: payload.likelihood, impact: payload.impact },
    });

    return data;
  } catch (error) {
    if (error instanceof Error && error.message === 'Unable to create risk') {
      throw error;
    }

    reportError(error, context);
    throw actionError('Unable to create risk');
  }
}

export async function deleteRisk(riskId: string, organizationId: string) {
  const user = await requireRiskActionUser();
  const payload = deleteRiskSchema.parse({ riskId, organizationId });
  const context = { area: 'risk_delete_action', organizationId: payload.organizationId, riskId: payload.riskId, userId: user.id };

  await assertCurrentUserCan(payload.organizationId, user.id, 'risks:delete');

  const rateLimit = await checkDistributedRateLimit({
    key: `risk:delete:${payload.organizationId}:${user.id}`,
    policy: 'general-api',
    userId: user.id,
    organizationId: payload.organizationId,
    route: 'server-action:deleteRisk',
    action: 'risk.delete',
    limit: 30,
    windowMs: 60_000,
    failureMode: 'fail-closed',
  });

  if (!rateLimit.allowed) {
    throw actionError('Too many risk changes. Please try again later.');
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('risks')
      .delete()
      .eq('id', payload.riskId)
      .eq('organization_id', payload.organizationId)
      .select('id,title,likelihood,impact')
      .single();

    if (error) {
      reportError(error, context);
      throw actionError('Unable to delete risk');
    }

    await logAuditEvent({
      organizationId: payload.organizationId,
      actorUserId: user.id,
      action: 'risk.delete',
      entityType: 'risk',
      entityId: payload.riskId,
      metadata: { title: data.title, likelihood: data.likelihood, impact: data.impact },
    });

    return data;
  } catch (error) {
    if (error instanceof Error && error.message === 'Unable to delete risk') {
      throw error;
    }

    reportError(error, context);
    throw actionError('Unable to delete risk');
  }
}

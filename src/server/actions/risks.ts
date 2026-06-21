import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertCurrentUserCan } from '@/server/auth/permissions';
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

export async function createRisk(input: unknown, userId: string) {
  const payload = riskSchema.parse(input);
  await assertCurrentUserCan(payload.organizationId, userId, 'risks:write');

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
      created_by: userId,
    })
    .select('*')
    .single();

  if (error) throw error;

  await logAuditEvent({
    organizationId: payload.organizationId,
    actorUserId: userId,
    action: 'risk.create',
    entityType: 'risk',
    entityId: data.id,
    metadata: { title: payload.title, likelihood: payload.likelihood, impact: payload.impact },
  });

  return data;
}

export async function deleteRisk(riskId: string, organizationId: string, userId: string) {
  await assertCurrentUserCan(organizationId, userId, 'risks:delete');

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('risks')
    .delete()
    .eq('id', riskId)
    .eq('organization_id', organizationId)
    .select('id,title,likelihood,impact')
    .single();

  if (error) throw error;

  await logAuditEvent({
    organizationId,
    actorUserId: userId,
    action: 'risk.delete',
    entityType: 'risk',
    entityId: riskId,
    metadata: { title: data.title, likelihood: data.likelihood, impact: data.impact },
  });

  return data;
}

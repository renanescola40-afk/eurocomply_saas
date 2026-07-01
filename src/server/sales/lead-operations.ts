import { z } from 'zod';

import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';
import { requireCurrentUser } from '@/server/queries/auth';
import { SALES_LEAD_PRIORITIES, SALES_LEAD_STATUSES, type SalesLeadPriority, type SalesLeadStatus } from '@/server/queries/sales-leads';
import { requirePlatformAdmin } from '@/server/security/platform-admin';
import { assertTrustedOrigin } from '@/server/security/origin-guard';

const leadIdSchema = z.string().uuid();

export const updateLeadStatusSchema = z.object({
  leadId: leadIdSchema,
  status: z.enum(SALES_LEAD_STATUSES),
});

export const updateLeadPrioritySchema = z.object({
  leadId: leadIdSchema,
  priority: z.enum(SALES_LEAD_PRIORITIES),
});

export const updateLeadFollowUpSchema = z.object({
  leadId: leadIdSchema,
  nextFollowUpAt: z.string().max(40).optional().nullable(),
});

export const createLeadNoteSchema = z.object({
  leadId: leadIdSchema,
  body: z.string().trim().min(1).max(2000),
});

type LeadAction =
  | 'sales_lead.status_changed'
  | 'sales_lead.priority_changed'
  | 'sales_lead.follow_up_changed'
  | 'sales_lead.note_created';

function actionError(message: string) {
  return new Error(message);
}

export function readFormText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
}

export async function requireLeadOperationAccess(request: Request, action: LeadAction) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) throw actionError('Request origin is not trusted.');

  const user = await requireCurrentUser();
  await requirePlatformAdmin(user.id);

  const rateLimit = await checkDistributedRateLimit({
    key: `sales-console:${action}:${user.id}`,
    policy: 'general-api',
    userId: user.id,
    organizationId: null,
    route: 'admin:sales-console',
    action,
    limit: 60,
    windowMs: 60_000,
    failureMode: 'fail-closed',
  });

  if (!rateLimit.allowed) throw actionError('Too many Sales Console changes. Please try again later.');

  return user;
}

function normalizeFollowUp(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) throw actionError('Invalid follow-up date.');
  return date.toISOString();
}

async function getLeadState(leadId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sales_leads')
    .select('id, status, priority, next_follow_up_at')
    .eq('id', leadId)
    .is('gdpr_deleted_at', null)
    .maybeSingle();

  if (error) throw actionError('Unable to load lead.');
  if (!data) throw actionError('Lead not found.');

  return data as { id: string; status: SalesLeadStatus; priority: SalesLeadPriority; next_follow_up_at: string | null };
}

async function recordLeadActivity(input: {
  leadId: string;
  actorUserId: string;
  action: LeadAction;
  previousValue?: Record<string, unknown> | null;
  nextValue?: Record<string, unknown> | null;
}) {
  const supabase = createAdminClient();
  await supabase.from('sales_lead_activity_events').insert({
    lead_id: input.leadId,
    actor_user_id: input.actorUserId,
    action: input.action,
    previous_value: input.previousValue ?? null,
    next_value: input.nextValue ?? null,
    metadata: {},
  });

  await logAuditEvent({
    organizationId: null,
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: 'sales_lead',
    entityId: input.leadId,
    metadata: {
      previousValue: input.previousValue ?? null,
      nextValue: input.nextValue ?? null,
    },
  });
}

export async function updateLeadStatus(request: Request, formData: FormData) {
  const payload = updateLeadStatusSchema.parse({ leadId: readFormText(formData, 'leadId'), status: readFormText(formData, 'status') });
  const user = await requireLeadOperationAccess(request, 'sales_lead.status_changed');
  const previous = await getLeadState(payload.leadId);
  const now = new Date().toISOString();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('sales_leads')
    .update({ status: payload.status, updated_by: user.id, updated_at: now, last_activity_at: now })
    .eq('id', payload.leadId)
    .is('gdpr_deleted_at', null);

  if (error) throw actionError('Unable to update lead status.');

  await recordLeadActivity({
    leadId: payload.leadId,
    actorUserId: user.id,
    action: 'sales_lead.status_changed',
    previousValue: { status: previous.status },
    nextValue: { status: payload.status },
  });
}

export async function updateLeadPriority(request: Request, formData: FormData) {
  const payload = updateLeadPrioritySchema.parse({ leadId: readFormText(formData, 'leadId'), priority: readFormText(formData, 'priority') });
  const user = await requireLeadOperationAccess(request, 'sales_lead.priority_changed');
  const previous = await getLeadState(payload.leadId);
  const now = new Date().toISOString();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('sales_leads')
    .update({ priority: payload.priority, updated_by: user.id, updated_at: now, last_activity_at: now })
    .eq('id', payload.leadId)
    .is('gdpr_deleted_at', null);

  if (error) throw actionError('Unable to update lead priority.');

  await recordLeadActivity({
    leadId: payload.leadId,
    actorUserId: user.id,
    action: 'sales_lead.priority_changed',
    previousValue: { priority: previous.priority },
    nextValue: { priority: payload.priority },
  });
}

export async function updateLeadFollowUp(request: Request, formData: FormData) {
  const payload = updateLeadFollowUpSchema.parse({ leadId: readFormText(formData, 'leadId'), nextFollowUpAt: readFormText(formData, 'nextFollowUpAt') });
  const user = await requireLeadOperationAccess(request, 'sales_lead.follow_up_changed');
  const previous = await getLeadState(payload.leadId);
  const nextFollowUpAt = normalizeFollowUp(payload.nextFollowUpAt);
  const now = new Date().toISOString();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('sales_leads')
    .update({ next_follow_up_at: nextFollowUpAt, updated_by: user.id, updated_at: now, last_activity_at: now })
    .eq('id', payload.leadId)
    .is('gdpr_deleted_at', null);

  if (error) throw actionError('Unable to update lead follow-up.');

  await recordLeadActivity({
    leadId: payload.leadId,
    actorUserId: user.id,
    action: 'sales_lead.follow_up_changed',
    previousValue: { nextFollowUpAt: previous.next_follow_up_at },
    nextValue: { nextFollowUpAt },
  });
}

export async function createLeadNote(request: Request, formData: FormData) {
  const payload = createLeadNoteSchema.parse({ leadId: readFormText(formData, 'leadId'), body: readFormText(formData, 'body') });
  const user = await requireLeadOperationAccess(request, 'sales_lead.note_created');
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sales_lead_notes')
    .insert({ lead_id: payload.leadId, created_by: user.id, body: payload.body })
    .select('id')
    .single();

  if (error) throw actionError('Unable to create internal note.');

  const now = new Date().toISOString();
  await supabase
    .from('sales_leads')
    .update({ updated_by: user.id, updated_at: now, last_activity_at: now })
    .eq('id', payload.leadId)
    .is('gdpr_deleted_at', null);

  await recordLeadActivity({
    leadId: payload.leadId,
    actorUserId: user.id,
    action: 'sales_lead.note_created',
    nextValue: { noteId: data.id },
  });
}

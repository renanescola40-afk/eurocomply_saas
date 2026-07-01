import { z } from 'zod';

import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';
import { requireCurrentUser } from '@/server/queries/auth';
import { SALES_LEAD_PRIORITIES, SALES_LEAD_STATUSES, type SalesLeadPriority, type SalesLeadStatus } from '@/server/queries/sales-leads';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { requirePlatformAdmin } from '@/server/security/platform-admin';

const MAX_SALES_CONSOLE_FORM_BYTES = 8 * 1024;
const MAX_ACTIVITY_METADATA_BYTES = 4 * 1024;
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
  nextFollowUpAt: z
    .string()
    .trim()
    .max(40)
    .optional()
    .nullable()
    .refine((value) => {
      if (!value) return true;
      return Number.isFinite(new Date(value).getTime());
    }, 'Invalid follow-up date.'),
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

export function assertSalesConsoleFormRequest(request: Request) {
  const contentLength = request.headers.get('content-length');
  if (!contentLength) return;

  const parsed = Number.parseInt(contentLength, 10);
  if (Number.isFinite(parsed) && parsed > MAX_SALES_CONSOLE_FORM_BYTES) {
    throw actionError('Sales Console request body is too large.');
  }
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

function boundedActivityMetadata(metadata: Record<string, unknown>) {
  const serialized = JSON.stringify(metadata);
  if (serialized.length > MAX_ACTIVITY_METADATA_BYTES) {
    throw actionError('Activity metadata is too large.');
  }

  return metadata;
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

function statusActivityBody(previousStatus: string, nextStatus: string) {
  return `Status changed from ${previousStatus} to ${nextStatus}.`;
}

async function recordLeadActivity(input: {
  leadId: string;
  actorUserId: string;
  action: LeadAction;
  type: 'note' | 'status_change' | 'follow_up';
  body: string;
  metadata?: Record<string, unknown>;
  previousValue?: Record<string, unknown> | null;
  nextValue?: Record<string, unknown> | null;
}) {
  const supabase = createAdminClient();
  const metadata = boundedActivityMetadata({
    action: input.action,
    previousValue: input.previousValue ?? null,
    nextValue: input.nextValue ?? null,
    ...(input.metadata ?? {}),
  });

  const { data, error } = await supabase
    .from('sales_lead_activities')
    .insert({
      lead_id: input.leadId,
      created_by: input.actorUserId,
      type: input.type,
      body: input.body,
      metadata,
    })
    .select('id')
    .single();

  if (error) throw actionError('Unable to record lead activity.');

  await logAuditEvent({
    organizationId: null,
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: 'sales_lead',
    entityId: input.leadId,
    metadata,
  });

  return data as { id: string };
}

export async function updateLeadStatus(request: Request, formData: FormData) {
  const payload = updateLeadStatusSchema.parse({ leadId: readFormText(formData, 'leadId'), status: readFormText(formData, 'status') });
  const user = await requireLeadOperationAccess(request, 'sales_lead.status_changed');
  const previous = await getLeadState(payload.leadId);
  const now = new Date().toISOString();
  const supabase = createAdminClient();
  const contactStatuses: SalesLeadStatus[] = ['qualified', 'demo_scheduled', 'proposal_sent', 'won', 'lost'];
  const updatePayload: Record<string, unknown> = {
    status: payload.status,
    updated_by: user.id,
    updated_at: now,
    last_activity_at: now,
  };

  if (contactStatuses.includes(payload.status)) updatePayload.last_contacted_at = now;

  const { error } = await supabase
    .from('sales_leads')
    .update(updatePayload)
    .eq('id', payload.leadId)
    .is('gdpr_deleted_at', null);

  if (error) throw actionError('Unable to update lead status.');

  await recordLeadActivity({
    leadId: payload.leadId,
    actorUserId: user.id,
    action: 'sales_lead.status_changed',
    type: 'status_change',
    body: statusActivityBody(previous.status, payload.status),
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
    type: 'follow_up',
    body: `Priority changed from ${previous.priority} to ${payload.priority}.`,
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
    type: 'follow_up',
    body: nextFollowUpAt ? `Next follow-up set to ${nextFollowUpAt}.` : 'Next follow-up cleared.',
    previousValue: { nextFollowUpAt: previous.next_follow_up_at },
    nextValue: { nextFollowUpAt },
  });
}

export async function createLeadNote(request: Request, formData: FormData) {
  const payload = createLeadNoteSchema.parse({ leadId: readFormText(formData, 'leadId'), body: readFormText(formData, 'body') });
  const user = await requireLeadOperationAccess(request, 'sales_lead.note_created');
  await getLeadState(payload.leadId);

  const activity = await recordLeadActivity({
    leadId: payload.leadId,
    actorUserId: user.id,
    action: 'sales_lead.note_created',
    type: 'note',
    body: payload.body,
  });

  const now = new Date().toISOString();
  const supabase = createAdminClient();
  await supabase
    .from('sales_leads')
    .update({ updated_by: user.id, updated_at: now, last_activity_at: now })
    .eq('id', payload.leadId)
    .is('gdpr_deleted_at', null);

  return activity;
}

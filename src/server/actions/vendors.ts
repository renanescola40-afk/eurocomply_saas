import { z } from 'zod';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { requireCurrentUser } from '@/server/queries/auth';
import { logAuditEvent } from './audit';

const vendorSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  website: z.string().url().max(500).optional().nullable(),
  country: z.string().trim().min(2).max(80).optional().nullable(),
  category: z.string().trim().min(1).max(80).optional().nullable(),
  dataAccessLevel: z.enum(['none', 'low', 'medium', 'high']).default('low'),
  riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  reviewStatus: z.enum(['pending', 'in_review', 'approved', 'rejected']).default('pending'),
  dpaSigned: z.boolean().default(false),
  lastReviewedAt: z.string().date().optional().nullable(),
  nextReviewAt: z.string().date().optional().nullable(),
});

const updateVendorSchema = vendorSchema.extend({
  vendorId: z.string().uuid(),
  expectedReviewVersion: z.number().int().positive().optional(),
});

const deleteVendorSchema = z.object({
  vendorId: z.string().uuid(),
  organizationId: z.string().uuid(),
  expectedReviewVersion: z.number().int().positive().optional(),
});

function providerActionError(message: string) {
  return new Error(message);
}

function toVendorErrorMessage(error: unknown, action: 'criar' | 'atualizar' | 'remover') {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('review_version') || message.includes('0 rows')) return 'O fornecedor foi alterado por outra pessoa. Atualize a página e tente novamente.';
  if (message.includes('check constraint') || message.includes('23514')) return 'Os dados do fornecedor não cumprem as regras de revisão e aprovação.';
  if (message.includes('permission') || message.includes('not authorized')) return `Sem permissão para ${action} fornecedores nesta organização.`;
  return `Não foi possível ${action} o fornecedor agora.`;
}

function failVendorAction(error: unknown, context: Record<string, unknown>, action: 'criar' | 'atualizar' | 'remover'): never {
  reportError(error, context);
  throw providerActionError(toVendorErrorMessage(error, action));
}

async function enforceVendorActionRateLimit(input: {
  action: 'vendor.create' | 'vendor.update' | 'vendor.delete';
  organizationId: string;
  userId: string;
}) {
  const result = await checkDistributedRateLimit({
    key: `${input.action}:${input.organizationId}:${input.userId}`,
    policy: 'general-api',
    userId: input.userId,
    organizationId: input.organizationId,
    route: `server-action:${input.action}`,
    action: input.action,
    limit: 30,
    windowMs: 60_000,
    failureMode: 'fail-closed',
  });
  if (!result.allowed) throw providerActionError('Too many vendor changes. Please try again later.');
}

function vendorRecord(payload: z.infer<typeof vendorSchema>, actorUserId: string, includeCreator: boolean) {
  const approved = payload.reviewStatus === 'approved';
  return {
    organization_id: payload.organizationId,
    name: payload.name,
    website: payload.website,
    country: payload.country,
    category: payload.category ?? 'general',
    data_access_level: payload.dataAccessLevel,
    risk_level: payload.riskLevel,
    review_status: payload.reviewStatus,
    dpa_signed: payload.dpaSigned,
    last_reviewed_at: payload.lastReviewedAt,
    next_review_at: payload.nextReviewAt,
    approved_at: approved ? new Date().toISOString() : null,
    approved_by: approved ? actorUserId : null,
    ...(includeCreator ? { created_by: actorUserId } : {}),
  };
}

const vendorColumns = 'id, organization_id, created_by, name, website, country, category, data_access_level, risk_level, review_status, dpa_signed, last_reviewed_at, next_review_at, approved_at, approved_by, review_version, created_at, updated_at';

export async function createVendor(input: unknown) {
  const user = await requireCurrentUser();
  const payload = vendorSchema.parse(input);
  const context = { area: 'vendor_create_action', organizationId: payload.organizationId, userId: user.id };
  await assertCurrentUserCan(payload.organizationId, user.id, 'vendors:write');
  await enforceVendorActionRateLimit({ action: 'vendor.create', organizationId: payload.organizationId, userId: user.id });

  const supabase = createAdminClient();
  const { data, error } = await supabase.from('vendors').insert(vendorRecord(payload, user.id, true)).select(vendorColumns).single();
  if (error) failVendorAction(error, context, 'criar');

  const audit = await logAuditEvent({ organizationId: payload.organizationId, actorUserId: user.id, action: 'vendor.create', entityType: 'vendor', entityId: data.id, metadata: { riskLevel: payload.riskLevel, reviewStatus: payload.reviewStatus } });
  if (!audit.persisted) {
    await supabase.from('vendors').delete().eq('id', data.id).eq('organization_id', payload.organizationId);
    throw providerActionError('Não foi possível criar o fornecedor agora.');
  }
  return data;
}

export async function updateVendor(input: unknown) {
  const user = await requireCurrentUser();
  const payload = updateVendorSchema.parse(input);
  const context = { area: 'vendor_update_action', organizationId: payload.organizationId, vendorId: payload.vendorId, userId: user.id };
  await assertCurrentUserCan(payload.organizationId, user.id, 'vendors:write');
  await enforceVendorActionRateLimit({ action: 'vendor.update', organizationId: payload.organizationId, userId: user.id });

  const supabase = createAdminClient();
  let query = supabase.from('vendors').update(vendorRecord(payload, user.id, false)).eq('id', payload.vendorId).eq('organization_id', payload.organizationId);
  if (payload.expectedReviewVersion) query = query.eq('review_version', payload.expectedReviewVersion);
  const { data, error } = await query.select(vendorColumns).single();
  if (error) failVendorAction(error, context, 'atualizar');

  const audit = await logAuditEvent({ organizationId: payload.organizationId, actorUserId: user.id, action: 'vendor.update', entityType: 'vendor', entityId: payload.vendorId, metadata: { riskLevel: payload.riskLevel, reviewStatus: payload.reviewStatus, reviewVersion: data.review_version } });
  if (!audit.persisted) throw providerActionError('A atualização foi registada, mas a evidência de auditoria não pôde ser confirmada.');
  return data;
}

export async function deleteVendor(vendorId: string, organizationId: string, expectedReviewVersion?: number) {
  const user = await requireCurrentUser();
  const payload = deleteVendorSchema.parse({ vendorId, organizationId, expectedReviewVersion });
  const context = { area: 'vendor_delete_action', organizationId: payload.organizationId, vendorId: payload.vendorId, userId: user.id };
  await assertCurrentUserCan(payload.organizationId, user.id, 'vendors:delete');
  await enforceVendorActionRateLimit({ action: 'vendor.delete', organizationId: payload.organizationId, userId: user.id });

  const supabase = createAdminClient();
  let query = supabase.from('vendors').delete().eq('id', payload.vendorId).eq('organization_id', payload.organizationId);
  if (payload.expectedReviewVersion) query = query.eq('review_version', payload.expectedReviewVersion);
  const { data, error } = await query.select(vendorColumns).single();
  if (error) failVendorAction(error, context, 'remover');

  const audit = await logAuditEvent({ organizationId: payload.organizationId, actorUserId: user.id, action: 'vendor.delete', entityType: 'vendor', entityId: payload.vendorId, metadata: { riskLevel: data.risk_level, reviewVersion: data.review_version } });
  if (!audit.persisted) throw providerActionError('A remoção foi registada, mas a evidência de auditoria não pôde ser confirmada.');
  return data;
}

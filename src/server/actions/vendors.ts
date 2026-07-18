import { z } from 'zod';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { requireCurrentUser } from '@/server/queries/auth';
import { logAuditEvent } from './audit';

const vendorSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(2).max(160),
  website: z.string().url().optional().nullable(),
  country: z.string().min(2).max(80).optional().nullable(),
  category: z.string().max(80).optional().nullable(),
  dataAccessLevel: z.enum(['none', 'low', 'medium', 'high']).default('low'),
  riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  reviewStatus: z.enum(['pending', 'in_review', 'approved', 'rejected']).default('pending'),
  dpaSigned: z.boolean().default(false),
});

const updateVendorSchema = vendorSchema.extend({
  vendorId: z.string().uuid(),
});

const deleteVendorSchema = z.object({
  vendorId: z.string().uuid(),
  organizationId: z.string().uuid(),
});

type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function providerActionError(message: string) {
  return new Error(message);
}

function isMissingOptionalVendorColumn(error: SupabaseLikeError | null | undefined) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ').toLowerCase();

  return (
    error?.code === '42703' ||
    text.includes('data_access_level') ||
    text.includes('dpa_signed') ||
    text.includes('created_by') ||
    text.includes('schema cache')
  );
}

function toVendorErrorMessage(error: SupabaseLikeError | Error | unknown, action: 'criar' | 'atualizar' | 'remover') {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error ? String((error as SupabaseLikeError).message ?? '') : '';
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('vendors') && (lowerMessage.includes('does not exist') || lowerMessage.includes('schema cache'))) {
    return 'A tabela de vendors ainda não está atualizada no Supabase. Aplique a migration de vendors antes de guardar fornecedores.';
  }

  if (lowerMessage.includes('invalid input syntax') || lowerMessage.includes('check constraint')) {
    return 'Os dados do fornecedor não passaram na validação do banco. Verifique país, categoria, risco e acesso a dados.';
  }

  if (lowerMessage.includes('permission') || lowerMessage.includes('not authorized')) {
    return `Sem permissão para ${action} fornecedores nesta organização.`;
  }

  return `Não foi possível ${action} o fornecedor agora.`;
}

function failVendorAction(error: unknown, context: Record<string, unknown>, action: 'criar' | 'atualizar' | 'remover'): never {
  reportError(error, context);
  throw providerActionError(toVendorErrorMessage(error, action));
}

function toBaseVendorRecord(payload: z.infer<typeof vendorSchema>) {
  return {
    organization_id: payload.organizationId,
    name: payload.name,
    website: payload.website,
    country: payload.country,
    category: payload.category,
    risk_level: payload.riskLevel,
    review_status: payload.reviewStatus,
  };
}

function toFullVendorRecord(payload: z.infer<typeof vendorSchema>, userId: string) {
  return {
    ...toBaseVendorRecord(payload),
    data_access_level: payload.dataAccessLevel,
    dpa_signed: payload.dpaSigned,
    created_by: userId,
  };
}

async function enforceVendorActionRateLimit(input: {
  action: 'vendor.create' | 'vendor.update' | 'vendor.delete';
  organizationId: string;
  userId: string;
}) {
  const rateLimit = await checkDistributedRateLimit({
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

  if (!rateLimit.allowed) {
    throw providerActionError('Too many vendor changes. Please try again later.');
  }
}

export async function createVendor(input: unknown) {
  const user = await requireCurrentUser();
  const payload = vendorSchema.parse(input);
  const context = { area: 'vendor_create_action', organizationId: payload.organizationId, userId: user.id };

  await assertCurrentUserCan(payload.organizationId, user.id, 'vendors:write');
  await enforceVendorActionRateLimit({ action: 'vendor.create', organizationId: payload.organizationId, userId: user.id });

  const supabase = createAdminClient();
  const baseRecord = toBaseVendorRecord(payload);
  const fullRecord = toFullVendorRecord(payload, user.id);
  const insertVendor = async (record: typeof baseRecord | typeof fullRecord) =>
    supabase.from('vendors').insert(record).select('*').single();

  let { data, error } = await insertVendor(fullRecord);

  if (error && isMissingOptionalVendorColumn(error)) {
    console.warn('[vendors] legacy_schema_fallback', { code: error.code ?? 'unknown' });
    const fallbackResult = await insertVendor(baseRecord);
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) failVendorAction(error, context, 'criar');

  const audit = await logAuditEvent({
    organizationId: payload.organizationId,
    actorUserId: user.id,
    action: 'vendor.create',
    entityType: 'vendor',
    entityId: data.id,
    metadata: { name: payload.name, riskLevel: payload.riskLevel },
  });

  if (!audit.persisted) {
    const { error: rollbackError } = await supabase
      .from('vendors')
      .delete()
      .eq('id', data.id)
      .eq('organization_id', payload.organizationId);

    if (rollbackError) {
      reportError(new Error('vendor_create_audit_compensation_failed'), {
        ...context,
        vendorId: data.id,
        providerCode: rollbackError.code ?? 'unknown',
      });
    }

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
  const { data: previous, error: previousError } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', payload.vendorId)
    .eq('organization_id', payload.organizationId)
    .single();

  if (previousError) failVendorAction(previousError, context, 'atualizar');

  const baseRecord = toBaseVendorRecord(payload);
  const fullRecord = {
    ...baseRecord,
    data_access_level: payload.dataAccessLevel,
    dpa_signed: payload.dpaSigned,
  };

  const updateVendorRecord = async (record: typeof baseRecord | typeof fullRecord) =>
    supabase.from('vendors').update(record).eq('id', payload.vendorId).eq('organization_id', payload.organizationId).select('*').single();

  let { data, error } = await updateVendorRecord(fullRecord);

  if (error && isMissingOptionalVendorColumn(error)) {
    console.warn('[vendors] legacy_schema_fallback', { code: error.code ?? 'unknown' });
    const fallbackResult = await updateVendorRecord(baseRecord);
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) failVendorAction(error, context, 'atualizar');

  const audit = await logAuditEvent({
    organizationId: payload.organizationId,
    actorUserId: user.id,
    action: 'vendor.update',
    entityType: 'vendor',
    entityId: payload.vendorId,
    metadata: {
      name: payload.name,
      riskLevel: payload.riskLevel,
      reviewStatus: payload.reviewStatus,
    },
  });

  if (!audit.persisted) {
    const { error: rollbackError } = await supabase
      .from('vendors')
      .update(previous)
      .eq('id', payload.vendorId)
      .eq('organization_id', payload.organizationId)
      .eq('name', data.name)
      .eq('risk_level', data.risk_level)
      .eq('review_status', data.review_status);

    if (rollbackError) {
      reportError(new Error('vendor_update_audit_compensation_failed'), {
        ...context,
        providerCode: rollbackError.code ?? 'unknown',
      });
    }

    throw providerActionError('Não foi possível atualizar o fornecedor agora.');
  }

  return data;
}

export async function deleteVendor(vendorId: string, organizationId: string) {
  const user = await requireCurrentUser();
  const payload = deleteVendorSchema.parse({ vendorId, organizationId });
  const context = { area: 'vendor_delete_action', organizationId: payload.organizationId, vendorId: payload.vendorId, userId: user.id };

  await assertCurrentUserCan(payload.organizationId, user.id, 'vendors:delete');
  await enforceVendorActionRateLimit({ action: 'vendor.delete', organizationId: payload.organizationId, userId: user.id });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('vendors')
    .delete()
    .eq('id', payload.vendorId)
    .eq('organization_id', payload.organizationId)
    .select('id,name,risk_level')
    .single();

  if (error) failVendorAction(error, context, 'remover');

  await logAuditEvent({
    organizationId: payload.organizationId,
    actorUserId: user.id,
    action: 'vendor.delete',
    entityType: 'vendor',
    entityId: payload.vendorId,
    metadata: { name: data.name, riskLevel: data.risk_level },
  });

  return data;
}

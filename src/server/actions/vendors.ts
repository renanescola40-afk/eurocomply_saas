import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertCurrentUserCan } from '@/server/auth/permissions';
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

type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

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

function toVendorErrorMessage(error: SupabaseLikeError | Error | unknown, action: 'criar' | 'atualizar') {
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

  return message || `Não foi possível ${action} o fornecedor agora.`;
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

export async function createVendor(input: unknown, userId: string) {
  const payload = vendorSchema.parse(input);
  await assertCurrentUserCan(payload.organizationId, userId, 'vendors:write');

  const supabase = createAdminClient();
  const baseRecord = toBaseVendorRecord(payload);
  const fullRecord = toFullVendorRecord(payload, userId);

  const insertVendor = async (record: typeof baseRecord | typeof fullRecord) =>
    supabase
      .from('vendors')
      .insert(record)
      .select('*')
      .single();

  let { data, error } = await insertVendor(fullRecord);

  if (error && isMissingOptionalVendorColumn(error)) {
    console.warn('[vendors] legacy_schema_fallback', { code: error.code ?? 'unknown' });
    const fallbackResult = await insertVendor(baseRecord);
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    throw new Error(toVendorErrorMessage(error, 'criar'));
  }

  await logAuditEvent({
    organizationId: payload.organizationId,
    actorUserId: userId,
    action: 'vendor.create',
    entityType: 'vendor',
    entityId: data.id,
    metadata: { name: payload.name, riskLevel: payload.riskLevel },
  });

  return data;
}

export async function updateVendor(input: unknown, userId: string) {
  const payload = updateVendorSchema.parse(input);
  await assertCurrentUserCan(payload.organizationId, userId, 'vendors:write');

  const supabase = createAdminClient();
  const baseRecord = toBaseVendorRecord(payload);
  const fullRecord = {
    ...baseRecord,
    data_access_level: payload.dataAccessLevel,
    dpa_signed: payload.dpaSigned,
  };

  const updateVendorRecord = async (record: typeof baseRecord | typeof fullRecord) =>
    supabase
      .from('vendors')
      .update(record)
      .eq('id', payload.vendorId)
      .eq('organization_id', payload.organizationId)
      .select('*')
      .single();

  let { data, error } = await updateVendorRecord(fullRecord);

  if (error && isMissingOptionalVendorColumn(error)) {
    console.warn('[vendors] legacy_schema_fallback', { code: error.code ?? 'unknown' });
    const fallbackResult = await updateVendorRecord(baseRecord);
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    throw new Error(toVendorErrorMessage(error, 'atualizar'));
  }

  await logAuditEvent({
    organizationId: payload.organizationId,
    actorUserId: userId,
    action: 'vendor.update',
    entityType: 'vendor',
    entityId: payload.vendorId,
    metadata: {
      name: payload.name,
      riskLevel: payload.riskLevel,
      reviewStatus: payload.reviewStatus,
    },
  });

  return data;
}

export async function deleteVendor(vendorId: string, organizationId: string, userId: string) {
  await assertCurrentUserCan(organizationId, userId, 'vendors:delete');

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('vendors')
    .delete()
    .eq('id', vendorId)
    .eq('organization_id', organizationId)
    .select('id,name,risk_level')
    .single();

  if (error) throw error;

  await logAuditEvent({
    organizationId,
    actorUserId: userId,
    action: 'vendor.delete',
    entityType: 'vendor',
    entityId: vendorId,
    metadata: { name: data.name, riskLevel: data.risk_level },
  });

  return data;
}

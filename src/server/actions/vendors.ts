import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
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

export async function createVendor(input: unknown, userId: string) {
  const payload = vendorSchema.parse(input);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('vendors')
    .insert({
      organization_id: payload.organizationId,
      name: payload.name,
      website: payload.website,
      country: payload.country,
      category: payload.category,
      data_access_level: payload.dataAccessLevel,
      risk_level: payload.riskLevel,
      review_status: payload.reviewStatus,
      dpa_signed: payload.dpaSigned,
      created_by: userId,
    })
    .select('*')
    .single();

  if (error) throw error;

  await logAuditEvent({
    organizationId: payload.organizationId,
    actorUserId: userId,
    action: 'vendor.created',
    entityType: 'vendor',
    entityId: data.id,
    metadata: { name: payload.name, riskLevel: payload.riskLevel },
  });

  return data;
}

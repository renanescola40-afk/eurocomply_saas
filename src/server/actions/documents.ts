import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';

const createDocumentSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(2).max(160),
  category: z.string().min(2).max(80).default('general'),
  storagePath: z.string().min(2).max(500),
  mimeType: z.string().max(120).optional().nullable(),
  sizeBytes: z.number().int().nonnegative().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export type CreateDocumentInput = z.input<typeof createDocumentSchema>;

export async function createDocument(input: CreateDocumentInput, userId: string) {
  const payload = createDocumentSchema.parse(input);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('documents')
    .insert({
      organization_id: payload.organizationId,
      uploaded_by: userId,
      name: payload.name,
      category: payload.category,
      storage_path: payload.storagePath,
      mime_type: payload.mimeType ?? null,
      size_bytes: payload.sizeBytes ?? null,
      expires_at: payload.expiresAt ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;

  await logAuditEvent({
    organizationId: payload.organizationId,
    actorUserId: userId,
    action: 'document.created',
    entityType: 'document',
    entityId: data.id,
    metadata: { name: payload.name, category: payload.category },
  });

  return data;
}

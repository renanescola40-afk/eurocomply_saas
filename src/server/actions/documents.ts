import { z } from 'zod';
import { DOCUMENT_BUCKET, buildDocumentStoragePath, validateDocumentFile } from '@/lib/documents/upload';
import { reportError } from '@/lib/observability/report-error';
import { checkRateLimit } from '@/lib/security/rate-limit';
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

const uploadDocumentSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(2).max(160),
  category: z.string().min(2).max(80).default('general'),
  expiresAt: z.string().optional().nullable(),
});

export type CreateDocumentInput = z.input<typeof createDocumentSchema>;
export type UploadDocumentInput = z.input<typeof uploadDocumentSchema>;

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

export async function uploadDocument(input: UploadDocumentInput, file: File, userId: string) {
  const payload = uploadDocumentSchema.parse(input);
  const context = { area: 'document_upload', organizationId: payload.organizationId, userId };
  const rateLimit = checkRateLimit({
    key: `document_upload:${payload.organizationId}:${userId}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    const error = new Error('Too many document uploads. Please try again later.');
    reportError(error, context);
    throw error;
  }

  const validationError = validateDocumentFile(file);

  if (validationError) {
    const error = new Error(validationError);
    reportError(error, { ...context, fileType: file.type, fileSize: file.size });
    throw error;
  }

  const supabase = createAdminClient();
  const storagePath = buildDocumentStoragePath({
    organizationId: payload.organizationId,
    userId,
    fileName: file.name,
  });

  const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    reportError(uploadError, { ...context, fileType: file.type, fileSize: file.size });
    throw uploadError;
  }

  try {
    return await createDocument(
      {
        organizationId: payload.organizationId,
        name: payload.name,
        category: payload.category,
        storagePath,
        mimeType: file.type,
        sizeBytes: file.size,
        expiresAt: payload.expiresAt ?? null,
      },
      userId,
    );
  } catch (error) {
    reportError(error, { ...context, fileType: file.type, fileSize: file.size });
    await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    throw error;
  }
}

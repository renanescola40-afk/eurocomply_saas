import { NextRequest } from 'next/server';
import { createHash, randomUUID } from 'crypto';

import { createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { getCurrentUser } from '@/server/queries/auth';
import { createNotification } from '@/server/queries/notifications';
import { assertDocumentQuota } from '@/server/billing/entitlements';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
import { validateUploadFileSignature } from '@/server/security/file-signature';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const STORAGE_BUCKET = 'controlled-documents';

const ALLOWED_TYPES = new Map([
  ['application/pdf', 'pdf'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
]);

function safeDocumentTitle(name: string) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[^\p{L}\p{N}\s._-]/gu, '')
    .trim()
    .slice(0, 120) || 'Controlled document';
}

export async function POST(request: NextRequest) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'Authentication required.' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return noStoreJson({ error: 'Organization access required.' }, { status: 403 });
  }

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'manage_documents',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const quota = await assertDocumentQuota(organization.id);

  if (!quota.ok) {
    return noStoreJson(
      {
        error: quota.error,
        message: quota.message,
        plan: quota.entitlements.plan,
        currentCount: quota.currentCount,
      },
      { status: quota.status },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return noStoreJson({ error: 'Invalid upload request.' }, { status: 400 });
  }

  const file = formData.get('file');

  if (!(file instanceof File)) {
    return noStoreJson({ error: 'File is required.' }, { status: 400 });
  }

  const extension = ALLOWED_TYPES.get(file.type);

  if (!extension) {
    return noStoreJson({ error: 'Unsupported file type. Use PDF, DOCX, XLSX, PNG or JPG.' }, { status: 415 });
  }

  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return noStoreJson({ error: 'File must be between 1 byte and 10 MB.' }, { status: 413 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!validateUploadFileSignature(file.type, buffer)) {
    await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'document_upload_rejected',
      entityType: 'document',
      entityId: organization.id,
      metadata: {
        reason: 'signature_mismatch',
        claimedMimeType: file.type,
        sizeBytes: file.size,
        actorRole: permission.role,
      },
    });

    return noStoreJson({ error: 'File signature does not match the declared file type.' }, { status: 415 });
  }

  const checksum = createHash('sha256').update(buffer).digest('hex');
  const storagePath = `${organization.id}/${randomUUID()}.${extension}`;
  const title = safeDocumentTitle(file.name);
  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return noStoreJson({ error: 'Secure document storage is not configured.' }, { status: 503 });
  }

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.warn('[documents] upload_failed', { code: uploadError.message ? 'storage_error' : 'unknown' });

    return noStoreJson({ error: 'Unable to store document securely.' }, { status: 500 });
  }

  const { data: document, error: documentError } = await supabase
    .from('documents')
    .insert({
      organization_id: organization.id,
      title,
      status: 'pending',
      version: 'v1',
      storage_path: storagePath,
      checksum_sha256: checksum,
    })
    .select('id,title,status,version,created_at')
    .single();

  if (documentError) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    console.warn('[documents] metadata_create_failed', { code: documentError.code ?? 'unknown' });

    return noStoreJson({ error: 'Unable to register document metadata.' }, { status: 500 });
  }

  await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: 'document_uploaded',
    entityType: 'document',
    entityId: document?.id,
    metadata: {
      title,
      mimeType: file.type,
      sizeBytes: file.size,
      checksumSha256: checksum,
      plan: quota.entitlements.plan,
      actorRole: permission.role,
      documentCountBeforeUpload: quota.currentCount,
    },
  });

  await createNotification({
    organizationId: organization.id,
    userId: user.id,
    type: 'document',
    message: `Documento ${title} carregado para revisão.`,
  });

  return noStoreJson({
    document,
    checksum,
    plan: quota.entitlements.plan,
    remainingDocuments: Number.isFinite(quota.entitlements.maxDocuments)
      ? Math.max(quota.entitlements.maxDocuments - quota.currentCount - 1, 0)
      : null,
  });
}

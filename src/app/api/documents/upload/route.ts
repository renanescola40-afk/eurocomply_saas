import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';

import { createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { getCurrentUser } from '@/server/queries/auth';
import { createNotification } from '@/server/queries/notifications';
import { assertDocumentQuota } from '@/server/billing/entitlements';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

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
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return NextResponse.json({ error: 'Organization access required.' }, { status: 403 });
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
    return NextResponse.json(
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
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  }

  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required.' }, { status: 400 });
  }

  const extension = ALLOWED_TYPES.get(file.type);

  if (!extension) {
    return NextResponse.json({ error: 'Unsupported file type. Use PDF, DOCX, XLSX, PNG or JPG.' }, { status: 415 });
  }

  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File must be between 1 byte and 10 MB.' }, { status: 413 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const checksum = createHash('sha256').update(buffer).digest('hex');
  const storagePath = `${organization.id}/${randomUUID()}.${extension}`;
  const title = safeDocumentTitle(file.name);
  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: 'Secure document storage is not configured.' }, { status: 503 });
  }

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.warn('[documents] upload_failed', { code: uploadError.message ? 'storage_error' : 'unknown' });

    return NextResponse.json({ error: 'Unable to store document securely.' }, { status: 500 });
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

    return NextResponse.json({ error: 'Unable to register document metadata.' }, { status: 500 });
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

  return NextResponse.json({
    document,
    checksum,
    plan: quota.entitlements.plan,
    remainingDocuments: Number.isFinite(quota.entitlements.maxDocuments)
      ? Math.max(quota.entitlements.maxDocuments - quota.currentCount - 1, 0)
      : null,
  });
}

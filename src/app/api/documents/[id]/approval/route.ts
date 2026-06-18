import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentUser } from '@/server/queries/auth';
import { createNotification } from '@/server/queries/notifications';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const allowedActions = new Set(['approve', 'reject']);
const APPROVAL_JSON_MAX_BYTES = 8 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return noStoreJson({ error: 'Organization not found' }, { status: 404 });
  }

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'manage_documents',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  const rateLimit = await checkDistributedRateLimit({
    key: `documents:approval:${organization.id}:${user.id}`,
    limit: 30,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const { id } = await params;
  const body = await readBoundedJsonRequest<Record<string, unknown>>(request, {
    maxBytes: APPROVAL_JSON_MAX_BYTES,
  }).catch(() => null);
  const action = typeof body?.action === 'string' ? body.action : undefined;

  if (!action || !allowedActions.has(action)) {
    return noStoreJson({ error: 'Invalid approval action' }, { status: 400 });
  }

  const supabase = tryCreateAdminClient();
  const nextStatus = action === 'approve' ? 'approved' : 'rejected';
  let persisted = false;
  let documentTitle = 'Controlled document';

  if (supabase && !id.startsWith('ap-') && !id.startsWith('demo-')) {
    const { data, error } = await supabase
      .from('documents')
      .update({ status: nextStatus })
      .eq('id', id)
      .eq('organization_id', organization.id)
      .select('id,title,status,organization_id')
      .single();

    if (error) {
      if (!['42P01', '42703', 'PGRST116'].includes(error.code ?? '')) {
        console.warn('[documents] approval_update_failed', { code: error.code ?? 'unknown' });
      }
    } else if (data && data.organization_id === organization.id) {
      persisted = true;
      documentTitle = data.title ?? documentTitle;
    }
  }

  const audit = await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: action === 'approve' ? 'document_approved' : 'document_rejected',
    entityType: 'document',
    entityId: persisted ? id : undefined,
    metadata: {
      documentId: id,
      documentTitle,
      note: typeof body?.note === 'string' ? body.note.slice(0, 300) : null,
      persisted,
      actorRole: permission.role,
    },
  });

  const notification = await createNotification({
    organizationId: organization.id,
    userId: user.id,
    type: 'approval',
    message: action === 'approve'
      ? `Documento ${documentTitle} aprovado.`
      : `Documento ${documentTitle} rejeitado para revisão.`,
  });

  return noStoreJson({
    documentId: id,
    status: nextStatus,
    persisted,
    auditPersisted: audit.persisted,
    notificationPersisted: notification.persisted,
  });
}

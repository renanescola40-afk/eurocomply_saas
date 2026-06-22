import { readBoundedJsonRequest } from '@/lib/security/validate';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { createAuditEvent } from '@/server/queries/audit-events';
import { createNotification } from '@/server/queries/notifications';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import {
  requireApiUser,
  requirePermission,
  requireTrustedMutation,
  secureApiError,
} from '@/server/security/api-guards';

const allowedActions = new Set(['approve', 'reject']);
const APPROVAL_JSON_MAX_BYTES = 8 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);

    if (!organization) {
      return noStoreJson({ error: 'organization_required' }, { status: 403 });
    }

    const permission = await requirePermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_documents',
    });

    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `documents:approval:${organization.id}:${user.id}`,
        limit: 30,
        windowMs: 60 * 1000,
      },
    });

    if (mutationDenied) return mutationDenied;

    const { id } = await params;
    const body = await readBoundedJsonRequest<Record<string, unknown>>(request, {
      maxBytes: APPROVAL_JSON_MAX_BYTES,
    }).catch(() => null);
    const action = typeof body?.action === 'string' ? body.action : undefined;

    if (!action || !allowedActions.has(action)) {
      return noStoreJson({ error: 'invalid_approval_action' }, { status: 400 });
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
      message:
        action === 'approve'
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
  } catch (error) {
    return secureApiError(error);
  }
}

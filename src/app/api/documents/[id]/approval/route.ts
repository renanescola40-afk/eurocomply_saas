import { z } from 'zod';

import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { createAuditEvent } from '@/server/queries/audit-events';
import { createNotification } from '@/server/queries/notifications';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import {
  assertApiResourceOrganization,
  parseJsonBodyWithZod,
  requireApiUser,
  requirePermission,
  requireTrustedMutation,
  secureApiError,
} from '@/server/security/api-guards';

const APPROVAL_JSON_MAX_BYTES = 8 * 1024;
const documentIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(96)
  .refine((value) => !value.includes('/') && !value.includes('\\') && !value.includes('..'), 'Unsafe document id');

const approvalBodySchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().trim().max(300).nullable().optional(),
});

type DocumentApprovalRow = {
  id: string;
  organization_id: string;
  name: string | null;
  status: string | null;
};

function documentTitle(document: Pick<DocumentApprovalRow, 'name'> | null | undefined) {
  return document?.name?.trim() || 'Controlled document';
}

async function auditApprovalDenied(input: {
  organizationId: string;
  actorUserId: string;
  documentId: string;
  reason: string;
  actorRole?: string | null;
}) {
  await createAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: 'document_approval_denied',
    entityType: 'document',
    entityId: input.documentId,
    metadata: {
      documentId: input.documentId,
      reason: input.reason,
      actorRole: input.actorRole ?? 'unknown',
    },
  });
}

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

    const { id: rawId } = await params;
    const id = documentIdSchema.parse(rawId);
    const body = await parseJsonBodyWithZod(request, {
      schema: approvalBodySchema,
      maxBytes: APPROVAL_JSON_MAX_BYTES,
    });

    const supabase = tryCreateAdminClient();

    if (!supabase) {
      return noStoreJson({ error: 'document_storage_unavailable' }, { status: 503 });
    }

    const { data: existingDocument, error: fetchError } = await supabase
      .from('documents')
      .select('id,organization_id,name,status')
      .eq('id', id)
      .eq('organization_id', organization.id)
      .maybeSingle<DocumentApprovalRow>();

    if (fetchError) {
      console.warn('[documents] approval_lookup_failed', { code: fetchError.code ?? 'unknown' });
      return noStoreJson({ error: 'document_lookup_failed' }, { status: 500 });
    }

    if (!existingDocument) {
      await auditApprovalDenied({
        organizationId: organization.id,
        actorUserId: user.id,
        documentId: id,
        reason: 'document_not_found',
        actorRole: permission.role,
      });
      return noStoreJson({ error: 'document_not_found' }, { status: 404 });
    }

    try {
      assertApiResourceOrganization(existingDocument.organization_id, organization.id);
    } catch (error) {
      await auditApprovalDenied({
        organizationId: organization.id,
        actorUserId: user.id,
        documentId: id,
        reason: 'document_wrong_organization',
        actorRole: permission.role,
      });
      throw error;
    }

    const nextStatus = body.action === 'approve' ? 'approved' : 'rejected';

    if (existingDocument.status === nextStatus) {
      await auditApprovalDenied({
        organizationId: organization.id,
        actorUserId: user.id,
        documentId: id,
        reason: 'document_state_unchanged',
        actorRole: permission.role,
      });
      return noStoreJson({ error: 'document_state_unchanged' }, { status: 409 });
    }

    const title = documentTitle(existingDocument);
    let approvalUpdate = supabase
      .from('documents')
      .update({ status: nextStatus })
      .eq('id', id)
      .eq('organization_id', organization.id);

    approvalUpdate =
      existingDocument.status === null
        ? approvalUpdate.is('status', null)
        : approvalUpdate.eq('status', existingDocument.status);

    const { data: updatedDocument, error: updateError } = await approvalUpdate
      .select('id,name,status,organization_id')
      .maybeSingle<DocumentApprovalRow>();

    if (updateError) {
      console.warn('[documents] approval_update_failed', { code: updateError.code ?? 'unknown' });
      return noStoreJson({ error: 'document_approval_failed' }, { status: 500 });
    }

    if (!updatedDocument) {
      await auditApprovalDenied({
        organizationId: organization.id,
        actorUserId: user.id,
        documentId: id,
        reason: 'document_state_changed',
        actorRole: permission.role,
      });
      return noStoreJson({ error: 'document_state_changed' }, { status: 409 });
    }

    const audit = await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: body.action === 'approve' ? 'document_approved' : 'document_rejected',
      entityType: 'document',
      entityId: updatedDocument.id,
      metadata: {
        documentId: updatedDocument.id,
        documentTitle: title,
        note: body.note ?? null,
        persisted: true,
        actorRole: permission.role,
      },
    });

    const notification = await createNotification({
      organizationId: organization.id,
      userId: user.id,
      type: 'approval',
      message:
        body.action === 'approve'
          ? `Documento ${title} aprovado.`
          : `Documento ${title} rejeitado para revisão.`,
    });

    return noStoreJson({
      documentId: updatedDocument.id,
      status: nextStatus,
      persisted: true,
      auditPersisted: audit.persisted,
      notificationPersisted: notification.persisted,
    });
  } catch (error) {
    return secureApiError(error);
  }
}

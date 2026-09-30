import { z } from 'zod';

import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { createAuditEvent } from '@/server/queries/audit-events';
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

const RACI_JSON_MAX_BYTES = 4 * 1024;
const documentIdSchema = z
  .string()
  .trim()
  .uuid();
const roleSchema = z.enum(['R', 'A', 'C', 'I']);
const raciBodySchema = z.object({
  legal: roleSchema,
  security: roleSchema,
  compliance: roleSchema,
  finance: roleSchema,
});

type DocumentRaciRow = {
  id: string;
  organization_id: string;
  name: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string | null;
};

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    const [permission, entitlements] = await Promise.all([
      requirePermission({
        userId: user.id,
        organizationId: organization.id,
        permission: 'manage_documents',
      }),
      getOrganizationEntitlements(organization.id),
    ]);

    if (!entitlements.approvalWorkflows) {
      return noStoreJson({ error: 'business_plan_required' }, { status: 403 });
    }

    const mutationDenied = await requireTrustedMutation(request, {
      rateLimit: {
        key: `documents:raci:${organization.id}:${user.id}`,
        limit: 60,
        windowMs: 60 * 1000,
      },
    });
    if (mutationDenied) return mutationDenied;

    const { id: rawId } = await params;
    const id = documentIdSchema.parse(rawId);
    const raci = await parseJsonBodyWithZod(request, {
      schema: raciBodySchema,
      maxBytes: RACI_JSON_MAX_BYTES,
    });

    const supabase = tryCreateAdminClient();
    if (!supabase) return noStoreJson({ error: 'document_storage_unavailable' }, { status: 503 });

    const { data: existingDocument, error: fetchError } = await supabase
      .from('documents')
      .select('id,organization_id,name,metadata,updated_at')
      .eq('id', id)
      .eq('organization_id', organization.id)
      .maybeSingle<DocumentRaciRow>();

    if (fetchError) {
      console.warn('[raci] document_lookup_failed', { code: fetchError.code ?? 'unknown' });
      return noStoreJson({ error: 'document_lookup_failed' }, { status: 500 });
    }
    if (!existingDocument) return noStoreJson({ error: 'document_not_found' }, { status: 404 });

    assertApiResourceOrganization(existingDocument.organization_id, organization.id);

    const previousMetadata = existingDocument.metadata && typeof existingDocument.metadata === 'object'
      ? existingDocument.metadata
      : {};
    const nextMetadata = {
      ...previousMetadata,
      raci: {
        ...raci,
        updatedAt: new Date().toISOString(),
        updatedBy: user.id,
      },
    };

    let updateQuery = supabase
      .from('documents')
      .update({ metadata: nextMetadata })
      .eq('id', existingDocument.id)
      .eq('organization_id', organization.id);

    updateQuery = existingDocument.updated_at
      ? updateQuery.eq('updated_at', existingDocument.updated_at)
      : updateQuery.is('updated_at', null);

    const { data: updatedDocument, error: updateError } = await updateQuery
      .select('id,organization_id,name,metadata,updated_at')
      .maybeSingle<DocumentRaciRow>();

    if (updateError) {
      console.warn('[raci] update_failed', { code: updateError.code ?? 'unknown' });
      return noStoreJson({ error: 'raci_update_failed' }, { status: 500 });
    }
    if (!updatedDocument) return noStoreJson({ error: 'document_state_changed' }, { status: 409 });

    const audit = await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'document_raci_updated',
      entityType: 'document',
      entityId: updatedDocument.id,
      metadata: {
        documentId: updatedDocument.id,
        documentTitle: updatedDocument.name?.trim() || 'Controlled document',
        raci,
        actorRole: permission.role,
        persisted: true,
      },
    });

    if (!audit.persisted) {
      let rollbackQuery = supabase
        .from('documents')
        .update({ metadata: previousMetadata })
        .eq('id', updatedDocument.id)
        .eq('organization_id', organization.id);

      rollbackQuery = updatedDocument.updated_at
        ? rollbackQuery.eq('updated_at', updatedDocument.updated_at)
        : rollbackQuery.is('updated_at', null);

      const { data: rolledBack, error: rollbackError } = await rollbackQuery
        .select('id')
        .maybeSingle<{ id: string }>();

      if (rollbackError || !rolledBack) {
        console.warn('[raci] audit_rollback_failed', { code: rollbackError?.code ?? 'state_changed' });
      }
      return noStoreJson({ error: 'raci_audit_unavailable' }, { status: 503 });
    }

    return noStoreJson({
      documentId: updatedDocument.id,
      raci,
      persisted: true,
      auditPersisted: true,
    });
  } catch (error) {
    return secureApiError(error);
  }
}

import { NextResponse } from 'next/server';

import { createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentUser } from '@/server/queries/auth';
import { createNotification } from '@/server/queries/notifications';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { tryCreateAdminClient } from '@/lib/supabase/admin';

const allowedActions = new Set(['approve', 'reject']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null) as { action?: string; note?: string } | null;
  const action = body?.action;

  if (!action || !allowedActions.has(action)) {
    return NextResponse.json({ error: 'Invalid approval action' }, { status: 400 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
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
      .select('id,title,status')
      .single();

    if (error) {
      if (!['42P01', '42703', 'PGRST116'].includes(error.code ?? '')) {
        console.warn('[documents] approval_update_failed', { code: error.code ?? 'unknown' });
      }
    } else if (data) {
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
      note: body?.note?.slice(0, 300) ?? null,
      persisted,
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

  return NextResponse.json({
    documentId: id,
    status: nextStatus,
    persisted,
    auditPersisted: audit.persisted,
    notificationPersisted: notification.persisted,
  });
}

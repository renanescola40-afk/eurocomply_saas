import { NextResponse } from 'next/server';
import { assertGdprSelfServiceEnabled } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { listDocuments } from '@/server/queries/documents';
import { listAuditEventsForUser, listNotificationsForUser } from '@/server/queries/compliance-activity';
import { createAuditEvent } from '@/server/queries/audit-events';
import { createNotification } from '@/server/queries/notifications';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const entitlementCheck = await assertGdprSelfServiceEnabled(organization.id);

  if (!entitlementCheck.ok) {
    return NextResponse.json(
      {
        error: entitlementCheck.error,
        message: entitlementCheck.message,
        plan: entitlementCheck.entitlements.plan,
      },
      { status: entitlementCheck.status },
    );
  }

  const [documents, auditEvents, notifications] = await Promise.all([
    listDocuments(organization.id),
    listAuditEventsForUser(user.id),
    listNotificationsForUser(user.id),
  ]);

  await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: 'gdpr_export_requested',
    entityType: 'organization',
    entityId: organization.id,
    metadata: { scope: 'organization_export', plan: entitlementCheck.entitlements.plan },
  });

  await createNotification({
    organizationId: organization.id,
    userId: user.id,
    type: 'system',
    message: 'Exportação GDPR preparada para a organização.',
  });

  const body = {
    generatedAt: new Date().toISOString(),
    subject: {
      userId: user.id,
      email: user.email,
    },
    organization,
    documents,
    auditEvents,
    notifications,
    note: 'Exportação simulada para GDPR Artigo 20. Adicionar riscos, fornecedores, tarefas e ficheiros quando os schemas estiverem finalizados.',
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="eurocomply-gdpr-export-${organization.slug ?? organization.id}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}

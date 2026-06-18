import { sanitizeDocumentDownloadFileName } from '@/lib/documents/upload';
import { assertGdprSelfServiceEnabled } from '@/server/billing/entitlements';
import { upgradeRequiredResponse } from '@/server/billing/upgrade-response';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { listDocuments } from '@/server/queries/documents';
import { listAuditEventsForUser, listNotificationsForUser } from '@/server/queries/compliance-activity';
import { createAuditEvent } from '@/server/queries/audit-events';
import { createNotification } from '@/server/queries/notifications';
import { noStoreDownload, noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return noStoreJson({ error: 'organization_required' }, { status: 404 });
  }

  const entitlementCheck = await assertGdprSelfServiceEnabled(organization.id);

  if (!entitlementCheck.ok) {
    return upgradeRequiredResponse({
      error: entitlementCheck.error,
      message: entitlementCheck.message,
      plan: entitlementCheck.entitlements.plan,
      requiredPlan: 'professional',
      entitlements: entitlementCheck.entitlements,
    }, entitlementCheck.status);
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
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    },
    documents,
    auditEvents,
    notifications,
    note: 'Exportação simulada para GDPR Artigo 20. Adicionar riscos, fornecedores, tarefas e ficheiros quando os schemas estiverem finalizados.',
  };

  const fileName = sanitizeDocumentDownloadFileName(
    `eurocomply-gdpr-export-${organization.slug ?? organization.id}.json`,
  );

  return noStoreDownload(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

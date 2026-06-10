import { NextRequest, NextResponse } from 'next/server';
import { assertGdprSelfServiceEnabled } from '@/server/billing/entitlements';
import { upgradeRequiredResponse } from '@/server/billing/upgrade-response';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { createAuditEvent } from '@/server/queries/audit-events';
import { createNotification } from '@/server/queries/notifications';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
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
    return upgradeRequiredResponse({
      error: entitlementCheck.error,
      message: entitlementCheck.message,
      plan: entitlementCheck.entitlements.plan,
      requiredPlan: 'professional',
      entitlements: entitlementCheck.entitlements,
    }, entitlementCheck.status);
  }

  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === 'string' && body.reason.trim().length > 0 ? body.reason.trim().slice(0, 500) : 'No reason provided';

  await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: 'gdpr_delete_requested',
    entityType: 'organization',
    entityId: organization.id,
    metadata: { reason, status: 'pending_review', plan: entitlementCheck.entitlements.plan },
  });

  await createNotification({
    organizationId: organization.id,
    userId: user.id,
    type: 'system',
    message: 'Pedido de apagamento GDPR recebido e enviado para revisão.',
  });

  return NextResponse.json(
    {
      status: 'pending_review',
      message: 'Deletion request received. A compliance administrator must review retention, legal hold, billing and audit requirements before deletion.',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

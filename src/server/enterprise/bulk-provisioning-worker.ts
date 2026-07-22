import { sendEmail } from '@/lib/email/client';
import { invitationEmail } from '@/lib/email/templates';
import { reportError } from '@/lib/observability/report-error';
import {
  claimEnterpriseProvisioningItems,
  completeEnterpriseProvisioningItem,
  type BulkImportRole,
  type ClaimedProvisioningItem,
} from '@/server/enterprise/bulk-provisioning';
import { createAuditEvent } from '@/server/queries/audit-events';
import {
  createOrganizationInvite,
  deleteOrganizationInvite,
  OrganizationInviteError,
} from '@/server/queries/invites';

const MAX_WORKER_BATCH = 50;
const DEFAULT_WORKER_BATCH = 10;
const WORKER_CONCURRENCY = 5;

type ItemResult = {
  itemId: string;
  outcome: 'succeeded' | 'failed' | 'retry';
  errorCode: string | null;
};

function inviteRole(role: BulkImportRole): 'Admin' | 'Editor' | 'Visualizador' {
  if (role === 'admin') return 'Admin';
  if (role === 'editor') return 'Editor';
  return 'Visualizador';
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function retryableInviteError(error: OrganizationInviteError) {
  return [
    'contract_not_active',
    'contract_missing',
    'entitlements_missing',
    'invitation_persistence_unavailable',
  ].includes(error.code);
}

async function compensateInvite(item: ClaimedProvisioningItem, invitationId: string) {
  try {
    await deleteOrganizationInvite({
      organizationId: item.organizationId,
      invitationId,
    });
    return true;
  } catch (error) {
    reportError(error, {
      area: 'enterprise_bulk_invite_compensation',
      organizationId: item.organizationId,
      invitationId,
      jobId: item.jobId,
      itemId: item.itemId,
    });
    return false;
  }
}

async function processItem(item: ClaimedProvisioningItem): Promise<ItemResult> {
  let invitationId: string | null = null;

  try {
    const invite = await createOrganizationInvite({
      organizationId: item.organizationId,
      invitedBy: item.actorUserId,
      email: item.email,
      role: inviteRole(item.role),
      seatType: item.seatType,
    });
    invitationId = invite.invite.id;

    const audit = await createAuditEvent({
      organizationId: item.organizationId,
      actorUserId: item.actorUserId,
      action: 'enterprise.bulk_invite_created',
      entityType: 'invitation',
      entityId: invitationId,
      metadata: {
        jobId: item.jobId,
        itemId: item.itemId,
        rowSource: 'bulk_provisioning',
        emailDomain: item.email.split('@')[1] ?? 'unknown',
        role: item.role,
        seatType: item.seatType,
      },
    });

    if (!audit.persisted) {
      await compensateInvite(item, invitationId);
      await completeEnterpriseProvisioningItem({
        itemId: item.itemId,
        outcome: 'retry',
        errorCode: 'audit_unavailable',
      });
      return { itemId: item.itemId, outcome: 'retry', errorCode: 'audit_unavailable' };
    }

    const inviteUrl = `${getAppUrl()}/en/invite/${encodeURIComponent(invite.token)}`;
    const builtEmail = invitationEmail({
      organizationName: invite.organizationName,
      role: invite.invite.role,
      inviteUrl,
    });
    const delivery = await sendEmail({
      to: invite.invite.email,
      subject: builtEmail.subject,
      html: builtEmail.html,
      text: builtEmail.text,
      template: builtEmail.template,
      organizationId: item.organizationId,
      userId: item.actorUserId,
      idempotencyKey: `enterprise-bulk-invite:${item.itemId}:${invite.tokenFingerprint}`,
      metadata: {
        source: 'enterprise_bulk_provisioning',
        jobId: item.jobId,
        itemId: item.itemId,
        invitationId,
        role: item.role,
        seatType: item.seatType,
      },
    });

    if (!delivery.sent) throw new Error(`email_delivery_${delivery.status}`);

    await completeEnterpriseProvisioningItem({
      itemId: item.itemId,
      outcome: 'succeeded',
      invitationId,
    });
    return { itemId: item.itemId, outcome: 'succeeded', errorCode: null };
  } catch (error) {
    const retry = error instanceof OrganizationInviteError
      ? retryableInviteError(error)
      : true;
    const errorCode = error instanceof OrganizationInviteError
      ? error.code
      : error instanceof Error && error.message.startsWith('email_delivery_')
        ? error.message.slice(0, 120)
        : 'worker_failure';

    if (invitationId) await compensateInvite(item, invitationId);

    reportError(error, {
      area: 'enterprise_bulk_provisioning_item',
      organizationId: item.organizationId,
      jobId: item.jobId,
      itemId: item.itemId,
      attemptCount: item.attemptCount,
      errorCode,
    });

    await completeEnterpriseProvisioningItem({
      itemId: item.itemId,
      outcome: retry ? 'retry' : 'failed',
      errorCode,
    });

    return {
      itemId: item.itemId,
      outcome: retry ? 'retry' : 'failed',
      errorCode,
    };
  }
}

export async function processEnterpriseProvisioningBatch(batchSize = DEFAULT_WORKER_BATCH) {
  const safeBatchSize = Math.min(Math.max(Math.trunc(batchSize), 1), MAX_WORKER_BATCH);
  const items = await claimEnterpriseProvisioningItems(safeBatchSize);
  const results: ItemResult[] = [];

  for (let index = 0; index < items.length; index += WORKER_CONCURRENCY) {
    const group = items.slice(index, index + WORKER_CONCURRENCY);
    results.push(...await Promise.all(group.map(processItem)));
  }

  return {
    claimed: items.length,
    succeeded: results.filter((result) => result.outcome === 'succeeded').length,
    failed: results.filter((result) => result.outcome === 'failed').length,
    retrying: results.filter((result) => result.outcome === 'retry').length,
  };
}

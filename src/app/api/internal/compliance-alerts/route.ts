import { sendEmail } from '@/lib/email/client';
import { documentExpiringEmail, vendorReviewEmail } from '@/lib/email/templates';
import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildNotificationIdempotencyKey } from '@/server/jobs/notification-idempotency';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';
import { isExpectedMissingSupabaseSchema } from '@/server/supabase/schema-compatibility';
import { getUserEmailContextById } from '@/server/users/email';

export const runtime = 'nodejs';

const DOCUMENT_EXPIRY_LOOKAHEAD_DAYS = 30;
const COMPLIANCE_ALERTS_ROUTE = '/api/internal/compliance-alerts';
const COMPLIANCE_ALERTS_AUTH_ACTION = 'authenticate_compliance_alerts';
const PRE_V19_DEFER_REASON = 'maintenance_data_plane_not_promoted';

type NotificationDedupe = {
  organizationId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  recipientEmail: string;
};

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function getOrganizationOwnerContact(userId: string) {
  return getUserEmailContextById(userId, 'compliance_alert_owner_lookup');
}

async function getComplianceAlertDataPlaneStatus() {
  const supabase = createAdminClient();
  const [notificationEvents, vendorMaintenance] = await Promise.all([
    supabase.from('email_notification_events').select('id').limit(1),
    supabase.from('vendors').select('id,next_review_at').limit(1),
  ]);

  const errors = [notificationEvents.error, vendorMaintenance.error].filter(Boolean);
  if (errors.length === 0) return { ready: true as const };

  const unexpectedError = errors.find((error) => !isExpectedMissingSupabaseSchema(error));
  if (unexpectedError) {
    reportError(unexpectedError, { area: 'compliance_alert_data_plane_probe' });
    throw unexpectedError;
  }

  return { ready: false as const, reason: PRE_V19_DEFER_REASON };
}

async function hasNotificationBeenSent(input: NotificationDedupe) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('email_notification_events')
    .select('id')
    .eq('organization_id', input.organizationId)
    .eq('event_type', input.eventType)
    .eq('entity_type', input.entityType)
    .eq('entity_id', input.entityId)
    .eq('recipient_email', input.recipientEmail)
    .maybeSingle();

  if (error) {
    reportError(error, { area: 'email_notification_dedupe_lookup', ...input });
    throw error;
  }

  return Boolean(data?.id);
}

async function recordNotificationSent(input: NotificationDedupe & {
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('email_notification_events').upsert(
    {
      organization_id: input.organizationId,
      event_type: input.eventType,
      entity_type: input.entityType,
      entity_id: input.entityId,
      recipient_email: input.recipientEmail,
      metadata: { ...(input.metadata ?? {}), idempotencyKey: input.idempotencyKey },
    },
    { onConflict: 'organization_id,event_type,entity_type,entity_id,recipient_email' },
  );

  if (error) {
    reportError(error, { area: 'email_notification_dedupe_record', ...input });
    throw error;
  }
}

async function sendDocumentExpiryAlerts() {
  const supabase = createAdminClient();
  const appUrl = getAppUrl();
  const today = new Date().toISOString().slice(0, 10);
  const lookahead = addDays(DOCUMENT_EXPIRY_LOOKAHEAD_DAYS);

  const { data: documents, error } = await supabase
    .from('documents')
    .select('id,name,expires_at,organization_id,organizations(id,name,created_by)')
    .not('expires_at', 'is', null)
    .gte('expires_at', today)
    .lte('expires_at', lookahead)
    .neq('status', 'archived')
    .order('expires_at', { ascending: true });

  if (error) {
    reportError(error, { area: 'document_expiry_alert_job' });
    throw error;
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const document of documents ?? []) {
    const organization = Array.isArray(document.organizations) ? document.organizations[0] : document.organizations;

    if (!organization?.created_by || !document.expires_at) continue;

    const recipient = await getOrganizationOwnerContact(organization.created_by);
    if (!recipient.email) continue;

    const dedupe: NotificationDedupe = {
      organizationId: document.organization_id,
      eventType: 'document.expiring',
      entityType: 'document',
      entityId: document.id,
      recipientEmail: recipient.email,
    };

    if (await hasNotificationBeenSent(dedupe)) {
      skipped += 1;
      continue;
    }

    const idempotencyKey = buildNotificationIdempotencyKey({ ...dedupe, occurrence: document.expires_at });
    const email = documentExpiringEmail({
      organizationName: organization.name,
      documentName: document.name,
      expiresAt: document.expires_at,
      documentsUrl: `${appUrl}/${recipient.locale}/dashboard/organizations/documents`,
      locale: recipient.locale,
    });

    try {
      const delivery = await sendEmail({
        to: recipient.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        template: email.template,
        organizationId: document.organization_id,
        userId: organization.created_by,
        idempotencyKey,
        metadata: {
          source: 'document_expiry_alert_job',
          documentId: document.id,
          expiresAt: document.expires_at,
          locale: recipient.locale,
        },
      });

      if (!delivery.sent) {
        skipped += 1;
        continue;
      }

      await recordNotificationSent({
        ...dedupe,
        idempotencyKey,
        metadata: { expiresAt: document.expires_at, locale: recipient.locale },
      });
      sent += 1;
    } catch (emailError) {
      failed += 1;
      reportError(emailError, { area: 'document_expiry_alert_email', documentId: document.id, organizationId: document.organization_id });
    }
  }

  return { sent, skipped, failed };
}

async function sendVendorReviewAlerts() {
  const supabase = createAdminClient();
  const appUrl = getAppUrl();
  const today = new Date().toISOString().slice(0, 10);

  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('id,name,next_review_at,organization_id,organizations(id,name,created_by)')
    .or(`review_status.neq.approved,risk_level.eq.high,next_review_at.lte.${today}`)
    .order('next_review_at', { ascending: true, nullsFirst: false });

  if (error) {
    reportError(error, { area: 'vendor_review_alert_job' });
    throw error;
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const vendor of vendors ?? []) {
    const organization = Array.isArray(vendor.organizations) ? vendor.organizations[0] : vendor.organizations;
    if (!organization?.created_by) continue;

    const recipient = await getOrganizationOwnerContact(organization.created_by);
    if (!recipient.email) continue;

    const dedupe: NotificationDedupe = {
      organizationId: vendor.organization_id,
      eventType: 'vendor.review_pending',
      entityType: 'vendor',
      entityId: vendor.id,
      recipientEmail: recipient.email,
    };

    if (await hasNotificationBeenSent(dedupe)) {
      skipped += 1;
      continue;
    }

    const idempotencyKey = buildNotificationIdempotencyKey({ ...dedupe, occurrence: vendor.next_review_at });
    const email = vendorReviewEmail({
      organizationName: organization.name,
      vendorName: vendor.name,
      reviewDueAt: vendor.next_review_at,
      vendorsUrl: `${appUrl}/${recipient.locale}/dashboard/organizations/vendors`,
      locale: recipient.locale,
    });

    try {
      const delivery = await sendEmail({
        to: recipient.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        template: email.template,
        organizationId: vendor.organization_id,
        userId: organization.created_by,
        idempotencyKey,
        metadata: {
          source: 'vendor_review_alert_job',
          vendorId: vendor.id,
          reviewDueAt: vendor.next_review_at,
          locale: recipient.locale,
        },
      });

      if (!delivery.sent) {
        skipped += 1;
        continue;
      }

      await recordNotificationSent({
        ...dedupe,
        idempotencyKey,
        metadata: { reviewDueAt: vendor.next_review_at, locale: recipient.locale },
      });
      sent += 1;
    } catch (emailError) {
      failed += 1;
      reportError(emailError, { area: 'vendor_review_alert_email', vendorId: vendor.id, organizationId: vendor.organization_id });
    }
  }

  return { sent, skipped, failed };
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceInternalAuthenticationRateLimit(request, {
    route: COMPLIANCE_ALERTS_ROUTE,
    action: COMPLIANCE_ALERTS_AUTH_ACTION,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  if (!isAuthorizedInternalCronRequest(request)) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dataPlane = await getComplianceAlertDataPlaneStatus();
    if (!dataPlane.ready) {
      const deferred = { sent: 0, skipped: 0, failed: 0 };
      return noStoreJson({
        ok: true,
        status: 'deferred',
        reason: dataPlane.reason,
        documentAlerts: deferred,
        vendorAlerts: deferred,
      });
    }

    const [documentAlerts, vendorAlerts] = await Promise.all([
      sendDocumentExpiryAlerts(),
      sendVendorReviewAlerts(),
    ]);

    if (documentAlerts.failed > 0 || vendorAlerts.failed > 0) {
      return noStoreJson(
        { error: 'Unable to send all compliance alerts', documentAlerts, vendorAlerts },
        { status: 500 },
      );
    }

    return noStoreJson({ ok: true, status: 'completed', documentAlerts, vendorAlerts });
  } catch (error) {
    reportError(error, { area: 'compliance_alert_job' });
    return noStoreJson({ error: 'Unable to send compliance alerts' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}

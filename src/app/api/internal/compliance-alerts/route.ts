import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/client';
import { documentExpiringEmail, vendorReviewEmail } from '@/lib/email/templates';
import { reportError } from '@/lib/observability/report-error';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const DOCUMENT_EXPIRY_LOOKAHEAD_DAYS = 30;

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function getExpectedSecrets() {
  return [process.env.CRON_SECRET, process.env.INTERNAL_CRON_SECRET].filter(Boolean);
}

function isAuthorized(request: Request) {
  const expectedSecrets = getExpectedSecrets();

  if (expectedSecrets.length === 0) {
    return false;
  }

  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  const headerSecret = request.headers.get('x-internal-cron-secret');

  return expectedSecrets.some((secret) => bearerToken === secret || headerSecret === secret);
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function getOrganizationOwnerEmail(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    reportError(error, { area: 'compliance_alert_owner_lookup', userId });
    return null;
  }

  return data.user?.email ?? null;
}

async function hasNotificationBeenSent(input: {
  organizationId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  recipientEmail: string;
}) {
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
    return false;
  }

  return Boolean(data?.id);
}

async function recordNotificationSent(input: {
  organizationId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  recipientEmail: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('email_notification_events').insert({
    organization_id: input.organizationId,
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    recipient_email: input.recipientEmail,
    metadata: input.metadata ?? {},
  });

  if (error) {
    reportError(error, { area: 'email_notification_dedupe_record', ...input });
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

  for (const document of documents ?? []) {
    const organization = Array.isArray(document.organizations) ? document.organizations[0] : document.organizations;

    if (!organization?.created_by || !document.expires_at) {
      continue;
    }

    const emailAddress = await getOrganizationOwnerEmail(organization.created_by);

    if (!emailAddress) {
      continue;
    }

    const dedupe = {
      organizationId: document.organization_id,
      eventType: 'document.expiring',
      entityType: 'document',
      entityId: document.id,
      recipientEmail: emailAddress,
    };

    if (await hasNotificationBeenSent(dedupe)) {
      skipped += 1;
      continue;
    }

    const email = documentExpiringEmail({
      organizationName: organization.name,
      documentName: document.name,
      expiresAt: document.expires_at,
      documentsUrl: `${appUrl}/dashboard/organizations/documents`,
    });

    try {
      await sendEmail({
        to: emailAddress,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      await recordNotificationSent({ ...dedupe, metadata: { expiresAt: document.expires_at } });
      sent += 1;
    } catch (emailError) {
      reportError(emailError, { area: 'document_expiry_alert_email', documentId: document.id, organizationId: document.organization_id });
    }
  }

  return { sent, skipped };
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

  for (const vendor of vendors ?? []) {
    const organization = Array.isArray(vendor.organizations) ? vendor.organizations[0] : vendor.organizations;

    if (!organization?.created_by) {
      continue;
    }

    const emailAddress = await getOrganizationOwnerEmail(organization.created_by);

    if (!emailAddress) {
      continue;
    }

    const dedupe = {
      organizationId: vendor.organization_id,
      eventType: 'vendor.review_pending',
      entityType: 'vendor',
      entityId: vendor.id,
      recipientEmail: emailAddress,
    };

    if (await hasNotificationBeenSent(dedupe)) {
      skipped += 1;
      continue;
    }

    const email = vendorReviewEmail({
      organizationName: organization.name,
      vendorName: vendor.name,
      reviewDueAt: vendor.next_review_at,
      vendorsUrl: `${appUrl}/dashboard/organizations/vendors`,
    });

    try {
      await sendEmail({
        to: emailAddress,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      await recordNotificationSent({ ...dedupe, metadata: { reviewDueAt: vendor.next_review_at } });
      sent += 1;
    } catch (emailError) {
      reportError(emailError, { area: 'vendor_review_alert_email', vendorId: vendor.id, organizationId: vendor.organization_id });
    }
  }

  return { sent, skipped };
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [documentAlerts, vendorAlerts] = await Promise.all([
      sendDocumentExpiryAlerts(),
      sendVendorReviewAlerts(),
    ]);

    return NextResponse.json({
      ok: true,
      documentAlerts,
      vendorAlerts,
    });
  } catch (error) {
    reportError(error, { area: 'compliance_alert_job' });
    return NextResponse.json({ error: 'Unable to send compliance alerts' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}

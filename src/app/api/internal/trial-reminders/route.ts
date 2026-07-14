import { sendEmail } from '@/lib/email/client';
import { trialUpgradeEmail } from '@/lib/email/templates';
import { reportError } from '@/lib/observability/report-error';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { createAdminClient } from '@/lib/supabase/admin';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';
import { buildTrialReminderIdempotencyKey } from '@/server/jobs/trial-reminder-idempotency';
import { getUserEmailById } from '@/server/users/email';

export const runtime = 'nodejs';

const TRIAL_REMINDER_DAYS = 3;
const TRIAL_REMINDER_ROUTE = '/api/internal/trial-reminders';
const TRIAL_REMINDER_AUTH_ACTION = 'authenticate_trial_reminder_job';
const REMINDER_EVENT_CONFLICT_COLUMNS = 'organization_id,event_type,entity_type,entity_id,recipient_email';

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysUntil(value: string) {
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

async function getOwnerEmail(userId: string) {
  return getUserEmailById(userId, 'trial_reminder_owner_lookup');
}

async function hasReminderBeenSent(organizationId: string, subscriptionId: string, recipientEmail: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('email_notification_events')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('event_type', 'billing.trial_ending')
    .eq('entity_type', 'subscription')
    .eq('entity_id', subscriptionId)
    .eq('recipient_email', recipientEmail)
    .maybeSingle();

  if (error) {
    reportError(error, { area: 'trial_reminder_dedupe_lookup', organizationId, subscriptionId });
    throw error;
  }

  return Boolean(data?.id);
}

async function recordReminderSent(
  organizationId: string,
  subscriptionId: string,
  recipientEmail: string,
  currentPeriodEnd: string,
  idempotencyKey: string,
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('email_notification_events').upsert(
    {
      organization_id: organizationId,
      event_type: 'billing.trial_ending',
      entity_type: 'subscription',
      entity_id: subscriptionId,
      recipient_email: recipientEmail,
      metadata: { currentPeriodEnd, idempotencyKey },
    },
    {
      onConflict: REMINDER_EVENT_CONFLICT_COLUMNS,
      ignoreDuplicates: true,
    },
  );

  if (error) {
    reportError(error, { area: 'trial_reminder_dedupe_record', organizationId, subscriptionId });
    throw error;
  }
}

async function sendTrialReminders() {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const reminderDate = addDays(TRIAL_REMINDER_DAYS);
  const billingUrl = `${getAppUrl()}/dashboard/organizations/billing`;

  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('id,organization_id,current_period_end,organizations(id,name,created_by)')
    .eq('status', 'trialing')
    .not('current_period_end', 'is', null)
    .gte('current_period_end', today)
    .lte('current_period_end', reminderDate)
    .order('current_period_end', { ascending: true });

  if (error) {
    reportError(error, { area: 'trial_reminder_job' });
    throw error;
  }

  let sent = 0;
  let skipped = 0;

  for (const subscription of subscriptions ?? []) {
    const organization = Array.isArray(subscription.organizations) ? subscription.organizations[0] : subscription.organizations;
    const ownerUserId = organization?.created_by;

    if (!ownerUserId || !subscription.current_period_end) continue;

    const recipientEmail = await getOwnerEmail(ownerUserId);

    if (!recipientEmail) continue;

    if (await hasReminderBeenSent(subscription.organization_id, subscription.id, recipientEmail)) {
      skipped += 1;
      continue;
    }

    const idempotencyKey = buildTrialReminderIdempotencyKey({
      organizationId: subscription.organization_id,
      subscriptionId: subscription.id,
      currentPeriodEnd: subscription.current_period_end,
      recipientEmail,
    });
    const email = trialUpgradeEmail({
      organizationName: organization.name,
      billingUrl,
      daysRemaining: daysUntil(subscription.current_period_end),
    });

    try {
      const delivery = await sendEmail({
        to: recipientEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
        template: email.template,
        organizationId: subscription.organization_id,
        userId: ownerUserId,
        idempotencyKey,
        metadata: {
          source: 'trial_reminder_job',
          subscriptionId: subscription.id,
          currentPeriodEnd: subscription.current_period_end,
        },
      });

      if (!delivery.sent) {
        skipped += 1;
        continue;
      }

      await recordReminderSent(
        subscription.organization_id,
        subscription.id,
        recipientEmail,
        subscription.current_period_end,
        idempotencyKey,
      );
      sent += 1;
    } catch (error) {
      reportError(error, { area: 'trial_reminder_email', subscriptionId: subscription.id, organizationId: subscription.organization_id });
    }
  }

  return { sent, skipped };
}

export async function POST(request: Request) {
  const authRateLimited = await enforceInternalAuthenticationRateLimit(request, {
    route: TRIAL_REMINDER_ROUTE,
    action: TRIAL_REMINDER_AUTH_ACTION,
  });
  if (authRateLimited) return authRateLimited;

  if (!isAuthorizedInternalCronRequest(request)) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const reminders = await sendTrialReminders();
    return noStoreJson({ ok: true, reminders });
  } catch (error) {
    reportError(error, { area: 'trial_reminder_job' });
    return noStoreJson({ error: 'Unable to send trial reminders' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}

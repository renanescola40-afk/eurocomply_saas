import { createHash } from 'node:crypto';
import { sendEmail } from '@/lib/email/client';
import { reportError } from '@/lib/observability/report-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildNotificationIdempotencyKey } from '@/server/jobs/notification-idempotency';
import { shouldDeliverReminder, type ReviewDeliveryState } from '@/server/ai-governance/qualified-review-delivery';

function emailHash(value: string) { return createHash('sha256').update(value.trim().toLowerCase()).digest('hex'); }

export async function runQualifiedReviewReminderJob(now = new Date()) {
  const db = createAdminClient();
  const { data, error } = await db.from('qualified_review_assignments')
    .select('id,campaign_id,organization_id,status,due_at,qualified_reviewers(email,display_name),qualified_review_submissions(valid_until,superseded_at)')
    .in('status', ['assigned','in_review','changes_requested','submitted']);
  if (error) throw new Error('qualified_review_reminder_query_failed', { cause: error });
  const summary = { sent: 0, skipped: 0, failed: 0, expired: 0 };
  for (const row of data ?? []) {
    const reviewer = Array.isArray(row.qualified_reviewers) ? row.qualified_reviewers[0] : row.qualified_reviewers;
    const submissions = Array.isArray(row.qualified_review_submissions) ? row.qualified_review_submissions : [];
    const current = submissions.find((item) => !item.superseded_at);
    if (!reviewer?.email) { summary.skipped += 1; continue; }
    const { data: previous } = await db.from('qualified_review_deliveries').select('stage').eq('organization_id', row.organization_id).eq('assignment_id', row.id).order('attempted_at', { ascending: false }).limit(1).maybeSingle();
    const state: ReviewDeliveryState = { assignmentId: row.id, campaignId: row.campaign_id, organizationId: row.organization_id, reviewerEmail: reviewer.email, dueAt: row.due_at, validUntil: current?.valid_until ?? null, status: row.status, lastReminderStage: previous?.stage ?? null };
    const decision = shouldDeliverReminder(state, now);
    if (!decision.deliver || !decision.stage) { summary.skipped += 1; continue; }
    if (decision.stage === 'expired') {
      const { error: expiryError } = await db.rpc('expire_qualified_review_assignments', { p_now: now.toISOString() });
      if (expiryError) { summary.failed += 1; reportError(expiryError, { area: 'qualified_review_expiry' }); } else summary.expired += 1;
      continue;
    }
    const occurrence = `${decision.stage}:${row.due_at ?? 'none'}`;
    const idempotencyKey = buildNotificationIdempotencyKey({ organizationId: row.organization_id, eventType: `qualified_review.${decision.stage}`, entityType: 'qualified_review_assignment', entityId: row.id, recipientEmail: reviewer.email, occurrence });
    try {
      const delivery = await sendEmail({ to: reviewer.email, subject: `Qualified review ${decision.stage.replace('_', ' ')}`, text: `Your qualified review assignment requires attention. Assignment: ${row.id}. Due: ${row.due_at ?? 'not set'}.`, html: `<p>Your qualified review assignment requires attention.</p><p>Assignment: ${row.id}</p><p>Due: ${row.due_at ?? 'not set'}</p>`, template: 'qualified-review-reminder', organizationId: row.organization_id, idempotencyKey, metadata: { assignmentId: row.id, campaignId: row.campaign_id, stage: decision.stage } });
      await db.from('qualified_review_deliveries').upsert({ organization_id: row.organization_id, campaign_id: row.campaign_id, assignment_id: row.id, stage: decision.stage, recipient_email_hash: emailHash(reviewer.email), idempotency_key: idempotencyKey, delivery_status: delivery.sent ? 'sent' : 'skipped', delivered_at: delivery.sent ? new Date().toISOString() : null }, { onConflict: 'organization_id,assignment_id,stage' });
      if (delivery.sent) summary.sent += 1; else summary.skipped += 1;
    } catch (deliveryError) {
      summary.failed += 1;
      reportError(deliveryError, { area: 'qualified_review_reminder_delivery', assignmentId: row.id, organizationId: row.organization_id });
    }
  }
  return summary;
}

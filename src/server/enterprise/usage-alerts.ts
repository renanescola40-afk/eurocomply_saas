import { createHash } from 'node:crypto';

import { sendEmail } from '@/lib/email/client';
import { reportError } from '@/lib/observability/report-error';
import { createAdminClient } from '@/lib/supabase/admin';

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

type AlertRow = {
  alert_id?: unknown;
  organization_id?: unknown;
  contract_id?: unknown;
  metric?: unknown;
  threshold_percent?: unknown;
  current_value?: unknown;
  limit_value?: unknown;
};

export type EnterpriseUsageAlert = {
  alertId: string;
  organizationId: string;
  contractId: string;
  metric: string;
  thresholdPercent: number;
  currentValue: number;
  limitValue: number;
};

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function parseAlert(value: unknown): EnterpriseUsageAlert {
  const row = value as AlertRow;
  const alertId = stringField(row.alert_id);
  const organizationId = stringField(row.organization_id);
  const contractId = stringField(row.contract_id);
  const metric = stringField(row.metric);
  const thresholdPercent = integer(row.threshold_percent);
  const currentValue = integer(row.current_value);
  const limitValue = integer(row.limit_value);

  if (!alertId || !organizationId || !contractId || !metric || thresholdPercent === null || currentValue === null || limitValue === null) {
    throw new Error('enterprise_usage_alert_invalid_result');
  }

  return { alertId, organizationId, contractId, metric, thresholdPercent, currentValue, limitValue };
}

function groupByOrganization(alerts: EnterpriseUsageAlert[]) {
  const groups = new Map<string, EnterpriseUsageAlert[]>();
  for (const alert of alerts) {
    const current = groups.get(alert.organizationId) ?? [];
    current.push(alert);
    groups.set(alert.organizationId, current);
  }
  return groups;
}

function formatMetric(metric: string) {
  return metric.replaceAll('_', ' ');
}

function messageForOrganization(organizationName: string, alerts: EnterpriseUsageAlert[]) {
  const ordered = [...alerts].sort((left, right) => (
    right.thresholdPercent - left.thresholdPercent || left.metric.localeCompare(right.metric)
  ));
  const lines = ordered.map((alert) => (
    `${formatMetric(alert.metric)}: ${alert.currentValue}/${alert.limitValue} (${alert.thresholdPercent}% threshold)`
  ));
  const escapedName = organizationName.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character);
  const htmlItems = lines.map((line) => `<li>${line.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character)}</li>`).join('');

  return {
    subject: `Enterprise usage alert — ${organizationName}`,
    text: [
      `Enterprise usage alert for ${organizationName}`,
      '',
      ...lines.map((line) => `- ${line}`),
      '',
      'Review pending invitations, queued imports and active seats in the Platform Control Center.',
    ].join('\n'),
    html: `<h2>Enterprise usage alert for ${escapedName}</h2><ul>${htmlItems}</ul><p>Review pending invitations, queued imports and active seats in the Platform Control Center.</p>`,
  };
}

async function loadOrganizationRecipients(organizationId: string) {
  const admin = createAdminClient();
  const [{ data: organization, error: organizationError }, { data: memberships, error: membershipError }] = await Promise.all([
    admin.from('organizations').select('name').eq('id', organizationId).maybeSingle(),
    admin
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .in('role', ['owner', 'admin']),
  ]);

  if (organizationError || membershipError) {
    throw new Error('enterprise_usage_alert_recipient_lookup_failed');
  }

  const emails = new Set<string>();
  for (const membership of memberships ?? []) {
    if (!membership.user_id) continue;
    const { data, error } = await admin.auth.admin.getUserById(membership.user_id);
    const email = data.user?.email?.trim().toLowerCase();
    if (!error && email) emails.add(email);
  }

  return {
    organizationName: typeof organization?.name === 'string' && organization.name.trim()
      ? organization.name.trim()
      : 'Enterprise organization',
    emails: [...emails],
  };
}

async function markNotified(alertIds: string[]) {
  const client = createAdminClient() as unknown as RpcClient;
  for (const alertId of alertIds) {
    const { error } = await client.rpc('mark_enterprise_usage_alert_notified', {
      p_alert_id: alertId,
    });
    if (error) {
      console.warn('[enterprise-usage-alerts] notification_mark_failed', {
        alertId,
        code: error.code ?? 'unknown',
      });
    }
  }
}

export async function evaluateAndNotifyEnterpriseUsageAlerts(batchSize = 100) {
  const safeBatchSize = Math.min(Math.max(Math.trunc(batchSize), 1), 500);
  const client = createAdminClient() as unknown as RpcClient;
  const { data, error } = await client.rpc('evaluate_enterprise_usage_alerts_atomic', {
    p_batch_size: safeBatchSize,
  });

  if (error) {
    console.warn('[enterprise-usage-alerts] evaluation_failed', { code: error.code ?? 'unknown' });
    throw new Error('enterprise_usage_alert_evaluation_unavailable');
  }

  const alerts = (Array.isArray(data) ? data : data ? [data] : []).map(parseAlert);
  let deliveries = 0;
  let organizationsWithoutRecipients = 0;

  for (const [organizationId, group] of groupByOrganization(alerts)) {
    try {
      const recipients = await loadOrganizationRecipients(organizationId);
      if (recipients.emails.length === 0) {
        organizationsWithoutRecipients += 1;
        continue;
      }

      const message = messageForOrganization(recipients.organizationName, group);
      const digest = createHash('sha256')
        .update(group.map((alert) => alert.alertId).sort().join(','), 'utf8')
        .digest('hex')
        .slice(0, 24);
      let sent = false;

      for (const email of recipients.emails) {
        const delivery = await sendEmail({
          to: email,
          subject: message.subject,
          text: message.text,
          html: message.html,
          template: 'enterprise_usage_threshold',
          organizationId,
          idempotencyKey: `enterprise-usage-alert:${organizationId}:${digest}:${email}`,
          metadata: {
            alertIds: group.map((alert) => alert.alertId),
            thresholds: group.map((alert) => alert.thresholdPercent),
          },
        });
        if (delivery.sent) {
          sent = true;
          deliveries += 1;
        }
      }

      if (sent) await markNotified(group.map((alert) => alert.alertId));
    } catch (notificationError) {
      reportError(notificationError, {
        area: 'enterprise_usage_alert_notification',
        organizationId,
        alertCount: group.length,
      });
    }
  }

  return {
    triggered: alerts.length,
    deliveries,
    organizationsWithoutRecipients,
  };
}

import { headers } from 'next/headers';

import { reportError } from '@/lib/observability/report-error';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { createAuditEvent, sanitizeAuditMetadata } from '@/server/queries/audit-events';

export type AuditAction =
  | 'auth.login_attempt'
  | 'auth.login_success'
  | 'auth.login_failure'
  | 'auth.logout'
  | 'auth.oauth_start'
  | 'auth.oauth_callback'
  | 'auth.step_up_requested'
  | 'auth.step_up_approved'
  | 'auth.step_up_denied'
  | 'auth.step_up_expired'
  | 'billing.checkout_start'
  | 'billing.portal_start'
  | 'billing.webhook_received'
  | 'billing.subscription_updated'
  | 'export.created'
  | 'report.export'
  | 'audit_chain.verified'
  | 'audit_chain.evidence_exported'
  | 'document.upload'
  | 'document.download'
  | 'document.update'
  | 'document.delete'
  | 'document.approval_changed'
  | 'team.invite_created'
  | 'team.invite_cancelled'
  | 'team.member_removed'
  | 'team.member_role_changed'
  | 'permission.changed'
  | 'gdpr.export'
  | 'gdpr.delete_requested'
  | 'risk.create'
  | 'risk.update'
  | 'risk.delete'
  | 'vendor.create'
  | 'vendor.update'
  | 'vendor.delete'
  | 'task.create'
  | 'task.update'
  | 'task.delete'
  | 'security.event'
  | 'security.failure';

export type AuditLogInput = {
  action: AuditAction | string;
  organizationId?: string | null;
  userId?: string | null;
  actorUserId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

function normalizeIpAddress(value: string | null) {
  const ip = value?.split(',')[0]?.trim() ?? '';
  return ip.length > 0 && ip.length <= 128 ? ip : null;
}

function normalizeUserAgent(value: string | null) {
  const userAgent = value?.trim() ?? '';
  return userAgent.length > 0 ? userAgent.slice(0, 512) : null;
}

async function getRequestContext() {
  try {
    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get('x-forwarded-for');
    const ip = normalizeIpAddress(forwardedFor || requestHeaders.get('x-real-ip'));
    const userAgent = normalizeUserAgent(requestHeaders.get('user-agent'));

    return { ip, userAgent };
  } catch {
    return { ip: null, userAgent: null };
  }
}

export async function writeAuditLog(input: AuditLogInput) {
  const supabase = tryCreateAdminClient();
  const actorUserId = input.actorUserId ?? input.userId ?? null;
  const { ip, userAgent } = await getRequestContext();
  const metadata = sanitizeAuditMetadata({
    ...(input.metadata ?? {}),
    requestContext: {
      ipAddress: ip,
      userAgent,
    },
  });

  const payload = {
    organization_id: input.organizationId ?? null,
    user_id: actorUserId,
    action: input.action,
    entity_type: input.entityType ?? 'system',
    entity_id: input.entityId ?? null,
    ip_address: ip,
    user_agent: userAgent,
    metadata,
  };

  if (supabase) {
    const { error } = await supabase.from('audit_logs').insert(payload);

    if (error) {
      reportError(error, { area: 'audit_log_write', action: input.action, organizationId: input.organizationId ?? undefined, userId: actorUserId ?? undefined });
    }
  }

  if (!input.organizationId) {
    return { persisted: Boolean(supabase), chained: false as const, reason: 'organization_required_for_chain' as const };
  }

  const chainResult = await createAuditEvent({
    organizationId: input.organizationId,
    actorUserId,
    action: input.action,
    entityType: input.entityType ?? 'system',
    entityId: input.entityId ?? null,
    metadata,
  });

  if (!chainResult.persisted) {
    reportError(new Error('Failed to append chained audit event'), {
      area: 'audit_chain_write',
      action: input.action,
      organizationId: input.organizationId,
      userId: actorUserId ?? undefined,
      reason: 'reason' in chainResult ? chainResult.reason : undefined,
    });
  }

  return { ...chainResult, chained: true as const };
}

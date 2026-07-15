import { headers } from 'next/headers';

import { trustedRequestIdFromHeaders } from '@/lib/observability/request-correlation';
import { reportError } from '@/lib/observability/report-error';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { createAuditEvent, sanitizeAuditMetadata } from '@/server/queries/audit-events';
import { hashRateLimitIp } from '@/server/security/rate-limit';

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
  | 'checkout_created'
  | 'billing_portal_created'
  | 'webhook_received'
  | 'webhook_rejected'
  | 'webhook_replayed'
  | 'subscription_synced'
  | 'billing.checkout_start'
  | 'billing.checkout_completed'
  | 'billing.portal_start'
  | 'billing.webhook_received'
  | 'billing.webhook_failed'
  | 'billing.subscription_created'
  | 'billing.subscription_updated'
  | 'billing.subscription_deleted'
  | 'billing.payment_failed'
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
  | 'security.settings_changed'
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

function pseudonymizeIpAddress(value: string | null) {
  return value ? `sha256:${hashRateLimitIp(value)}` : null;
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
    const requestId = trustedRequestIdFromHeaders(requestHeaders);

    return { requestId, ipPseudonym: pseudonymizeIpAddress(ip), userAgent };
  } catch {
    return { requestId: 'req_unavailable', ipPseudonym: null, userAgent: null };
  }
}

export async function writeAuditLog(input: AuditLogInput) {
  const supabase = tryCreateAdminClient();
  const actorUserId = input.actorUserId ?? input.userId ?? null;
  const { requestId, ipPseudonym, userAgent } = await getRequestContext();
  const metadata = sanitizeAuditMetadata({
    ...(input.metadata ?? {}),
    requestContext: {
      requestId,
      ipAddressPseudonym: ipPseudonym,
      userAgent,
    },
  });
  let legacyPersisted = false;

  if (supabase) {
    const { error } = await supabase.from('audit_logs').insert({
      organization_id: input.organizationId ?? null,
      actor_user_id: actorUserId,
      action: input.action,
      entity_type: input.entityType ?? 'system',
      entity_id: input.entityId ?? null,
      metadata,
    });

    if (error) {
      reportError(error, {
        area: 'audit_log_write',
        action: input.action,
        organizationId: input.organizationId ?? undefined,
        actorUserId: actorUserId ?? undefined,
        requestId,
      });
    } else {
      legacyPersisted = true;
    }
  }

  if (!input.organizationId) {
    return { persisted: legacyPersisted, legacyPersisted, chained: false as const, reason: 'organization_required_for_chain' as const };
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
      actorUserId: actorUserId ?? undefined,
      reason: 'reason' in chainResult ? chainResult.reason : undefined,
      requestId,
    });
  }

  return { ...chainResult, legacyPersisted, chained: true as const };
}

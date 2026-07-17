import { createHash } from 'node:crypto';

import { noStoreJson } from '@/server/security/no-store';
import { logAuditEvent } from '@/server/actions/audit';
import { logSecurityEvent } from '@/server/observability/logger';
import { getRateLimitHeaders, type RateLimitResult } from './rate-limit';

function hashAuditKey(key: string) {
  return createHash('sha256').update(key).digest('hex').slice(0, 24);
}

function safeRateLimitContext(result: RateLimitResult) {
  return {
    organizationId: result.organizationId,
    policy: result.policy,
    category: result.category,
    highRisk: result.highRisk,
    failureMode: result.failureMode,
    reason: result.reason ?? 'limit_exceeded',
    remaining: result.remaining,
    retryAfterSeconds: result.retryAfterSeconds,
    route: result.route,
    limitedAction: result.action,
    keyHash: hashAuditKey(result.key),
  };
}

function auditRateLimitBlock(result: RateLimitResult) {
  if (!result.audit) return;

  const context = safeRateLimitContext(result);
  if (result.highRisk) {
    logSecurityEvent(
      result.reason ? 'rate_limit_backend_unavailable' : 'rate_limit_abuse_detected',
      context,
      result.reason ? 'error' : 'warn',
    );
  }

  void logAuditEvent({
    organizationId: result.organizationId,
    actorUserId: result.userId,
    action: result.highRisk ? 'high_risk_rate_limit_blocked' : 'rate_limit_blocked',
    entityType: 'rate_limit',
    entityId: result.policy,
    metadata: context,
  }).catch((error: unknown) => {
    console.error('[security:rate-limit] failed to write audit event', {
      error: error instanceof Error ? error.name : 'unknown',
      policy: result.policy,
    });
  });
}

export function rateLimitResponse(result: RateLimitResult, message = 'Too many requests') {
  const isSecurityControlUnavailable = Boolean(result.reason && result.failureMode === 'fail-closed');

  auditRateLimitBlock(result);

  return noStoreJson(
    { error: isSecurityControlUnavailable ? 'security_control_unavailable' : message },
    {
      status: isSecurityControlUnavailable ? 503 : 429,
      headers: getRateLimitHeaders(result),
    },
  );
}

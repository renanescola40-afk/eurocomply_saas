import { createHash } from 'node:crypto';

import { noStoreJson } from '@/server/security/no-store';
import { logAuditEvent } from '@/server/actions/audit';
import { getRateLimitHeaders, type RateLimitResult } from './rate-limit';

function hashAuditKey(key: string) {
  return createHash('sha256').update(key).digest('hex').slice(0, 24);
}

function auditRateLimitBlock(result: RateLimitResult) {
  if (!result.audit) return;

  void logAuditEvent({
    organizationId: null,
    actorUserId: null,
    action: 'security.rate_limit.blocked',
    entityType: 'rate_limit',
    entityId: result.category,
    metadata: {
      category: result.category,
      failureMode: result.failureMode,
      reason: result.reason ?? 'limit_exceeded',
      remaining: result.remaining,
      retryAfterSeconds: result.retryAfterSeconds,
      keyHash: hashAuditKey(result.key),
    },
  }).catch((error: unknown) => {
    console.error('[security:rate-limit] failed to write audit event', {
      error: error instanceof Error ? error.name : 'unknown',
      category: result.category,
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

import 'server-only';

import { reportError } from '@/lib/observability/report-error';
import {
  checkDistributedRateLimit,
  type RateLimitOptions,
  type RateLimitResult,
} from '@/lib/security/rate-limit';
import { logAuditEvent } from '@/server/actions/audit';

export type ServerActionRateLimitCode = 'rate_limited' | 'security_control_unavailable';

export class ServerActionRateLimitError extends Error {
  readonly code: ServerActionRateLimitCode;
  readonly retryAfterSeconds: number;

  constructor(code: ServerActionRateLimitCode, message: string, retryAfterSeconds: number) {
    super(message);
    this.name = 'ServerActionRateLimitError';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type ServerActionRateLimitInput = RateLimitOptions & {
  rateLimitedMessage?: string;
  unavailableMessage?: string;
};

function isSecurityControlUnavailable(result: RateLimitResult) {
  return Boolean(result.reason && result.failureMode === 'fail-closed');
}

function safeAuditMetadata(result: RateLimitResult) {
  return {
    policy: result.policy,
    category: result.category,
    highRisk: result.highRisk,
    failureMode: result.failureMode,
    reason: result.reason ?? 'limit_exceeded',
    remaining: result.remaining,
    retryAfterSeconds: result.retryAfterSeconds,
    route: result.route,
    limitedAction: result.action,
  };
}

async function auditServerActionBlock(result: RateLimitResult) {
  if (!result.audit) return;

  try {
    const audit = await logAuditEvent({
      organizationId: result.organizationId,
      actorUserId: result.userId,
      action: result.highRisk ? 'high_risk_rate_limit_blocked' : 'rate_limit_blocked',
      entityType: 'rate_limit',
      entityId: result.policy,
      metadata: safeAuditMetadata(result),
    });

    if (!audit.persisted) {
      reportError(new Error('Server action rate-limit audit was not persisted'), {
        area: 'server_action_rate_limit_audit',
        policy: result.policy,
        route: result.route,
        reason: result.reason ?? 'limit_exceeded',
      });
    }
  } catch (error) {
    reportError(error, {
      area: 'server_action_rate_limit_audit',
      policy: result.policy,
      route: result.route,
      reason: result.reason ?? 'limit_exceeded',
    });
  }
}

export async function enforceServerActionRateLimit(input: ServerActionRateLimitInput) {
  const {
    rateLimitedMessage = 'Too many requests. Please try again later.',
    unavailableMessage = 'Security controls are temporarily unavailable. Please try again later.',
    ...options
  } = input;
  const result = await checkDistributedRateLimit(options);

  if (result.allowed) return result;

  await auditServerActionBlock(result);

  const unavailable = isSecurityControlUnavailable(result);
  throw new ServerActionRateLimitError(
    unavailable ? 'security_control_unavailable' : 'rate_limited',
    unavailable ? unavailableMessage : rateLimitedMessage,
    result.retryAfterSeconds,
  );
}

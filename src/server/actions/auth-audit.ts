'use server';

import { getCurrentUser } from '@/server/queries/auth';
import { recordAuthAuditEvent, type AuthAuditMethod } from '@/server/security/auth-audit';

const AUTH_ACTIONS = ['auth.login_success', 'auth.login_failure', 'auth.logout'] as const;
const AUTH_METHODS = ['password', 'google', 'oauth', 'session', 'unknown'] as const;

type ClientAuthAuditAction = typeof AUTH_ACTIONS[number];

type ClientAuthAuditInput = {
  action: ClientAuthAuditAction;
  method?: AuthAuditMethod;
  reason?: string | null;
};

function isAuthAction(value: unknown): value is ClientAuthAuditAction {
  return typeof value === 'string' && (AUTH_ACTIONS as readonly string[]).includes(value);
}

function normalizeMethod(value: unknown): AuthAuditMethod {
  return typeof value === 'string' && (AUTH_METHODS as readonly string[]).includes(value) ? value as AuthAuditMethod : 'unknown';
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, maxLength) : null;
}

function outcomeForAction(action: ClientAuthAuditAction) {
  if (action === 'auth.login_success') return 'succeeded' as const;
  if (action === 'auth.login_failure') return 'failed' as const;
  return 'completed' as const;
}

export async function auditClientAuthEvent(input: ClientAuthAuditInput) {
  if (!isAuthAction(input.action)) {
    return { persisted: false as const, reason: 'unsupported_auth_audit_action' as const };
  }

  const user = input.action === 'auth.login_failure' ? null : await getCurrentUser();

  if (input.action !== 'auth.login_failure' && !user) {
    return { persisted: false as const, reason: 'authentication_required' as const };
  }

  const result = await recordAuthAuditEvent({
    action: input.action,
    actorUserId: user?.id ?? null,
    method: normalizeMethod(input.method),
    outcome: outcomeForAction(input.action),
    reason: normalizeText(input.reason, 120),
    metadata: {
      source: 'auth_client_server_action',
      sessionBound: Boolean(user),
    },
  });

  return { persisted: result.some((entry) => entry.persisted), chained: result.some((entry) => entry.chained) };
}

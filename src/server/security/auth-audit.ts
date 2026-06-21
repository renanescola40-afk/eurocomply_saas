import { reportError } from '@/lib/observability/report-error';
import { writeAuditLog, type AuditAction } from '@/lib/security/audit-log';
import { getUserOrganizationMemberships } from '@/server/queries/current-organization';

export type AuthAuditMethod = 'password' | 'google' | 'oauth' | 'session' | 'unknown';

export type AuthAuditOutcome = 'attempted' | 'succeeded' | 'failed' | 'completed';

export type AuthAuditInput = {
  action: Extract<
    AuditAction,
    | 'auth.login_attempt'
    | 'auth.login_success'
    | 'auth.login_failure'
    | 'auth.logout'
    | 'auth.oauth_start'
    | 'auth.oauth_callback'
  >;
  actorUserId?: string | null;
  method?: AuthAuditMethod;
  outcome?: AuthAuditOutcome;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

function safeReason(reason: string | null | undefined) {
  const normalized = reason?.trim() ?? '';
  return normalized.length > 0 ? normalized.slice(0, 120) : null;
}

function uniqueOrganizationIds(ids: Array<string | null | undefined>) {
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))];
}

async function resolveActorOrganizationIds(actorUserId: string | null | undefined) {
  if (!actorUserId) return [];

  try {
    const memberships = await getUserOrganizationMemberships(actorUserId);
    return uniqueOrganizationIds(memberships.map((membership) => membership.organization_id));
  } catch (error) {
    reportError(error, { area: 'auth_audit_organization_lookup', userId: actorUserId });
    return [];
  }
}

export async function recordAuthAuditEvent(input: AuthAuditInput) {
  const actorUserId = input.actorUserId ?? null;
  const organizationIds = await resolveActorOrganizationIds(actorUserId);
  const metadata = {
    ...(input.metadata ?? {}),
    auth: {
      method: input.method ?? 'unknown',
      outcome: input.outcome ?? 'completed',
      reason: safeReason(input.reason),
      identifiers: 'omitted',
    },
  };

  const base = {
    action: input.action,
    actorUserId,
    entityType: 'auth_session',
    entityId: actorUserId,
    metadata,
  };

  if (organizationIds.length === 0) {
    return [
      await writeAuditLog({
        ...base,
        organizationId: null,
        metadata: {
          ...metadata,
          organizationScope: 'unavailable',
        },
      }),
    ];
  }

  return Promise.all(
    organizationIds.map((organizationId) => writeAuditLog({ ...base, organizationId })),
  );
}

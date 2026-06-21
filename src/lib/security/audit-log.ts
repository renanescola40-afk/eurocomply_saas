import { headers } from 'next/headers';
import { reportError } from '@/lib/observability/report-error';
import { tryCreateAdminClient } from '@/lib/supabase/admin';

export type AuditAction =
  | 'auth.login_attempt'
  | 'auth.oauth_start'
  | 'auth.oauth_callback'
  | 'billing.checkout_start'
  | 'billing.checkout_completed'
  | 'billing.portal_start'
  | 'billing.subscription_created'
  | 'billing.subscription_updated'
  | 'billing.subscription_deleted'
  | 'billing.payment_failed'
  | 'report.export'
  | 'document.upload'
  | 'document.delete'
  | 'risk.create'
  | 'risk.update'
  | 'risk.delete'
  | 'vendor.create'
  | 'vendor.update'
  | 'vendor.delete'
  | 'task.create'
  | 'task.update'
  | 'task.delete'
  | 'security.event';

export type AuditLogInput = {
  action: AuditAction;
  organizationId?: string | null;
  userId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

function sanitizeMetadata(metadata?: AuditLogInput['metadata']) {
  if (!metadata) return {};

  const blockedKeys = ['password', 'token', 'secret', 'apikey', 'api_key', 'authorization', 'cookie', 'jwt'];

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !blockedKeys.some((blocked) => key.toLowerCase().includes(blocked)))
      .map(([key, value]) => [key, value ?? null]),
  );
}

async function getRequestContext() {
  try {
    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() || requestHeaders.get('x-real-ip') || null;
    const userAgent = requestHeaders.get('user-agent');

    return { ip, userAgent };
  } catch {
    return { ip: null, userAgent: null };
  }
}

export async function writeAuditLog(input: AuditLogInput) {
  const supabase = tryCreateAdminClient();

  if (!supabase) return;

  const { ip, userAgent } = await getRequestContext();
  const payload = {
    organization_id: input.organizationId ?? null,
    user_id: input.userId ?? null,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    ip_address: ip,
    user_agent: userAgent,
    metadata: sanitizeMetadata(input.metadata),
  };

  const { error } = await supabase.from('audit_logs').insert(payload);

  if (error) {
    reportError(error, { area: 'audit_log_write', action: input.action, organizationId: input.organizationId ?? undefined, userId: input.userId ?? undefined });
  }
}

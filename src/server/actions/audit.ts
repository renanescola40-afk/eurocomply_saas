import { tryCreateAdminClient } from '@/lib/supabase/admin';

type AuditInput = {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logAuditEvent(input: AuditInput) {
  const supabase = tryCreateAdminClient();

  if (!supabase) {
    console.warn('[audit] Skipping audit log because Supabase admin client is unavailable');
    return;
  }

  const { error } = await supabase.from('audit_logs').insert({
    organization_id: input.organizationId ?? null,
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error('Failed to write audit log', error);
  }
}

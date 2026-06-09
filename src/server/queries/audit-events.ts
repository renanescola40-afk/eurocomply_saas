import { tryCreateAdminClient } from '@/lib/supabase/admin';

type AuditEventInput = {
  organizationId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function createAuditEvent(input: AuditEventInput) {
  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return { persisted: false };
  }

  const { error } = await supabase.from('audit_events').insert({
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.warn('[audit] create_event_failed', { code: error.code ?? 'unknown' });
    return { persisted: false };
  }

  return { persisted: true };
}

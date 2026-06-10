import { tryCreateAdminClient } from '@/lib/supabase/admin';

type AuditEventInput = {
  organizationId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export type AuditEventRecord = {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const AUDIT_EVENT_COLUMNS = 'id,organization_id,actor_user_id,action,entity_type,entity_id,metadata,created_at';

function isMissingAuditEventsTable(error: { code?: string; message?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205' || /audit_events/i.test(error.message ?? '');
}

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

export async function listAuditEvents(organizationId: string, limit = 100): Promise<AuditEventRecord[]> {
  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('audit_events')
    .select(AUDIT_EVENT_COLUMNS)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (!isMissingAuditEventsTable(error)) {
      console.warn('[audit] list_events_failed', { code: error.code ?? 'unknown' });
    }
    return [];
  }

  return (data ?? []) as unknown as AuditEventRecord[];
}

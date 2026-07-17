import { createAdminClient } from '@/lib/supabase/admin';
import type { AuditEventRecord } from '@/server/queries/audit-events';

const AUDIT_EVENT_COLUMNS =
  'id,organization_id,actor_user_id,action,entity_type,entity_id,metadata,created_at,previous_hash,event_hash,hash_algorithm,hash_signature';
const LEGACY_AUDIT_EVENT_COLUMNS =
  'id,organization_id,actor_user_id:actor_id,action,entity_type,entity_id,metadata,created_at';

type SupabaseError = { code?: string; message?: string };

function isMissingAuditChainColumns(error: SupabaseError) {
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    /(previous_hash|event_hash|hash_algorithm|hash_signature|actor_user_id)/i.test(error.message ?? '')
  );
}

export async function listAuditChainEventsForVerification(
  organizationId: string,
  limit: number,
): Promise<AuditEventRecord[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('audit_events')
    .select(AUDIT_EVENT_COLUMNS)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!error) return data ?? [];

  if (isMissingAuditChainColumns(error)) {
    const { data: legacyData, error: legacyError } = await supabase
      .from('audit_events')
      .select(LEGACY_AUDIT_EVENT_COLUMNS)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!legacyError) {
      return (legacyData ?? []).map((event) => ({
        id: event.id,
        organization_id: event.organization_id,
        actor_user_id: event.actor_user_id ?? null,
        action: event.action,
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        metadata: event.metadata,
        created_at: event.created_at,
      }));
    }

    console.warn('[audit] chain_verification_legacy_read_failed', {
      code: legacyError.code ?? 'unknown',
    });
    throw new Error('audit_chain_events_unavailable');
  }

  console.warn('[audit] chain_verification_read_failed', {
    code: error.code ?? 'unknown',
  });
  throw new Error('audit_chain_events_unavailable');
}

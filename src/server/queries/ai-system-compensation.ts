import { createAdminClient } from '@/lib/supabase/admin';
import type { AiSystemRecord } from '@/server/queries/ai-systems';

type CompensationRow = {
  outcome: 'restored' | 'state_changed' | 'not_found' | 'invalid_input';
};

export async function compensateAiSystemReassessmentAuditFailure(input: {
  systemId: string;
  organizationId: string;
  actorUserId: string;
  failedUpdatedAt: string;
  previous: AiSystemRecord;
}): Promise<{ restored: boolean; outcome: CompensationRow['outcome'] | 'provider_error'; errorCode?: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('compensate_ai_system_reassessment_audit_failure', {
    p_system_id: input.systemId,
    p_organization_id: input.organizationId,
    p_actor_user_id: input.actorUserId,
    p_failed_updated_at: input.failedUpdatedAt,
    p_previous: input.previous,
  });

  if (error) {
    return { restored: false, outcome: 'provider_error', errorCode: error.code ?? 'unknown' };
  }

  const row = Array.isArray(data) && data.length === 1 ? data[0] as Partial<CompensationRow> : null;
  const outcome = row?.outcome;
  if (!outcome || !['restored', 'state_changed', 'not_found', 'invalid_input'].includes(outcome)) {
    return { restored: false, outcome: 'provider_error', errorCode: 'invalid_result' };
  }

  return { restored: outcome === 'restored', outcome };
}

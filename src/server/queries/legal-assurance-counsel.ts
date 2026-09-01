import { createAdminClient } from '@/lib/supabase/admin';

export type CounselGateAction = 'CONFLICT_ACCEPT' | 'CONFLICT_DECLINE' | 'ENGAGEMENT_ACCEPT' | 'ENGAGEMENT_DECLINE';

type CounselGateRow = {
  outcome:
    | 'conflict_accepted'
    | 'conflict_declined'
    | 'engagement_accepted'
    | 'engagement_declined'
    | 'invalid_input'
    | 'not_found'
    | 'state_changed'
    | 'counsel_not_authorized'
    | 'invalid_state'
    | 'engagement_reference_required'
    | 'unsupported_action';
  review_id: string | null;
  review_status: string | null;
  review_updated_at: string | null;
};

type AssignmentRow = {
  outcome: 'assigned' | 'invalid_input' | 'not_found' | 'state_changed' | 'invalid_state' | 'counsel_not_verified';
  review_id: string | null;
  review_status: string | null;
  review_updated_at: string | null;
};

function oneRow<T>(value: unknown): T | null {
  return Array.isArray(value) && value.length === 1 && value[0] && typeof value[0] === 'object'
    ? value[0] as T
    : null;
}

function fail(area: string, error?: { code?: string | null } | null): never {
  console.warn('[legal-assurance] counsel_storage_failure', { area, code: error?.code ?? 'unknown' });
  throw new Error('legal_assurance_storage_unavailable');
}

export async function assignLegalReviewCounselAtomic(input: {
  reviewId: string;
  expectedUpdatedAt: string;
  lawFirmId: string;
  counselProfileId: string;
}): Promise<AssignmentRow> {
  const db = createAdminClient();
  const { data, error } = await db.rpc('assign_legal_review_counsel_atomic', {
    p_review_id: input.reviewId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_law_firm_id: input.lawFirmId,
    p_counsel_profile_id: input.counselProfileId,
  });
  if (error) fail('counsel_assign_atomic', error);
  const row = oneRow<AssignmentRow>(data);
  if (!row) throw new Error('legal_assurance_assignment_invalid_result');
  return row;
}

export async function counselLegalReviewGateAtomic(input: {
  reviewId: string;
  expectedUpdatedAt: string;
  counselProfileId: string;
  action: CounselGateAction;
  engagementReference?: string | null;
}): Promise<CounselGateRow> {
  const db = createAdminClient();
  const { data, error } = await db.rpc('counsel_legal_review_gate_atomic', {
    p_review_id: input.reviewId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_counsel_profile_id: input.counselProfileId,
    p_action: input.action,
    p_engagement_reference: input.engagementReference ?? null,
  });
  if (error) fail('counsel_gate_atomic', error);
  const row = oneRow<CounselGateRow>(data);
  if (!row) throw new Error('legal_assurance_counsel_gate_invalid_result');
  return row;
}

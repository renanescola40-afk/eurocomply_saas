import { createAdminClient } from '@/lib/supabase/admin';

import type { LegalReviewStatus } from '@/server/legal-assurance/core';

const REVIEW_COLUMNS = [
  'id',
  'organization_id',
  'ai_system_id',
  'requested_by_user_id',
  'requested_by_clerk_user_id',
  'law_firm_id',
  'assigned_counsel_id',
  'review_type',
  'jurisdiction',
  'scope',
  'status',
  'priority',
  'conflict_check_status',
  'conflict_checked_at',
  'engagement_status',
  'engagement_reference',
  'engagement_accepted_at',
  'requested_at',
  'accepted_at',
  'completed_at',
  'cancelled_at',
  'expires_at',
  'supersedes_review_id',
  'created_at',
  'updated_at',
].join(',');

const COUNSEL_COLUMNS = [
  'id',
  'user_id',
  'clerk_user_id',
  'law_firm_id',
  'professional_name',
  'professional_registration',
  'jurisdictions',
  'specialties',
  'verification_status',
  'verified_at',
  'active',
  'created_at',
  'updated_at',
].join(',');

export type LegalReviewRequestRecord = {
  id: string;
  organization_id: string;
  ai_system_id: string | null;
  requested_by_user_id: string | null;
  requested_by_clerk_user_id: string | null;
  law_firm_id: string | null;
  assigned_counsel_id: string | null;
  review_type: string;
  jurisdiction: string;
  scope: Record<string, unknown>;
  status: LegalReviewStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  conflict_check_status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  conflict_checked_at: string | null;
  engagement_status: 'NOT_STARTED' | 'PENDING' | 'ACCEPTED' | 'DECLINED';
  engagement_reference: string | null;
  engagement_accepted_at: string | null;
  requested_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  expires_at: string | null;
  supersedes_review_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CounselProfileRecord = {
  id: string;
  user_id: string | null;
  clerk_user_id: string | null;
  law_firm_id: string;
  professional_name: string;
  professional_registration: string | null;
  jurisdictions: string[];
  specialties: string[];
  verification_status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  verified_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type TransitionRow = {
  outcome: 'transitioned' | 'invalid_input' | 'not_found' | 'state_changed' | 'invalid_transition' | 'package_required' | 'decision_required';
  review_id: string | null;
  review_status: LegalReviewStatus | null;
  review_updated_at: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function actorColumns(userId: string): { user: string | null; clerk: string | null } {
  return isUuid(userId) ? { user: userId, clerk: null } : { user: null, clerk: userId };
}

function fail(area: string, error?: { code?: string | null } | null): never {
  console.warn('[legal-assurance] storage_failure', { area, code: error?.code ?? 'unknown' });
  throw new Error('legal_assurance_storage_unavailable');
}

export async function listLegalReviewsForOrganization(organizationId: string): Promise<LegalReviewRequestRecord[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('legal_review_requests')
    .select(REVIEW_COLUMNS)
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false });
  if (error) fail('review_list', error);
  return (data ?? []) as unknown as LegalReviewRequestRecord[];
}

export async function getLegalReviewForOrganization(
  organizationId: string,
  reviewId: string,
): Promise<LegalReviewRequestRecord | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('legal_review_requests')
    .select(REVIEW_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('id', reviewId)
    .maybeSingle();
  if (error) fail('review_get', error);
  return data as unknown as LegalReviewRequestRecord | null;
}

export async function createLegalReviewRequest(input: {
  organizationId: string;
  requestedBy: string;
  aiSystemId?: string | null;
  reviewType: string;
  jurisdiction: string;
  scope: Record<string, unknown>;
  priority: LegalReviewRequestRecord['priority'];
}): Promise<LegalReviewRequestRecord> {
  const db = createAdminClient();
  const actor = actorColumns(input.requestedBy);
  const { data, error } = await db
    .from('legal_review_requests')
    .insert({
      organization_id: input.organizationId,
      ai_system_id: input.aiSystemId ?? null,
      requested_by_user_id: actor.user,
      requested_by_clerk_user_id: actor.clerk,
      review_type: input.reviewType,
      jurisdiction: input.jurisdiction,
      scope: input.scope,
      priority: input.priority,
      status: 'REQUESTED',
    })
    .select(REVIEW_COLUMNS)
    .single();
  if (error || !data) fail('review_create', error);
  return data as unknown as LegalReviewRequestRecord;
}

export async function rollbackLegalReviewRequest(organizationId: string, reviewId: string): Promise<boolean> {
  const db = createAdminClient();
  const { error } = await db
    .from('legal_review_requests')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', reviewId)
    .eq('status', 'REQUESTED');
  return !error;
}

export async function getCurrentCounselProfile(userId: string): Promise<CounselProfileRecord | null> {
  const db = createAdminClient();
  let query = db.from('counsel_profiles').select(COUNSEL_COLUMNS);
  query = isUuid(userId) ? query.eq('user_id', userId) : query.eq('clerk_user_id', userId);
  const { data, error } = await query.maybeSingle();
  if (error) fail('counsel_profile_get', error);
  return data as unknown as CounselProfileRecord | null;
}

export async function listAssignedCounselReviews(counselProfileId: string): Promise<LegalReviewRequestRecord[]> {
  const db = createAdminClient();
  const grants = await db
    .from('legal_review_access_grants')
    .select('review_id')
    .eq('counsel_profile_id', counselProfileId)
    .eq('active', true)
    .is('revoked_at', null);
  if (grants.error) fail('counsel_grants_list', grants.error);
  const reviewIds = Array.from(new Set((grants.data ?? []).map((row) => String(row.review_id))));
  if (reviewIds.length === 0) return [];

  const { data, error } = await db
    .from('legal_review_requests')
    .select(REVIEW_COLUMNS)
    .in('id', reviewIds)
    .order('updated_at', { ascending: false });
  if (error) fail('counsel_reviews_list', error);
  return (data ?? []) as unknown as LegalReviewRequestRecord[];
}

export async function getAssignedCounselReview(
  counselProfileId: string,
  reviewId: string,
): Promise<LegalReviewRequestRecord | null> {
  const db = createAdminClient();
  const grant = await db
    .from('legal_review_access_grants')
    .select('id')
    .eq('review_id', reviewId)
    .eq('counsel_profile_id', counselProfileId)
    .eq('active', true)
    .is('revoked_at', null)
    .maybeSingle();
  if (grant.error) fail('counsel_grant_get', grant.error);
  if (!grant.data) return null;

  const { data, error } = await db
    .from('legal_review_requests')
    .select(REVIEW_COLUMNS)
    .eq('id', reviewId)
    .maybeSingle();
  if (error) fail('counsel_review_get', error);
  return data as unknown as LegalReviewRequestRecord | null;
}

export async function transitionLegalReviewAtomic(input: {
  reviewId: string;
  expectedUpdatedAt: string;
  nextStatus: LegalReviewStatus;
}): Promise<TransitionRow> {
  const db = createAdminClient();
  const { data, error } = await db.rpc('transition_legal_review_atomic', {
    p_review_id: input.reviewId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_next_status: input.nextStatus,
  });
  if (error) fail('review_transition_atomic', error);
  const row = Array.isArray(data) && data.length === 1 ? data[0] as unknown as TransitionRow : null;
  if (!row || ![
    'transitioned',
    'invalid_input',
    'not_found',
    'state_changed',
    'invalid_transition',
    'package_required',
    'decision_required',
  ].includes(row.outcome)) {
    throw new Error('legal_assurance_transition_invalid_result');
  }
  return row;
}

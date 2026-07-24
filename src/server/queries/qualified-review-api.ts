import { createAdminClient } from '@/lib/supabase/admin';

function fail(area: string, error?: { code?: string } | null): never {
  console.warn('[qualified-review-api] storage_failure', { area, code: error?.code ?? 'unknown' });
  throw new Error('qualified_review_storage_unavailable');
}

export async function listQualifiedReviewApiSnapshot(organizationId: string) {
  const db = createAdminClient();
  const [campaigns, reviewers, assignments, submissions, decisions, events] = await Promise.all([
    db.from('qualified_review_campaigns').select('*').eq('organization_id', organizationId).order('opened_at', { ascending: false }),
    db.from('qualified_reviewers').select('*').eq('organization_id', organizationId).order('display_name'),
    db.from('qualified_review_assignments').select('*').eq('organization_id', organizationId).order('assigned_at', { ascending: false }),
    db.from('qualified_review_submissions').select('*').eq('organization_id', organizationId).order('submitted_at', { ascending: false }),
    db.from('qualified_review_decisions').select('*').eq('organization_id', organizationId).order('decided_at', { ascending: false }),
    db.from('qualified_review_events').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(250),
  ]);
  for (const [area, result] of [['campaigns', campaigns], ['reviewers', reviewers], ['assignments', assignments], ['submissions', submissions], ['decisions', decisions], ['events', events]] as const) {
    if (result.error) fail(area, result.error);
  }
  return { campaigns: campaigns.data ?? [], reviewers: reviewers.data ?? [], assignments: assignments.data ?? [], submissions: submissions.data ?? [], decisions: decisions.data ?? [], events: events.data ?? [] };
}

export async function createQualifiedReviewCampaign(input: { organizationId: string; actorUserId: string; targetSha: string }) {
  const db = createAdminClient();
  const { data, error } = await db.from('qualified_review_campaigns').insert({ organization_id: input.organizationId, target_sha: input.targetSha, opened_by: input.actorUserId, status: 'draft' }).select('*').single();
  if (error || !data) fail('campaign_create', error);
  return data;
}

export async function registerQualifiedReviewer(input: { organizationId: string; actorUserId: string; email: string; displayName: string; qualificationSummary: string; qualificationEvidence: string[]; independenceDeclared: boolean }) {
  const db = createAdminClient();
  const { data, error } = await db.from('qualified_reviewers').insert({
    organization_id: input.organizationId,
    email: input.email,
    display_name: input.displayName,
    qualification_summary: input.qualificationSummary,
    qualification_evidence: input.qualificationEvidence,
    independence_declared: input.independenceDeclared,
    verified_by: input.actorUserId,
    verified_at: new Date().toISOString(),
  }).select('*').single();
  if (error || !data) fail('reviewer_register', error);
  return data;
}

export async function createQualifiedReviewAssignment(input: { organizationId: string; campaignId: string; reviewerId: string; workstreamId: string; weight: number; actorUserId: string; dueAt?: string | null }) {
  const db = createAdminClient();
  const { data, error } = await db.from('qualified_review_assignments').insert({
    organization_id: input.organizationId,
    campaign_id: input.campaignId,
    reviewer_id: input.reviewerId,
    workstream_id: input.workstreamId,
    weight: input.weight,
    assigned_by: input.actorUserId,
    prepared_by: input.actorUserId,
    due_at: input.dueAt ?? null,
    status: 'assigned',
  }).select('*').single();
  if (error || !data) fail('assignment_create', error);
  return data;
}

export async function createQualifiedReviewSubmission(input: { organizationId: string; assignmentId: string; targetSha: string; opinion: string; conclusion: string; scope: string[]; evidenceLocations: string[]; limitations: string[]; validUntil: string; integritySha256: string; actorUserId: string }) {
  const db = createAdminClient();
  const { data, error } = await db.from('qualified_review_submissions').insert({
    organization_id: input.organizationId,
    assignment_id: input.assignmentId,
    target_sha: input.targetSha,
    opinion: input.opinion,
    conclusion: input.conclusion,
    scope: input.scope,
    evidence_locations: input.evidenceLocations,
    limitations: input.limitations,
    valid_until: input.validUntil,
    integrity_sha256: input.integritySha256,
    submitted_by: input.actorUserId,
  }).select('*').single();
  if (error || !data) fail('submission_create', error);
  return data;
}

export async function transitionQualifiedReviewAssignment(input: { assignmentId: string; actorUserId: string; expectedVersion: number; nextStatus: string; reason?: string | null }) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('transition_qualified_review_assignment', {
    p_assignment_id: input.assignmentId,
    p_actor_id: input.actorUserId,
    p_expected_version: input.expectedVersion,
    p_next_status: input.nextStatus,
    p_reason: input.reason ?? null,
  });
  if (error) fail('assignment_transition', error);
  return data;
}

export async function exportQualifiedReviewEvidence(organizationId: string, campaignId: string) {
  const snapshot = await listQualifiedReviewApiSnapshot(organizationId);
  const campaign = snapshot.campaigns.find((item: any) => item.id === campaignId);
  if (!campaign) return null;
  const assignments = snapshot.assignments.filter((item: any) => item.campaign_id === campaignId);
  const assignmentIds = new Set(assignments.map((item: any) => item.id));
  return {
    schema: 'risck-comply.qualified-review-export.v1',
    generatedAt: new Date().toISOString(),
    organizationId,
    campaign,
    reviewers: snapshot.reviewers.filter((reviewer: any) => assignments.some((assignment: any) => assignment.reviewer_id === reviewer.id)).map((reviewer: any) => ({ id: reviewer.id, display_name: reviewer.display_name, qualification_summary: reviewer.qualification_summary, independence_declared: reviewer.independence_declared, verified_at: reviewer.verified_at })),
    assignments,
    submissions: snapshot.submissions.filter((item: any) => assignmentIds.has(item.assignment_id)),
    decisions: snapshot.decisions.filter((item: any) => assignmentIds.has(item.assignment_id)),
    events: snapshot.events.filter((item: any) => item.campaign_id === campaignId),
    truthBoundary: 'Operational evidence only; not certification, regulator approval or a legal guarantee.',
  };
}

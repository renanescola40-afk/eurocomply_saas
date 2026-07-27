import { createAdminClient } from '@/lib/supabase/admin';
import { evaluateQualifiedReviewControlCenter } from '@/server/ai-governance/qualified-review-control-center';

function fail(area: string, error?: { code?: string } | null): never {
  console.warn('[qualified-review-control-center] storage_failure', { area, code: error?.code ?? 'unknown' });
  throw new Error('qualified_review_control_center_unavailable');
}

export async function getQualifiedReviewControlCenter(organizationId: string) {
  const db = createAdminClient();
  const [campaigns, assignments, reviewers, invites, submissions, decisions] = await Promise.all([
    db.from('qualified_review_control_center_v1').select('*').eq('organization_id', organizationId).order('opened_at', { ascending: false }),
    db.from('qualified_review_assignments').select('id,campaign_id,reviewer_id,workstream_id,weight,status,due_at,version,updated_at').eq('organization_id', organizationId).order('assigned_at', { ascending: true }),
    db.from('qualified_reviewers').select('id,display_name,qualification_summary,verified_at,active').eq('organization_id', organizationId).order('display_name', { ascending: true }),
    db.from('qualified_reviewer_invites').select('id,assignment_id,reviewer_id,expires_at,accepted_at,revoked_at,created_at').eq('organization_id', organizationId).order('created_at', { ascending: false }),
    db.from('qualified_review_submissions').select('id,assignment_id,target_sha,conclusion,valid_until,submitted_at,superseded_at').eq('organization_id', organizationId).order('submitted_at', { ascending: false }),
    db.from('qualified_review_decisions').select('id,assignment_id,decision,reason,decided_at').eq('organization_id', organizationId).order('decided_at', { ascending: false }),
  ]);
  for (const [area, result] of [['campaigns', campaigns], ['assignments', assignments], ['reviewers', reviewers], ['invites', invites], ['submissions', submissions], ['decisions', decisions]] as const) {
    if (result.error) fail(area, result.error);
  }
  const latestCampaign = campaigns.data?.[0] ?? null;
  const latestAssignments = latestCampaign ? (assignments.data ?? []).filter((item) => item.campaign_id === latestCampaign.campaign_id) : [];
  const readiness = evaluateQualifiedReviewControlCenter(latestAssignments);
  return {
    campaigns: campaigns.data ?? [],
    assignments: assignments.data ?? [],
    reviewers: reviewers.data ?? [],
    invites: invites.data ?? [],
    submissions: submissions.data ?? [],
    decisions: decisions.data ?? [],
    readiness,
  };
}

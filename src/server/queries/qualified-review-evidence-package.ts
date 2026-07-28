import { createAdminClient } from '@/lib/supabase/admin';
import { buildQualifiedReviewEvidencePackage } from '@/server/ai-governance/qualified-review-evidence-package';

export async function getQualifiedReviewEvidencePackage(input: { organizationId: string; campaignId: string }) {
  const db = createAdminClient();
  const { data: campaign, error: campaignError } = await db
    .from('qualified_review_campaigns')
    .select('id,organization_id,target_sha,status')
    .eq('id', input.campaignId)
    .eq('organization_id', input.organizationId)
    .single();
  if (campaignError || !campaign) throw new Error('qualified_review_campaign_not_found');

  const { data: rows, error } = await db
    .from('qualified_review_evidence_handoff_view')
    .select('*')
    .eq('organization_id', input.organizationId)
    .eq('campaign_id', input.campaignId)
    .order('workstream_id');
  if (error) throw new Error('qualified_review_evidence_unavailable');

  const blockers: string[] = [];
  const items = (rows ?? []).flatMap((row) => {
    if (!row.assignment_id) blockers.push(`missing_assignment:${row.workstream_id}`);
    if (!row.submission_id) blockers.push(`missing_submission:${row.workstream_id}`);
    if (!row.decision_id) blockers.push(`missing_decision:${row.workstream_id}`);
    if (row.assignment_status !== 'accepted') blockers.push(`assignment_not_accepted:${row.workstream_id}`);
    if (row.target_sha && row.target_sha !== campaign.target_sha) blockers.push(`sha_mismatch:${row.workstream_id}`);
    if (!row.assignment_id || !row.reviewer_id || !row.submission_id || !row.decision_id || !row.integrity_sha256 || !row.accepted_at || !row.valid_until) return [];
    return [{
      workstreamId: row.workstream_id,
      weight: row.weight,
      assignmentId: row.assignment_id,
      reviewerId: row.reviewer_id,
      submissionId: row.submission_id,
      decisionId: row.decision_id,
      targetSha: row.target_sha,
      integritySha256: row.integrity_sha256,
      acceptedAt: row.accepted_at,
      validUntil: row.valid_until,
    }];
  });

  const acceptedPoints = items.reduce((sum, item) => sum + item.weight, 0);
  if (items.length !== 8) blockers.push(`accepted_review_count:${items.length}`);
  if (acceptedPoints !== 51) blockers.push(`accepted_points:${acceptedPoints}`);

  return buildQualifiedReviewEvidencePackage({
    campaignId: campaign.id,
    organizationId: campaign.organization_id,
    targetSha: campaign.target_sha,
    generatedAt: new Date().toISOString(),
    acceptedPoints,
    items,
    blockers,
  });
}

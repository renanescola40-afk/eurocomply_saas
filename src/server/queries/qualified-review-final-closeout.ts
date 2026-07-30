import { createAdminClient } from '@/lib/supabase/admin';
import { evaluateQualifiedReviewFinalCloseout } from '@/server/ai-governance/qualified-review-final-closeout';

export async function buildAndPersistQualifiedReviewFinalCloseout(input: {
  organizationId: string;
  campaignId: string;
  actorUserId: string;
}) {
  const db = createAdminClient();
  const [campaign, assignments, packages] = await Promise.all([
    db.from('qualified_review_campaigns').select('id,target_sha,status').eq('organization_id', input.organizationId).eq('id', input.campaignId).single(),
    db.from('qualified_review_assignments').select('id,status,points,workstream_id').eq('organization_id', input.organizationId).eq('campaign_id', input.campaignId),
    db.from('qualified_review_evidence_packages').select('manifest_digest,superseded_at').eq('organization_id', input.organizationId).eq('campaign_id', input.campaignId).is('superseded_at', null).maybeSingle(),
  ]);
  if (campaign.error || !campaign.data) throw new Error('qualified_review_campaign_not_found');
  if (assignments.error || packages.error) throw new Error('qualified_review_closeout_unavailable');

  const rows = assignments.data ?? [];
  const accepted = rows.filter((row) => row.status === 'accepted');
  const result = evaluateQualifiedReviewFinalCloseout({
    campaignId: input.campaignId,
    targetSha: campaign.data.target_sha,
    acceptedReviewCount: accepted.length,
    acceptedPoints: accepted.reduce((sum, row) => sum + Number(row.points ?? 0), 0),
    evidencePackageDigest: packages.data?.manifest_digest ?? null,
    technicalControls: {
      campaigns: true,
      reviewers: rows.length > 0,
      assignments: rows.length === 8,
      invites: true,
      sessions: true,
      attestations: true,
      submissions: accepted.length === 8,
      decisions: accepted.length === 8,
      reminders: true,
      evidence_packages: Boolean(packages.data?.manifest_digest),
    },
  });

  const { data: closeoutId, error } = await db.rpc('persist_qualified_review_technical_closeout', {
    p_organization_id: input.organizationId,
    p_campaign_id: input.campaignId,
    p_target_sha: campaign.data.target_sha,
    p_technical_complete: result.technicalComplete,
    p_human_status: result.humanStatus,
    p_closeout_digest: result.closeoutDigest,
    p_snapshot: result,
    p_finalized_by: input.actorUserId,
  });
  if (error || !closeoutId) throw new Error('qualified_review_closeout_persist_failed');
  return { closeoutId, closeout: result };
}

import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildPromotionManifest, evaluateCampaignCloseout } from '@/server/ai-governance/qualified-review-delivery';

const WORKSTREAMS = ['LEGAL-RULES','PROHIBITED-PRACTICES','ARTICLE-50','FRIA','DEPLOYER','HIGH-RISK-PROVIDER','CONFORMITY','GPAI'] as const;

export async function promoteQualifiedReviewCampaign(input: { organizationId: string; campaignId: string; actorUserId: string }) {
  const db = createAdminClient();
  const [{ data: campaign, error: campaignError }, { data: assignments, error: assignmentError }, { data: submissions, error: submissionError }] = await Promise.all([
    db.from('qualified_review_campaigns').select('id,target_sha,status').eq('organization_id', input.organizationId).eq('id', input.campaignId).maybeSingle(),
    db.from('qualified_review_assignments').select('id,workstream_id,status,weight').eq('organization_id', input.organizationId).eq('campaign_id', input.campaignId),
    db.from('qualified_review_submissions').select('assignment_id,valid_until,integrity_sha256,superseded_at').eq('organization_id', input.organizationId),
  ]);
  if (campaignError || assignmentError || submissionError) throw new Error('qualified_review_promotion_storage_unavailable', { cause: campaignError ?? assignmentError ?? submissionError });
  if (!campaign) return { outcome: 'not_found' } as const;
  const current = new Map((submissions ?? []).filter((item) => !item.superseded_at).map((item) => [item.assignment_id, item]));
  const closeout = evaluateCampaignCloseout({ targetSha: campaign.target_sha, expectedWorkstreams: WORKSTREAMS, assignments: (assignments ?? []).map((item) => ({ workstreamId: item.workstream_id, status: item.status, weight: item.weight, validUntil: current.get(item.id)?.valid_until ?? null })) });
  if (!closeout.ready) return { outcome: 'not_ready', closeout } as const;
  const evidenceDigests = (assignments ?? []).map((item) => current.get(item.id)?.integrity_sha256).filter((value): value is string => Boolean(value));
  const manifest = buildPromotionManifest({ campaignId: campaign.id, targetSha: campaign.target_sha, evidenceDigests, completedWeight: closeout.completedWeight });
  const integritySha256 = createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
  const { data, error } = await db.rpc('promote_qualified_review_campaign', { p_organization_id: input.organizationId, p_campaign_id: input.campaignId, p_actor_id: input.actorUserId, p_manifest: manifest, p_integrity_sha256: integritySha256 });
  if (error) throw new Error('qualified_review_promotion_failed', { cause: error });
  return { outcome: 'promoted', promotion: data, manifest, integritySha256 } as const;
}

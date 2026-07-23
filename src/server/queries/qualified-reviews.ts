type SupabaseLike = {
  from(table: string): {
    select(columns: string): any;
    insert(values: unknown): any;
    update(values: unknown): any;
  };
  rpc(name: string, args: Record<string, unknown>): any;
};

export async function listQualifiedReviewWorkspace(client: SupabaseLike, organizationId: string) {
  const [cases, reviewers, decisions] = await Promise.all([
    client.from('qualified_review_cases').select('*').eq('organization_id', organizationId).order('requirement_id'),
    client.from('qualified_reviewers').select('*').eq('organization_id', organizationId).order('name'),
    client.from('qualified_review_decisions').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }),
  ]);
  if (cases.error) throw cases.error;
  if (reviewers.error) throw reviewers.error;
  if (decisions.error) throw decisions.error;
  return { cases: cases.data ?? [], reviewers: reviewers.data ?? [], decisions: decisions.data ?? [] };
}

export async function createQualifiedReviewCase(client: SupabaseLike, input: {
  organizationId: string;
  requirementId: string;
  reviewedSha: string;
  preparedBy: string;
}) {
  const result = await client.from('qualified_review_cases').insert({
    organization_id: input.organizationId,
    requirement_id: input.requirementId,
    reviewed_sha: input.reviewedSha,
    prepared_by: input.preparedBy,
    status: 'DRAFT',
  }).select('*').single();
  if (result.error) throw result.error;
  return result.data;
}

export async function transitionQualifiedReviewCase(client: SupabaseLike, input: {
  caseId: string;
  actorId: string;
  expectedVersion: number;
  nextStatus: string;
  rationale: string;
  evidenceDigest?: string;
}) {
  const result = await client.rpc('transition_qualified_review_case', {
    p_case_id: input.caseId,
    p_actor_id: input.actorId,
    p_expected_version: input.expectedVersion,
    p_next_status: input.nextStatus,
    p_rationale: input.rationale,
    p_evidence_digest: input.evidenceDigest ?? null,
  });
  if (result.error) throw result.error;
  return result.data;
}

type SupabaseReadClient = { from(table: string): { select(columns: string): any } };

async function read(result: Promise<{ data: unknown[] | null; error: unknown | null }>, label: string) {
  const resolved = await result;
  if (resolved.error) throw new Error(`Failed to load ${label}`, { cause: resolved.error });
  return resolved.data ?? [];
}

export async function listQualifiedReviewOperations(client: SupabaseReadClient, organizationId: string) {
  if (!organizationId.trim()) throw new Error('organizationId is required');
  const byOrg = (table: string, order: string, ascending = false) => client.from(table).select('*').eq('organization_id', organizationId).order(order, { ascending });
  const [campaigns, reviewers, assignments, submissions, decisions, events] = await Promise.all([
    read(byOrg('qualified_review_campaigns', 'opened_at'), 'campaigns'),
    read(byOrg('qualified_reviewers', 'display_name', true), 'reviewers'),
    read(byOrg('qualified_review_assignments', 'assigned_at'), 'assignments'),
    read(byOrg('qualified_review_submissions', 'submitted_at'), 'submissions'),
    read(byOrg('qualified_review_decisions', 'decided_at'), 'decisions'),
    read(byOrg('qualified_review_events', 'created_at').limit(200), 'events'),
  ]);
  return { campaigns, reviewers, assignments, submissions, decisions, events };
}

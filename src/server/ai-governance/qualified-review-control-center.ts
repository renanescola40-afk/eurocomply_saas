export const QUALIFIED_REVIEW_WORKSTREAMS = [
  { id: 'LEGAL-RULES', weight: 4 },
  { id: 'PROHIBITED-PRACTICES', weight: 7 },
  { id: 'ARTICLE-50', weight: 8 },
  { id: 'FRIA', weight: 6 },
  { id: 'DEPLOYER', weight: 7 },
  { id: 'HIGH-RISK-PROVIDER', weight: 9 },
  { id: 'CONFORMITY', weight: 5 },
  { id: 'GPAI', weight: 5 },
] as const;

type Assignment = {
  workstream_id: string;
  weight: number;
  status: string;
  due_at?: string | null;
};

export function evaluateQualifiedReviewControlCenter(assignments: Assignment[], now = new Date()) {
  const canonical = new Map(QUALIFIED_REVIEW_WORKSTREAMS.map((item) => [item.id, item.weight]));
  const unique = new Map<string, Assignment>();
  const blockers: string[] = [];

  for (const assignment of assignments) {
    if (!canonical.has(assignment.workstream_id)) {
      blockers.push(`unknown_workstream:${assignment.workstream_id}`);
      continue;
    }
    if (unique.has(assignment.workstream_id)) blockers.push(`duplicate_workstream:${assignment.workstream_id}`);
    unique.set(assignment.workstream_id, assignment);
    if (canonical.get(assignment.workstream_id) !== assignment.weight) blockers.push(`weight_mismatch:${assignment.workstream_id}`);
  }

  const acceptedWeight = [...unique.values()].filter((item) => item.status === 'accepted').reduce((sum, item) => sum + item.weight, 0);
  const overdue = [...unique.values()].filter((item) => item.due_at && new Date(item.due_at) < now && !['accepted','rejected','expired','revoked'].includes(item.status));
  const missing = QUALIFIED_REVIEW_WORKSTREAMS.filter((item) => !unique.has(item.id)).map((item) => item.id);
  blockers.push(...missing.map((id) => `missing_workstream:${id}`));

  const technicallyReady = blockers.length === 0 && unique.size === 8 && acceptedWeight === 51 && [...unique.values()].every((item) => item.status === 'accepted');

  return {
    technicallyReady,
    humanReviewRequired: !technicallyReady,
    acceptedWeight,
    totalWeight: [...unique.values()].reduce((sum, item) => sum + item.weight, 0),
    assignmentCount: unique.size,
    overdueCount: overdue.length,
    blockers,
  };
}

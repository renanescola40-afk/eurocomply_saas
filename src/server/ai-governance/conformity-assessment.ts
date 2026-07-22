export const CONFORMITY_STEPS = [
  'applicability','assessment_route','qms_link','technical_documentation','risk_management','testing_and_validation','notified_body','eu_declaration','ce_marking','eu_database_registration','change_control','market_release_authorisation',
] as const;

export type ConformityStep = (typeof CONFORMITY_STEPS)[number];
export type ConformityRecord = { step: ConformityStep; required: boolean; status: 'missing'|'draft'|'reviewed'|'approved'|'not_applicable'; evidenceDigest?: string; reviewerId?: string; expiresAt?: string };

export function evaluateConformityAssessment(records: ConformityRecord[], now = new Date()) {
  const byStep = new Map(records.map((record) => [record.step, record]));
  const blockers: string[] = [];
  for (const step of CONFORMITY_STEPS) {
    const record = byStep.get(step);
    if (!record) { blockers.push(`${step}:missing`); continue; }
    if (!record.required && record.status === 'not_applicable') continue;
    if (record.status !== 'approved') blockers.push(`${step}:not_approved`);
    if (!record.evidenceDigest) blockers.push(`${step}:evidence_missing`);
    if (!record.reviewerId) blockers.push(`${step}:reviewer_missing`);
    if (record.expiresAt && new Date(record.expiresAt) <= now) blockers.push(`${step}:expired`);
  }
  return { complete: blockers.length === 0, releaseAllowed: blockers.length === 0, blockers, evidenceBoundary: 'Readiness support only; this does not issue a declaration, CE mark, registration or regulator approval.' };
}

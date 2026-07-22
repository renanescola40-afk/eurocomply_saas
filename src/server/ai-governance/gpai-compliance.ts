export const GPAI_OBLIGATIONS = [
  'technical_documentation','downstream_information','copyright_policy','training_content_summary','provider_contact','incident_process','security_controls','model_evaluation','systemic_risk_assessment','adversarial_testing','serious_incident_reporting','energy_efficiency_reporting',
] as const;

export type GpaiObligation = (typeof GPAI_OBLIGATIONS)[number];
export type GpaiProfile = { systemicRisk: boolean; openSource: boolean; placedOnEuMarket: boolean };
export type GpaiRecord = { obligation: GpaiObligation; applicable: boolean; status: 'missing'|'draft'|'reviewed'|'approved'; evidenceDigest?: string; accountableOwnerId?: string };

const systemicOnly = new Set<GpaiObligation>(['systemic_risk_assessment','adversarial_testing','serious_incident_reporting','energy_efficiency_reporting']);

export function evaluateGpaiCompliance(profile: GpaiProfile, records: GpaiRecord[]) {
  if (!profile.placedOnEuMarket) return { applicable: false, complete: true, blockers: [] as string[] };
  const byObligation = new Map(records.map((record) => [record.obligation, record]));
  const blockers: string[] = [];
  for (const obligation of GPAI_OBLIGATIONS) {
    if (systemicOnly.has(obligation) && !profile.systemicRisk) continue;
    const record = byObligation.get(obligation);
    if (!record || !record.applicable) { blockers.push(`${obligation}:missing`); continue; }
    if (record.status !== 'approved') blockers.push(`${obligation}:not_approved`);
    if (!record.evidenceDigest) blockers.push(`${obligation}:evidence_missing`);
    if (!record.accountableOwnerId) blockers.push(`${obligation}:owner_missing`);
  }
  return { applicable: true, complete: blockers.length === 0, blockers, legalReviewRequired: profile.openSource || profile.systemicRisk, evidenceBoundary: 'Readiness support only; model classification and legal applicability require qualified review.' };
}

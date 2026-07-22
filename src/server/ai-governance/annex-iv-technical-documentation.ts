export const ANNEX_IV_SECTIONS = [
  'general_description','system_elements','development_process','monitoring_and_control','risk_management','data_governance','performance_metrics','cybersecurity','human_oversight','change_management','standards_and_specifications','post_market_monitoring',
] as const;

export type AnnexIvSection = (typeof ANNEX_IV_SECTIONS)[number];
export type AnnexIvRecord = { section: AnnexIvSection; status: 'missing'|'draft'|'reviewed'|'approved'; evidenceDigest?: string; reviewerId?: string };

export function evaluateAnnexIvPackage(records: AnnexIvRecord[]) {
  const bySection = new Map(records.map((record) => [record.section, record]));
  const missing = ANNEX_IV_SECTIONS.filter((section) => !bySection.has(section) || bySection.get(section)?.status === 'missing');
  const unapproved = ANNEX_IV_SECTIONS.filter((section) => bySection.get(section)?.status !== 'approved');
  const missingEvidence = ANNEX_IV_SECTIONS.filter((section) => !bySection.get(section)?.evidenceDigest);
  const missingReview = ANNEX_IV_SECTIONS.filter((section) => !bySection.get(section)?.reviewerId);
  return { complete: missing.length === 0 && unapproved.length === 0 && missingEvidence.length === 0 && missingReview.length === 0, missing, unapproved, missingEvidence, missingReview };
}

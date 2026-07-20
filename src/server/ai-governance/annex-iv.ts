export const ANNEX_IV_SECTIONS = [
  'general_description',
  'system_elements_and_development',
  'monitoring_functioning_and_control',
  'risk_management',
  'data_governance',
  'performance_metrics',
  'human_oversight',
  'cybersecurity',
  'lifecycle_changes',
  'standards_and_specifications',
  'eu_declaration_and_conformity',
  'post_market_monitoring',
] as const;

export type AnnexIvSection = (typeof ANNEX_IV_SECTIONS)[number];
export type AnnexIvSectionInput = {
  summary?: string | null;
  evidenceReferences?: string[] | null;
  ownerId?: string | null;
  reviewedAt?: string | null;
};
export type AnnexIvInput = Partial<Record<AnnexIvSection, AnnexIvSectionInput>>;

export type AnnexIvSectionResult = {
  section: AnnexIvSection;
  articleReference: string;
  complete: boolean;
  missing: Array<'summary' | 'evidenceReferences' | 'ownerId' | 'reviewedAt'>;
};

const REFERENCES: Record<AnnexIvSection, string> = {
  general_description: 'Annex IV(1)',
  system_elements_and_development: 'Annex IV(2)',
  monitoring_functioning_and_control: 'Annex IV(3)',
  risk_management: 'Annex IV(4)',
  data_governance: 'Annex IV(5)',
  performance_metrics: 'Annex IV(6)',
  human_oversight: 'Annex IV(7)',
  cybersecurity: 'Annex IV(8)',
  lifecycle_changes: 'Annex IV(9)',
  standards_and_specifications: 'Annex IV(10)',
  eu_declaration_and_conformity: 'Annex IV(11)',
  post_market_monitoring: 'Annex IV(12)',
};

export function assessAnnexIv(input: AnnexIvInput) {
  const sections: AnnexIvSectionResult[] = ANNEX_IV_SECTIONS.map((section) => {
    const value = input[section] ?? {};
    const missing: AnnexIvSectionResult['missing'] = [];
    if (!value.summary?.trim()) missing.push('summary');
    if (!value.evidenceReferences?.filter(Boolean).length) missing.push('evidenceReferences');
    if (!value.ownerId?.trim()) missing.push('ownerId');
    if (!value.reviewedAt?.trim()) missing.push('reviewedAt');
    return { section, articleReference: REFERENCES[section], complete: missing.length === 0, missing };
  });

  const completed = sections.filter((section) => section.complete).length;
  const completionPercent = Math.round((completed / sections.length) * 100);
  return {
    version: '2026-07-20.1',
    complete: completed === sections.length,
    completedSections: completed,
    totalSections: sections.length,
    completionPercent,
    sections,
    missingSections: sections.filter((section) => !section.complete).map((section) => section.section),
    evidenceBoundary: 'Completeness confirms required fields and references are present. It does not validate the truth, legal sufficiency or technical quality of the supplied documentation.',
  };
}

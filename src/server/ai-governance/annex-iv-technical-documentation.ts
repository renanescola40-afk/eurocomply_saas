export interface AnnexIvSection {
  id: string;
  applicable: boolean;
  ownerId?: string | null;
  contentVersion?: string | null;
  evidenceIds: string[];
  approvedBy?: string | null;
  approvedAt?: string | null;
  materialChangeAfterApproval: boolean;
}

export const ANNEX_IV_SECTION_IDS = [
  'general-description', 'intended-purpose', 'system-versions', 'architecture', 'development-methods',
  'data-governance', 'training-validation-testing', 'metrics-performance', 'limitations', 'risk-management',
  'human-oversight', 'cybersecurity', 'logging', 'post-market-monitoring', 'change-history',
  'provider-documentation',
] as const;

export interface AnnexIvDecision {
  status: 'draft' | 'review_required' | 'approved';
  blockers: string[];
  completeness: number;
}

export function decideAnnexIvDocumentation(sections: AnnexIvSection[]): AnnexIvDecision {
  const blockers: string[] = [];
  const applicable = sections.filter((section) => section.applicable);
  for (const section of applicable) {
    if (!section.ownerId) blockers.push(`${section.id}:owner_missing`);
    if (!section.contentVersion) blockers.push(`${section.id}:version_missing`);
    if (section.evidenceIds.length === 0) blockers.push(`${section.id}:evidence_missing`);
    if (!section.approvedBy || !section.approvedAt) blockers.push(`${section.id}:approval_missing`);
    if (section.materialChangeAfterApproval) blockers.push(`${section.id}:material_change_reassessment_required`);
  }
  const complete = applicable.filter((section) =>
    Boolean(section.ownerId && section.contentVersion && section.evidenceIds.length && section.approvedBy && section.approvedAt && !section.materialChangeAfterApproval),
  ).length;
  const completeness = applicable.length === 0 ? 0 : Math.round((complete / applicable.length) * 100);
  if (blockers.some((blocker) => blocker.includes('material_change'))) return { status: 'review_required', blockers, completeness };
  return { status: blockers.length ? 'draft' : 'approved', blockers, completeness };
}

export function buildAnnexIvExportManifest(systemId: string, sections: AnnexIvSection[]) {
  const decision = decideAnnexIvDocumentation(sections);
  return {
    schema: 'risck-comply.annex-iv-export.v1',
    systemId,
    status: decision.status,
    completeness: decision.completeness,
    sectionIds: sections.map((section) => section.id).sort(),
    evidenceCount: sections.reduce((sum, section) => sum + section.evidenceIds.length, 0),
    regulatorApprovalClaimed: false,
  };
}

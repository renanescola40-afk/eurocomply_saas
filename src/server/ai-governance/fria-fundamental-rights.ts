export const FRIA_STAGES = ['draft','applicability_review','assessment','mitigation','approval','approved','blocked','retired'] as const;
export type FriaStage = (typeof FRIA_STAGES)[number];
export type FriaApplicability = 'required' | 'not_required' | 'uncertain';
export type FriaImpact = 'none' | 'low' | 'medium' | 'high' | 'critical' | 'unknown';

export type FriaInput = {
  applicability: FriaApplicability;
  publicAuthorityOrPublicService: boolean;
  highRiskSystem: boolean;
  intendedPurposeRecorded: boolean;
  affectedGroupsIdentified: boolean;
  vulnerableGroupsConsidered: boolean;
  rightsMapped: boolean;
  impactAssessmentComplete: boolean;
  mitigationPlanComplete: boolean;
  humanOversightComplete: boolean;
  complaintsAndRedressComplete: boolean;
  monitoringPlanComplete: boolean;
  dataProtectionCoordinationComplete: boolean;
  highestResidualImpact: FriaImpact;
  accountableOwnerAssigned: boolean;
  independentReviewerAssigned: boolean;
  approverAssigned: boolean;
  legalReviewComplete: boolean;
  approvedAt?: string | null;
  retiredAt?: string | null;
};

export type FriaControl = { id: string; title: string; reference: string; required: boolean; satisfied: boolean; blocking: boolean };
export type FriaDecision = {
  version: string;
  stage: FriaStage;
  productionUseAllowed: boolean;
  legalReviewRequired: boolean;
  controls: FriaControl[];
  missingControlIds: string[];
  blockingControlIds: string[];
  requiredActions: string[];
  evidenceBoundary: string;
};

const VERSION = '2026-07-21.1';
const control = (id:string,title:string,reference:string,required:boolean,satisfied:boolean,blocking=true):FriaControl => ({id,title,reference,required,satisfied,blocking});

export function decideFria(input: FriaInput): FriaDecision {
  const applicabilityUncertain = input.applicability === 'uncertain';
  const applicabilityRequired = input.applicability === 'required';
  const likelyApplicable = input.publicAuthorityOrPublicService && input.highRiskSystem;
  const required = applicabilityRequired || applicabilityUncertain || likelyApplicable;
  const severeResidual = ['high','critical','unknown'].includes(input.highestResidualImpact);

  const controls: FriaControl[] = [
    control('FRIA-01','Applicability rationale recorded','EU AI Act Article 27',true,input.applicability !== 'uncertain',false),
    control('FRIA-02','Intended purpose and context recorded','Article 27(1)',required,input.intendedPurposeRecorded),
    control('FRIA-03','Affected groups identified','Article 27(1)',required,input.affectedGroupsIdentified),
    control('FRIA-04','Vulnerable groups considered','Fundamental-rights impact governance',required,input.vulnerableGroupsConsidered),
    control('FRIA-05','Potentially affected rights mapped','Article 27(1)',required,input.rightsMapped),
    control('FRIA-06','Impact assessment completed','Article 27(1)',required,input.impactAssessmentComplete),
    control('FRIA-07','Mitigation plan completed','Article 27(1)',required,input.mitigationPlanComplete),
    control('FRIA-08','Human oversight defined','Articles 14 and 27',required,input.humanOversightComplete),
    control('FRIA-09','Complaints and redress defined','Article 27 and governance safeguards',required,input.complaintsAndRedressComplete),
    control('FRIA-10','Monitoring plan linked','Articles 27 and 72',required,input.monitoringPlanComplete),
    control('FRIA-11','Data-protection coordination recorded','Article 27 coordination boundary',required,input.dataProtectionCoordinationComplete,false),
    control('FRIA-12','Accountable owner assigned','Governance accountability',required,input.accountableOwnerAssigned),
    control('FRIA-13','Independent reviewer assigned','Separation of duties',required,input.independentReviewerAssigned),
    control('FRIA-14','Approver assigned','Approval governance',required,input.approverAssigned),
    control('FRIA-15','Legal review completed when required','Human/legal review boundary',applicabilityUncertain || severeResidual,input.legalReviewComplete),
  ];

  const requiredControls = controls.filter(c => c.required);
  const missingControlIds = requiredControls.filter(c => !c.satisfied).map(c => c.id);
  const blockingControlIds = requiredControls.filter(c => c.blocking && !c.satisfied).map(c => c.id);
  const legalReviewRequired = applicabilityUncertain || severeResidual;

  let stage: FriaStage;
  if (input.retiredAt) stage = 'retired';
  else if (severeResidual && !input.legalReviewComplete) stage = 'blocked';
  else if (applicabilityUncertain) stage = 'applicability_review';
  else if (!required) stage = input.approvedAt ? 'approved' : 'approval';
  else if (!input.impactAssessmentComplete || !input.rightsMapped) stage = 'assessment';
  else if (!input.mitigationPlanComplete || !input.humanOversightComplete || !input.complaintsAndRedressComplete) stage = 'mitigation';
  else if (missingControlIds.length || !input.approvedAt) stage = 'approval';
  else stage = 'approved';

  const productionUseAllowed = stage === 'approved' && (!legalReviewRequired || input.legalReviewComplete);
  const requiredActions = [
    ...(applicabilityUncertain ? ['Resolve FRIA applicability with accountable human and legal review.'] : []),
    ...(severeResidual && !input.legalReviewComplete ? ['Block approval until severe residual-rights impact receives legal and governance review.'] : []),
    ...missingControlIds.map(id => `Complete and attach evidence for ${id}.`),
    ...(required && missingControlIds.length === 0 && !input.approvedAt ? ['Record independent approval with rationale and timestamp.'] : []),
  ];

  return {
    version: VERSION,
    stage,
    productionUseAllowed,
    legalReviewRequired,
    controls,
    missingControlIds,
    blockingControlIds,
    requiredActions: Array.from(new Set(requiredActions)),
    evidenceBoundary: 'Decision support and evidence preparation only. This workflow does not issue a legal opinion, guarantee fundamental-rights compliance or replace a DPIA, legal review, regulator decision or independent assessment.',
  };
}

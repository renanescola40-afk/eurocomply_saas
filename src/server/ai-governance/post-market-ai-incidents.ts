export const POST_MARKET_STAGES = ['draft','monitoring','investigating','corrective_action','approval_required','closed','blocked'] as const;
export type PostMarketStage = (typeof POST_MARKET_STAGES)[number];
export type SignalType = 'performance_drift'|'accuracy_degradation'|'robustness_failure'|'cybersecurity_event'|'complaint'|'rights_impact'|'serious_incident'|'provider_change'|'other';
export type Severity = 'low'|'medium'|'high'|'critical'|'unknown';

export type PostMarketIncidentInput = {
  monitoringPlanApproved: boolean;
  metricsAndThresholdsDefined: boolean;
  reviewCadenceDefined: boolean;
  accountableOwnerAssigned: boolean;
  signalType?: SignalType | null;
  severity?: Severity | null;
  peoplePotentiallyAffected?: boolean;
  rightsImpactPossible?: boolean;
  containmentRecorded?: boolean;
  investigationComplete?: boolean;
  rootCauseRecorded?: boolean;
  correctiveActionsAssigned?: boolean;
  effectivenessReviewComplete?: boolean;
  reportingAssessmentCompleted?: boolean;
  legalReviewCompleted?: boolean;
  approverAssigned?: boolean;
  approvedAt?: string | null;
  closedAt?: string | null;
};

export type PostMarketControl = { id:string; title:string; reference:string; required:boolean; satisfied:boolean; blocking:boolean };
export type PostMarketDecision = {
  version:string;
  stage:PostMarketStage;
  productionUseAllowed:boolean;
  legalReviewRequired:boolean;
  potentialReportingReviewRequired:boolean;
  blockingControlIds:string[];
  missingControlIds:string[];
  requiredActions:string[];
  controls:PostMarketControl[];
  evidenceBoundary:string;
};

const VERSION='2026-07-21.1';
const control=(id:string,title:string,reference:string,required:boolean,satisfied:boolean,blocking=true):PostMarketControl=>({id,title,reference,required,satisfied,blocking});

export function decidePostMarketIncident(input:PostMarketIncidentInput):PostMarketDecision {
  const incidentOpen=Boolean(input.signalType);
  const severe=input.severity==='high'||input.severity==='critical'||input.severity==='unknown';
  const rightsConcern=Boolean(input.peoplePotentiallyAffected||input.rightsImpactPossible||input.signalType==='rights_impact');
  const potentialReportingReviewRequired=incidentOpen&&(severe||rightsConcern||input.signalType==='serious_incident');
  const legalReviewRequired=potentialReportingReviewRequired&&!input.legalReviewCompleted;
  const controls=[
    control('PMM-01','Approved post-market monitoring plan','Article 72',true,input.monitoringPlanApproved),
    control('PMM-02','Metrics and thresholds defined','Article 72',true,input.metricsAndThresholdsDefined),
    control('PMM-03','Review cadence defined','Article 72',true,input.reviewCadenceDefined),
    control('PMM-04','Accountable owner assigned','Articles 72 and 73',true,input.accountableOwnerAssigned),
    control('INC-01','Containment recorded','Article 73',incidentOpen,Boolean(input.containmentRecorded)),
    control('INC-02','Investigation completed','Article 73',incidentOpen,Boolean(input.investigationComplete)),
    control('INC-03','Root cause recorded','Article 73',incidentOpen,Boolean(input.rootCauseRecorded)),
    control('INC-04','Corrective actions assigned','Articles 72 and 73',incidentOpen,Boolean(input.correctiveActionsAssigned)),
    control('INC-05','Corrective-action effectiveness reviewed','Articles 72 and 73',incidentOpen,Boolean(input.effectivenessReviewComplete)),
    control('INC-06','Potential reporting obligation assessed by a human','Article 73',potentialReportingReviewRequired,Boolean(input.reportingAssessmentCompleted)),
    control('INC-07','Applicable legal review completed','Article 73',potentialReportingReviewRequired,Boolean(input.legalReviewCompleted)),
    control('INC-08','Independent approver assigned','Governance approval',incidentOpen,Boolean(input.approverAssigned)),
  ];
  const required=controls.filter(c=>c.required);
  const missingControlIds=required.filter(c=>!c.satisfied).map(c=>c.id);
  const blockingControlIds=required.filter(c=>!c.satisfied&&c.blocking).map(c=>c.id);
  let stage:PostMarketStage;
  if(!input.monitoringPlanApproved||!input.accountableOwnerAssigned) stage='draft';
  else if(!incidentOpen) stage='monitoring';
  else if(!input.containmentRecorded&&(severe||rightsConcern)) stage='blocked';
  else if(!input.investigationComplete||!input.rootCauseRecorded) stage='investigating';
  else if(!input.correctiveActionsAssigned||!input.effectivenessReviewComplete) stage='corrective_action';
  else if(missingControlIds.length>0||!input.approvedAt) stage='approval_required';
  else stage=input.closedAt?'closed':'approval_required';
  const productionUseAllowed=stage!=='blocked'&&!(input.severity==='critical'&&!input.effectivenessReviewComplete);
  const requiredActions=[
    ...missingControlIds.map(id=>`Complete and attach evidence for ${id}.`),
    ...(stage==='blocked'?['Contain the affected AI system and record the decision before continued production use.']:[]),
    ...(potentialReportingReviewRequired&&!input.reportingAssessmentCompleted?['Complete a human assessment of potential reporting obligations and applicable deadlines.']:[]),
    ...(legalReviewRequired?['Escalate to qualified legal review; do not automatically determine notification duties.']:[]),
    ...(incidentOpen&&!input.approvedAt?['Record independent approval before closure.']:[]),
  ];
  return {version:VERSION,stage,productionUseAllowed,legalReviewRequired,potentialReportingReviewRequired,blockingControlIds,missingControlIds,requiredActions:Array.from(new Set(requiredActions)),controls,evidenceBoundary:'Decision support and evidence preparation only. This result does not determine legal notification duties, certify compliance, or replace qualified human and legal review.'};
}

import { describe, expect, it } from 'vitest';
import { decidePostMarketIncident } from './post-market-ai-incidents';

const baseline={monitoringPlanApproved:true,metricsAndThresholdsDefined:true,reviewCadenceDefined:true,accountableOwnerAssigned:true};

describe('decidePostMarketIncident',()=>{
  it('keeps an approved plan in monitoring when no signal exists',()=>{
    const result=decidePostMarketIncident(baseline);
    expect(result.stage).toBe('monitoring');
    expect(result.productionUseAllowed).toBe(true);
  });
  it('blocks an uncontained critical incident',()=>{
    const result=decidePostMarketIncident({...baseline,signalType:'serious_incident',severity:'critical',containmentRecorded:false});
    expect(result.stage).toBe('blocked');
    expect(result.productionUseAllowed).toBe(false);
    expect(result.legalReviewRequired).toBe(true);
  });
  it('requires human reporting assessment for possible rights impact',()=>{
    const result=decidePostMarketIncident({...baseline,signalType:'rights_impact',severity:'medium',containmentRecorded:true,investigationComplete:true,rootCauseRecorded:true,correctiveActionsAssigned:true,effectivenessReviewComplete:true});
    expect(result.potentialReportingReviewRequired).toBe(true);
    expect(result.missingControlIds).toContain('INC-06');
    expect(result.evidenceBoundary).toContain('does not determine legal notification duties');
  });
  it('closes only after evidence, legal review and approval',()=>{
    const result=decidePostMarketIncident({...baseline,signalType:'serious_incident',severity:'high',containmentRecorded:true,investigationComplete:true,rootCauseRecorded:true,correctiveActionsAssigned:true,effectivenessReviewComplete:true,reportingAssessmentCompleted:true,legalReviewCompleted:true,approverAssigned:true,approvedAt:'2026-07-21T12:00:00Z',closedAt:'2026-07-21T13:00:00Z'});
    expect(result.stage).toBe('closed');
    expect(result.missingControlIds).toEqual([]);
  });
});

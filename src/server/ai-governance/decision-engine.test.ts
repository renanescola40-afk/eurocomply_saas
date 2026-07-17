import { describe, expect, it } from 'vitest';

import { evaluateAiGovernanceRole } from '@/lib/ai-governance/role-wizard';
import { classifyAiSystem } from './classifier';
import {
  AI_ACT_DECISION_ENGINE_VERSION,
  AI_ACT_RULESET_VERSION,
  evaluateAiActSystem,
  evaluateAiSystemRole,
} from './decision-engine';
import { classifyParsedAiSystemBody } from './system-payload';

const baseInput = {
  role: 'deployer' as const,
  riskDomain: 'general_productivity' as const,
  usesPersonalData: false,
  interactsWithPeople: false,
  generatesContent: false,
  biometricIdentification: false,
  manipulativeOrExploitative: false,
  vendorName: 'Trusted AI Vendor',
  useCase: 'Internal employee productivity support',
  onDate: '2026-07-17',
};

describe('canonical EU AI Act decision engine', () => {
  it('binds every decision to explicit engine and legal-rules versions', () => {
    const decision = evaluateAiActSystem(baseInput);

    expect(decision.engineVersion).toBe(AI_ACT_DECISION_ENGINE_VERSION);
    expect(decision.rulesetVersion).toBe(AI_ACT_RULESET_VERSION);
    expect(decision.assessedOn).toBe('2026-07-17');
    expect(decision.registryReviewState).toBe('fresh');
    expect(decision.appliedRuleIds).toContain('eu-ai-act-art4-ai-literacy');
    expect(decision.evidenceBoundary).toContain('not a legal determination');
  });

  it('blocks and escalates prohibited-practice signals with active and pending rule provenance', () => {
    const decision = evaluateAiActSystem({
      ...baseInput,
      manipulativeOrExploitative: true,
    });

    expect(decision.riskLevel).toBe('prohibited_review');
    expect(decision.decision).toBe('block_and_escalate');
    expect(decision.legalReviewRequired).toBe(true);
    expect(decision.appliedRuleIds).toContain('eu-ai-act-art5-prohibited-practices');
    expect(decision.pendingRuleIds).toContain('eu-ai-act-art5-intimate-content-amendment');
    expect(decision.reasons).toContain('manipulative_or_exploitative_signal');
  });

  it('treats Annex-style domains as high-risk review and tracks future implementation rules', () => {
    const decision = evaluateAiActSystem({
      ...baseInput,
      riskDomain: 'employment',
      usesPersonalData: true,
    });

    expect(decision.riskLevel).toBe('high_risk_review');
    expect(decision.decision).toBe('formal_high_risk_assessment');
    expect(decision.relevantRuleCategories).toEqual(expect.arrayContaining(['high_risk_standalone', 'high_risk_product']));
    expect(decision.futureRuleIds.length).toBeGreaterThan(0);
    expect(decision.reasons).toEqual(expect.arrayContaining(['annex_domain_signal', 'personal_data_signal']));
  });

  it('moves Article 50 from future planning to applicable evidence on its confirmed date', () => {
    const before = evaluateAiActSystem({
      ...baseInput,
      interactsWithPeople: true,
      generatesContent: true,
    });
    const onDate = evaluateAiActSystem({
      ...baseInput,
      interactsWithPeople: true,
      generatesContent: true,
      onDate: '2026-08-02',
    });

    expect(before.riskLevel).toBe('limited_transparency');
    expect(before.futureRuleIds).toContain('eu-ai-act-art50-general-transparency');
    expect(before.appliedRuleIds).not.toContain('eu-ai-act-art50-general-transparency');
    expect(onDate.appliedRuleIds).toContain('eu-ai-act-art50-general-transparency');
  });

  it('fails closed on ambiguous customer-facing roles instead of silently treating them as settled', () => {
    const assessment = evaluateAiSystemRole({
      role: 'other',
      vendorName: null,
      useCase: 'Customer-facing API sold to external clients',
    });

    expect(assessment.recommendedRole).toBe('provider');
    expect(assessment.confidence).toBe('medium');
    expect(assessment.needsLegalReview).toBe(true);
    expect(assessment.signals).toContain('substantial_modification_review');
  });

  it('marks classifications for legal refresh after any registry review deadline passes', () => {
    const decision = evaluateAiActSystem({
      ...baseInput,
      onDate: '2027-01-01',
    });

    expect(decision.registryReviewState).toBe('review_due');
    expect(decision.legalReviewRequired).toBe(true);
    expect(decision.reasons).toContain('registry_review_due');
    expect(decision.nextActions).toContain('Refresh the legal-rules registry before relying on this classification.');
  });

  it('rejects malformed assessment dates', () => {
    expect(() => evaluateAiActSystem({ ...baseInput, onDate: '17/07/2026' })).toThrow('ai_act_assessment_date_invalid');
  });

  it('keeps legacy classifier and role-wizard entrypoints consistent with the canonical engine', () => {
    const canonical = evaluateAiActSystem(baseInput);
    const legacyClassification = classifyAiSystem(baseInput);
    const legacyRole = evaluateAiGovernanceRole(baseInput);

    expect(legacyClassification).toEqual({
      riskLevel: canonical.riskLevel,
      summary: canonical.summary,
      obligations: canonical.obligations,
      nextActions: canonical.nextActions,
    });
    expect(legacyRole).toEqual(canonical.roleAssessment);
  });

  it('returns safe versioned decision metadata from the shared inventory payload path', () => {
    const result = classifyParsedAiSystemBody({
      name: 'Support assistant',
      useCase: 'Customer-facing support assistant for European users',
      role: 'other',
      lifecycleStatus: 'pilot',
      riskDomain: 'customer_support',
      usesPersonalData: true,
      interactsWithPeople: true,
      generatesContent: true,
      biometricIdentification: false,
      manipulativeOrExploitative: false,
      vendorName: 'Example vendor',
    });

    expect(result.classification.riskLevel).toBe('limited_transparency');
    expect(result.roleAssessment.recommendedRole).toBe('deployer');
    expect(result.decisionMetadata.engineVersion).toBe(AI_ACT_DECISION_ENGINE_VERSION);
    expect(result.decisionMetadata.rulesetVersion).toBe(AI_ACT_RULESET_VERSION);
    expect(result.decisionMetadata.appliedRuleIds).toContain('eu-ai-act-art4-ai-literacy');
    expect(result.decisionMetadata.futureRuleIds).toContain('eu-ai-act-art50-general-transparency');
    expect(result.decisionMetadata.evidenceBoundary).toContain('not a legal determination');
    expect(result.decisionMetadata.evidenceBoundary).not.toMatch(/fully compliant|certified compliance/i);
  });
});

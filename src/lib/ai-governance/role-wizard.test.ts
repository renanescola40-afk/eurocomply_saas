import { describe, expect, it } from 'vitest';
import { evaluateAiGovernanceRole } from './role-wizard';

describe('evaluateAiGovernanceRole', () => {
  it('classifies a third-party internal tool as deployer with high confidence', () => {
    const assessment = evaluateAiGovernanceRole({
      role: 'deployer',
      vendorName: 'OpenAI',
      useCase: 'Internal support agents summarise customer tickets before replying.',
      riskDomain: 'customer_support',
      generatesContent: true,
    });

    expect(assessment.recommendedRole).toBe('deployer');
    expect(assessment.confidence).toBe('high');
    expect(assessment.signals).toContain('third_party_vendor');
    expect(assessment.nextSteps).toContain('collect_vendor_evidence');
  });

  it('flags customer-facing systems without a vendor as potential provider role', () => {
    const assessment = evaluateAiGovernanceRole({
      role: 'deployer',
      useCase: 'Public API sold to customers that generates automated decisions for end-users.',
      riskDomain: 'essential_services',
      interactsWithPeople: true,
    });

    expect(assessment.recommendedRole).toBe('provider');
    expect(assessment.confidence).toBe('medium');
    expect(assessment.signals).toContain('customer_facing_use');
    expect(assessment.signals).toContain('substantial_modification_review');
    expect(assessment.needsLegalReview).toBe(true);
  });

  it('keeps importer and distributor roles explicit', () => {
    const importer = evaluateAiGovernanceRole({ role: 'importer', vendorName: 'External AI vendor' });
    const distributor = evaluateAiGovernanceRole({ role: 'distributor', vendorName: 'External AI vendor' });

    expect(importer.recommendedRole).toBe('importer');
    expect(distributor.recommendedRole).toBe('distributor');
    expect(importer.nextSteps).toContain('check_import_distribution_chain');
    expect(distributor.nextSteps).toContain('check_import_distribution_chain');
  });

  it('escalates biometric or prohibited-practice signals', () => {
    const assessment = evaluateAiGovernanceRole({
      role: 'deployer',
      useCase: 'Pilot using biometric identification for visitor access.',
      riskDomain: 'biometrics',
      biometricIdentification: true,
    });

    expect(assessment.needsLegalReview).toBe(true);
    expect(assessment.signals).toContain('biometric_or_prohibited_review');
    expect(assessment.nextSteps).toContain('escalate_legal_review');
    expect(assessment.nextSteps).toContain('run_high_risk_assessment');
  });
});

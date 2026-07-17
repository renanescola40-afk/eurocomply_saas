import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('canonical EU AI Act decision-engine contract', () => {
  const engine = 'src/server/ai-governance/decision-engine.ts';
  const classifier = 'src/server/ai-governance/classifier.ts';
  const roleWizard = 'src/lib/ai-governance/role-wizard.ts';
  const payload = 'src/server/ai-governance/system-payload.ts';

  it('keeps legal rules, role inference and risk classification in one engine', () => {
    const source = read(engine);

    expect(source).toContain("from './legal-rules'");
    expect(source).toContain('validateAiActLegalRules()');
    expect(source).toContain('listApplicableAiActRules({');
    expect(source).toContain('AI_ACT_DECISION_ENGINE_VERSION');
    expect(source).toContain('AI_ACT_RULESET_VERSION');
    expect(source).toContain('registryReviewState');
    expect(source).toContain('appliedRuleIds');
    expect(source).toContain('futureRuleIds');
    expect(source).toContain('pendingRuleIds');
    expect(source).toContain('evidenceBoundary');
  });

  it('removes duplicate classification logic from compatibility entrypoints', () => {
    const classifierSource = read(classifier);
    const roleSource = read(roleWizard);

    expect(classifierSource).toContain('evaluateAiActSystem({');
    expect(classifierSource).not.toContain('const highRiskDomains');
    expect(classifierSource).not.toContain('manipulativeOrExploitative) {');
    expect(roleSource).toContain('evaluateAiSystemRole(input)');
    expect(roleSource).not.toContain('hasCustomerFacingIntent');
    expect(roleSource).not.toContain('const highRiskDomains');
  });

  it('uses one decision for inventory classification and role evidence', () => {
    const source = read(payload);

    expect(source).toContain('const decision = evaluateAiActSystem({');
    expect(source).not.toContain('classifyAiSystem({');
    expect(source).not.toContain('evaluateAiGovernanceRole({');
    expect(source).toContain('roleAssessment: decision.roleAssessment');
    expect(source).toContain('engineVersion: decision.engineVersion');
    expect(source).toContain('rulesetVersion: decision.rulesetVersion');
    expect(source).toContain('appliedRuleIds: decision.appliedRuleIds');
    expect(source).toContain('futureRuleIds: decision.futureRuleIds');
    expect(source).toContain('pendingRuleIds: decision.pendingRuleIds');
  });

  it('keeps the product language qualified', () => {
    const source = read(engine);

    expect(source).toContain('Decision support only');
    expect(source).toContain('not a legal determination');
    expect(source).not.toMatch(/fully compliant|guaranteed compliance|certified compliance/i);
  });
});

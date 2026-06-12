import { describe, expect, it } from 'vitest';

import {
  getFailedSecurityScenarios,
  getSecurityScenarioMatrix,
  SECURITY_SCENARIOS,
} from './security-scenarios';

describe('security scenario matrix', () => {
  it('keeps every declared scenario aligned with the current RBAC model', () => {
    expect(getFailedSecurityScenarios()).toEqual([]);
  });

  it('contains coverage for high-risk enterprise categories', () => {
    const categories = new Set(SECURITY_SCENARIOS.map((scenario) => scenario.category));

    expect(categories).toEqual(
      new Set(['tenant_isolation', 'rbac', 'billing', 'documents', 'ai_governance', 'audit', 'exports']),
    );
  });

  it('documents threat and evidence for every scenario', () => {
    for (const scenario of SECURITY_SCENARIOS) {
      expect(scenario.threat.length).toBeGreaterThan(10);
      expect(scenario.evidence.length).toBeGreaterThan(0);
    }
  });

  it('marks export scenarios with a plan gate', () => {
    const exportScenarios = SECURITY_SCENARIOS.filter((scenario) => scenario.category === 'exports');

    expect(exportScenarios.length).toBeGreaterThan(0);
    expect(exportScenarios.every((scenario) => scenario.planGate)).toBe(true);
  });

  it('exposes pass/fail metadata for reporting', () => {
    const matrix = getSecurityScenarioMatrix();

    expect(matrix.length).toBe(SECURITY_SCENARIOS.length);
    expect(matrix.every((scenario) => scenario.passesCurrentRbacModel === true)).toBe(true);
  });
});

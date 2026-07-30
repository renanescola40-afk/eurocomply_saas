import { createHash } from 'node:crypto';

import {
  AI_ACT_LEGAL_RULES,
  AI_ACT_LEGAL_RULES_VERSION,
  AI_ACT_LEGAL_SOURCE_REGULATIONS,
  listApplicableAiActRules,
  validateAiActLegalRules,
} from './legal-rules';
import { evaluateAiActSystem } from './decision-engine';

export const LEGAL_RULES_RUNTIME_EVIDENCE_SCHEMA = 'risck-comply.legal-rules-runtime-evidence.v1';
export const LEGAL_RULES_SOURCE_EFFECTIVE_DATE = '2026-07-27';

export type LegalRulesRuntimeTestCase = {
  id: string;
  description: string;
  expected: unknown;
  actual: unknown;
  status: 'PASS' | 'FAIL';
};

export type LegalRulesRuntimeEvidence = {
  schema: string;
  environment: string;
  deploymentUrl: string;
  deploymentSha: string;
  legalRulesVersion: string;
  sourceRegulations: string[];
  effectiveDate: string;
  effectiveDateMeaning: string;
  rulesDigest: string;
  testCases: LegalRulesRuntimeTestCase[];
  status: 'PASS' | 'FAIL';
  timestamp: string;
  requestIds: string[];
  artifactSha256: string;
  evidenceBoundary: string;
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function sanitizeRequestId(value: string | null | undefined): string {
  const candidate = value?.trim() ?? '';
  if (/^[A-Za-z0-9._:-]{8,128}$/.test(candidate)) return candidate;
  return `generated-${createHash('sha256').update(candidate || 'missing').digest('hex').slice(0, 24)}`;
}

function runtimeCase(input: {
  id: string;
  description: string;
  expected: unknown;
  actual: unknown;
}): LegalRulesRuntimeTestCase {
  return {
    ...input,
    status: stableJson(input.expected) === stableJson(input.actual) ? 'PASS' : 'FAIL',
  };
}

function prohibitedDecision(onDate: string) {
  return evaluateAiActSystem({
    role: 'provider',
    riskDomain: 'content_generation',
    usesPersonalData: true,
    interactsWithPeople: false,
    generatesContent: true,
    biometricIdentification: false,
    manipulativeOrExploitative: true,
    vendorName: null,
    useCase: 'customer-facing generative content service',
    onDate,
  });
}

export function buildLegalRulesRuntimeEvidence(input: {
  environment: string;
  deploymentUrl: string;
  deploymentSha: string;
  requestId?: string | null;
  timestamp?: string;
}): LegalRulesRuntimeEvidence {
  const registryIssues = validateAiActLegalRules();
  const providerBefore = listApplicableAiActRules({
    roles: ['provider'],
    categories: ['prohibited_practice'],
    onDate: '2026-12-01',
  });
  const providerOnDate = listApplicableAiActRules({
    roles: ['provider'],
    categories: ['prohibited_practice'],
    onDate: '2026-12-02',
  });
  const providerTransparency = listApplicableAiActRules({
    roles: ['provider'],
    categories: ['transparency'],
    onDate: '2026-08-02',
  });
  const deployerTransparency = listApplicableAiActRules({
    roles: ['deployer'],
    categories: ['transparency'],
    onDate: '2026-08-02',
  });
  const decisionBefore = prohibitedDecision('2026-12-01');
  const decisionOnDate = prohibitedDecision('2026-12-02');

  const amendmentId = 'eu-ai-act-art5-intimate-content-amendment';
  const transitionId = 'eu-ai-act-art50-preexisting-synthetic-transition';
  const testCases: LegalRulesRuntimeTestCase[] = [
    runtimeCase({
      id: 'registry-valid',
      description: 'The versioned legal-rules registry passes its fail-closed structural validation.',
      expected: [],
      actual: registryIssues,
    }),
    runtimeCase({
      id: 'article-5-before-application',
      description: 'The 2026/1744 Article 5 amendment is not treated as applicable before 2 December 2026.',
      expected: false,
      actual: providerBefore.some((rule) => rule.id === amendmentId),
    }),
    runtimeCase({
      id: 'article-5-on-application-date',
      description: 'The 2026/1744 Article 5 amendment becomes applicable on 2 December 2026.',
      expected: true,
      actual: providerOnDate.some((rule) => rule.id === amendmentId),
    }),
    runtimeCase({
      id: 'article-50-provider-transition',
      description: 'The Article 111(4) transition is available to qualifying providers.',
      expected: true,
      actual: providerTransparency.some((rule) => rule.id === transitionId),
    }),
    runtimeCase({
      id: 'article-50-deployer-boundary',
      description: 'The Article 111(4) transition is not incorrectly applied to deployer Article 50(4) duties.',
      expected: false,
      actual: deployerTransparency.some((rule) => rule.id === transitionId),
    }),
    runtimeCase({
      id: 'decision-engine-before-application',
      description: 'The canonical decision engine excludes the future amendment before its application date.',
      expected: false,
      actual: decisionBefore.appliedRuleIds.includes(amendmentId),
    }),
    runtimeCase({
      id: 'decision-engine-on-application-date',
      description: 'The canonical decision engine includes the amendment on its application date.',
      expected: true,
      actual: decisionOnDate.appliedRuleIds.includes(amendmentId),
    }),
    runtimeCase({
      id: 'decision-engine-version-boundary',
      description: 'The canonical decision output is bound to the current legal-rules version.',
      expected: AI_ACT_LEGAL_RULES_VERSION,
      actual: decisionOnDate.rulesetVersion,
    }),
  ];

  const evidenceWithoutDigest = {
    schema: LEGAL_RULES_RUNTIME_EVIDENCE_SCHEMA,
    environment: input.environment || 'unknown',
    deploymentUrl: input.deploymentUrl,
    deploymentSha: input.deploymentSha || 'unknown',
    legalRulesVersion: AI_ACT_LEGAL_RULES_VERSION,
    sourceRegulations: AI_ACT_LEGAL_SOURCE_REGULATIONS,
    effectiveDate: LEGAL_RULES_SOURCE_EFFECTIVE_DATE,
    effectiveDateMeaning: 'Entry into force of Regulation (EU) 2026/1744; individual amended provisions retain their statutory application dates.',
    rulesDigest: sha256(AI_ACT_LEGAL_RULES),
    testCases,
    status: testCases.every((testCase) => testCase.status === 'PASS') ? 'PASS' as const : 'FAIL' as const,
    timestamp: input.timestamp ?? new Date().toISOString(),
    requestIds: [sanitizeRequestId(input.requestId)],
    evidenceBoundary: 'This proves deterministic runtime behaviour for the deployed code and exact deployment SHA. It does not replace qualified legal review or customer-specific factual assessment.',
  };

  return {
    ...evidenceWithoutDigest,
    artifactSha256: sha256(evidenceWithoutDigest),
  };
}

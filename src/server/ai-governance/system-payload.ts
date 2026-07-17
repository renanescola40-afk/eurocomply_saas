import { z } from 'zod';

import {
  evaluateAiActSystem,
  normalizeAiRiskDomain,
  normalizeAiSystemRole,
  normalizeAiSystemStatus,
} from '@/server/ai-governance/decision-engine';

export const aiSystemBodySchema = z.object({
  name: z.string().trim().min(2).max(160),
  useCase: z.string().trim().min(8).max(4000),
  ownerTeam: z.string().trim().max(160).nullable().optional(),
  category: z.string().trim().max(120).nullable().optional(),
  countryMarket: z.string().trim().max(120).nullable().optional(),
  processedData: z.string().trim().max(2000).nullable().optional(),
  vendorName: z.string().trim().max(160).nullable().optional(),
  modelName: z.string().trim().max(160).nullable().optional(),
  role: z.unknown().optional(),
  lifecycleStatus: z.unknown().optional(),
  riskDomain: z.unknown().optional(),
  usesPersonalData: z.unknown().optional(),
  interactsWithPeople: z.unknown().optional(),
  generatesContent: z.unknown().optional(),
  biometricIdentification: z.unknown().optional(),
  manipulativeOrExploitative: z.unknown().optional(),
});

export type ParsedAiSystemBody = z.infer<typeof aiSystemBodySchema>;

export function asText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

export function asBoolean(value: unknown) {
  return value === true || value === 'true' || value === 'on';
}

export function classifyParsedAiSystemBody(body: ParsedAiSystemBody) {
  const role = normalizeAiSystemRole(body.role);
  const lifecycleStatus = normalizeAiSystemStatus(body.lifecycleStatus);
  const riskDomain = normalizeAiRiskDomain(body.riskDomain);
  const usesPersonalData = asBoolean(body.usesPersonalData);
  const interactsWithPeople = asBoolean(body.interactsWithPeople);
  const generatesContent = asBoolean(body.generatesContent);
  const biometricIdentification = asBoolean(body.biometricIdentification);
  const manipulativeOrExploitative = asBoolean(body.manipulativeOrExploitative);
  const vendorName = asText(body.vendorName) || null;

  const decision = evaluateAiActSystem({
    role,
    riskDomain,
    usesPersonalData,
    interactsWithPeople,
    generatesContent,
    biometricIdentification,
    manipulativeOrExploitative,
    vendorName,
    useCase: body.useCase,
  });

  return {
    role,
    lifecycleStatus,
    riskDomain,
    usesPersonalData,
    interactsWithPeople,
    generatesContent,
    biometricIdentification,
    manipulativeOrExploitative,
    vendorName,
    classification: {
      riskLevel: decision.riskLevel,
      summary: decision.summary,
      obligations: decision.obligations,
      nextActions: decision.nextActions,
    },
    roleAssessment: decision.roleAssessment,
    decisionMetadata: {
      engineVersion: decision.engineVersion,
      rulesetVersion: decision.rulesetVersion,
      assessedOn: decision.assessedOn,
      registryVerifiedAt: decision.registryVerifiedAt,
      registryReviewState: decision.registryReviewState,
      decision: decision.decision,
      relevantRuleCategories: decision.relevantRuleCategories,
      appliedRuleIds: decision.appliedRuleIds,
      futureRuleIds: decision.futureRuleIds,
      pendingRuleIds: decision.pendingRuleIds,
      legalReviewRequired: decision.legalReviewRequired,
      reasons: decision.reasons,
      evidenceBoundary: decision.evidenceBoundary,
    },
  };
}

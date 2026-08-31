import { getAiSystem } from '@/server/queries/ai-systems';
import { getFriaAssessment } from '@/server/queries/fria';
import type { LegalReviewRequestRecord } from '@/server/queries/legal-assurance';
import {
  canonicalizeJson,
  createPackageManifestDigest,
  sha256Hex,
  type LegalReviewPackageManifest,
} from '@/server/legal-assurance/core';

const RELEASE_SHA_ENV = 'VERCEL_GIT_COMMIT_SHA';
const METHODOLOGY_ENV = 'LEGAL_ASSURANCE_METHODOLOGY_VERSION';
const REGULATORY_RULES_ENV = 'LEGAL_ASSURANCE_REGULATORY_RULES_VERSION';

type Environment = Record<string, string | undefined>;

type PackageItem = {
  stableIdentifier: string;
  contentReference: string | null;
  contentSnapshot: Record<string, unknown>;
  contentDigest: string;
  sourceVersion: string;
  capturedAt: string;
};

function requiredEnvironmentValue(env: Environment, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`legal_assurance_configuration_missing:${key}`);
  return value;
}

function packageItem(input: {
  stableIdentifier: string;
  contentReference?: string | null;
  contentSnapshot: Record<string, unknown>;
  sourceVersion: string;
  capturedAt: string;
}): PackageItem {
  return {
    stableIdentifier: input.stableIdentifier,
    contentReference: input.contentReference ?? null,
    contentSnapshot: input.contentSnapshot,
    contentDigest: sha256Hex(canonicalizeJson(input.contentSnapshot)),
    sourceVersion: input.sourceVersion,
    capturedAt: input.capturedAt,
  };
}

export function resolveLegalAssuranceReleaseConfig(env: Environment = process.env) {
  const productReleaseSha = requiredEnvironmentValue(env, RELEASE_SHA_ENV).toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(productReleaseSha)) throw new Error('legal_assurance_invalid_release_sha');

  return {
    productReleaseSha,
    methodologyVersion: requiredEnvironmentValue(env, METHODOLOGY_ENV),
    regulatoryRulesVersion: requiredEnvironmentValue(env, REGULATORY_RULES_ENV),
  };
}

export async function buildLegalReviewPackage(input: {
  review: LegalReviewRequestRecord;
  nextPackageVersion: number;
  now?: Date;
  env?: Environment;
}) {
  const now = input.now ?? new Date();
  const createdAt = now.toISOString();
  const config = resolveLegalAssuranceReleaseConfig(input.env);
  const items: PackageItem[] = [];
  const knownLimitations: string[] = [
    'RISCK COMPLY software output is not a legal opinion.',
    'External Counsel validation and professional judgment remain independent.',
  ];
  const openGaps: string[] = [];

  items.push(packageItem({
    stableIdentifier: `legal-review:${input.review.id}:scope`,
    contentReference: `legal_review_requests/${input.review.id}`,
    contentSnapshot: {
      reviewType: input.review.review_type,
      jurisdiction: input.review.jurisdiction,
      scope: input.review.scope,
      priority: input.review.priority,
      organizationId: input.review.organization_id,
      aiSystemId: input.review.ai_system_id,
      requestedAt: input.review.requested_at,
    },
    sourceVersion: input.review.updated_at,
    capturedAt: createdAt,
  }));

  if (input.review.ai_system_id) {
    const system = await getAiSystem(input.review.ai_system_id, input.review.organization_id);
    if (!system) throw new Error('legal_assurance_ai_system_not_found');

    items.push(packageItem({
      stableIdentifier: `ai-system:${system.id}`,
      contentReference: `ai_systems/${system.id}`,
      contentSnapshot: {
        id: system.id,
        name: system.name,
        ownerTeam: system.owner_team,
        category: system.category,
        countryMarket: system.country_market,
        processedData: system.processed_data,
        vendorName: system.vendor_name,
        modelName: system.model_name,
        useCase: system.use_case,
        role: system.role,
        lifecycleStatus: system.lifecycle_status,
        riskDomain: system.risk_domain,
        usesPersonalData: system.uses_personal_data,
        interactsWithPeople: system.interacts_with_people,
        generatesContent: system.generates_content,
        biometricIdentification: system.biometric_identification,
        manipulativeOrExploitative: system.manipulative_or_exploitative,
        riskLevel: system.risk_level,
        classificationSummary: system.classification_summary,
        obligations: system.obligations,
        nextActions: system.next_actions,
        lastReassessedAt: system.last_reassessed_at,
      },
      sourceVersion: system.updated_at,
      capturedAt: createdAt,
    }));
  } else {
    openGaps.push('No AI system is bound to this review request.');
  }

  const friaAssessmentId = typeof input.review.scope.friaAssessmentId === 'string'
    ? input.review.scope.friaAssessmentId
    : null;

  if (friaAssessmentId) {
    const fria = await getFriaAssessment(input.review.organization_id, friaAssessmentId);
    if (!fria) throw new Error('legal_assurance_fria_not_found');

    items.push(packageItem({
      stableIdentifier: `fria:${fria.id}`,
      contentReference: `ai_fria_assessments/${fria.id}`,
      contentSnapshot: {
        id: fria.id,
        aiSystemId: fria.ai_system_id,
        version: fria.version,
        applicability: fria.applicability,
        stage: fria.stage,
        context: fria.context,
        affectedGroups: fria.affected_groups,
        rightsMap: fria.rights_map,
        impactAnalysis: fria.impact_analysis,
        mitigationPlan: fria.mitigation_plan,
        oversightPlan: fria.oversight_plan,
        complaintsRedress: fria.complaints_redress,
        highestResidualImpact: fria.highest_residual_impact,
        internalLegalReviewRequired: fria.legal_review_required,
        internalLegalReviewCompletedAt: fria.legal_review_completed_at,
        approvedAt: fria.approved_at,
        reviewDueAt: fria.review_due_at,
      },
      sourceVersion: `${fria.version}:${fria.updated_at}`,
      capturedAt: createdAt,
    }));
  }

  const manifest: LegalReviewPackageManifest = {
    reviewId: input.review.id,
    organizationId: input.review.organization_id,
    aiSystemId: input.review.ai_system_id,
    productReleaseSha: config.productReleaseSha,
    methodologyVersion: config.methodologyVersion,
    regulatoryRulesVersion: config.regulatoryRulesVersion,
    packageVersion: input.nextPackageVersion,
    createdAt,
    items: items.map((item) => ({
      stableIdentifier: item.stableIdentifier,
      contentDigest: item.contentDigest,
      sourceVersion: item.sourceVersion,
      capturedAt: item.capturedAt,
    })),
    knownLimitations,
    openGaps,
  };

  return {
    config,
    manifest,
    manifestDigest: createPackageManifestDigest(manifest),
    items,
  };
}

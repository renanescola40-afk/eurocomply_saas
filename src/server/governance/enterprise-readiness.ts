import { getContinuitySummary } from './continuity-policy';
import { getRetentionSummary } from './retention-policy';
import { getSecurityQuestionnaireSummary } from './security-questionnaire';
import { getVendorAssuranceSummary } from './vendor-assurance-policy';

export type EnterpriseReadinessArea = {
  id: 'retention' | 'continuity' | 'vendor_assurance' | 'security_questionnaire' | 'evidence_integrity' | 'rbac';
  label: string;
  score: number;
  weight: number;
  status: 'foundation' | 'operational' | 'review_ready' | 'enterprise_ready';
  nextActions: string[];
};

export type EnterpriseReadinessSummary = {
  score: number;
  status: 'foundation' | 'operational' | 'enterprise_ready';
  areas: EnterpriseReadinessArea[];
  strongestAreas: string[];
  weakestAreas: string[];
  nextActions: string[];
};

function normalizeStatus(score: number): EnterpriseReadinessArea['status'] {
  if (score >= 88) return 'enterprise_ready';
  if (score >= 70) return 'operational';
  if (score >= 55) return 'review_ready';
  return 'foundation';
}

export function calculateWeightedEnterpriseScore(areas: EnterpriseReadinessArea[]) {
  if (areas.length === 0) return 0;
  const totalWeight = areas.reduce((sum, area) => sum + area.weight, 0);
  if (totalWeight <= 0) return 0;
  const weightedScore = areas.reduce((sum, area) => sum + area.score * area.weight, 0);
  return Math.round(weightedScore / totalWeight);
}

export function getEnterpriseStatus(score: number): EnterpriseReadinessSummary['status'] {
  if (score >= 90) return 'enterprise_ready';
  if (score >= 70) return 'operational';
  return 'foundation';
}

export function getEnterpriseReadinessSummary(): EnterpriseReadinessSummary {
  const retention = getRetentionSummary();
  const continuity = getContinuitySummary();
  const vendorAssurance = getVendorAssuranceSummary();
  const questionnaire = getSecurityQuestionnaireSummary();

  const areas: EnterpriseReadinessArea[] = [
    {
      id: 'retention',
      label: 'Retention governance',
      score: retention.score,
      weight: 1,
      status: normalizeStatus(retention.score),
      nextActions: retention.nextActions,
    },
    {
      id: 'continuity',
      label: 'Operational continuity',
      score: continuity.score,
      weight: 1.2,
      status: normalizeStatus(continuity.score),
      nextActions: continuity.nextActions,
    },
    {
      id: 'vendor_assurance',
      label: 'Vendor assurance',
      score: vendorAssurance.score,
      weight: 1.1,
      status: normalizeStatus(vendorAssurance.score),
      nextActions: vendorAssurance.nextActions,
    },
    {
      id: 'security_questionnaire',
      label: 'Security questionnaire',
      score: questionnaire.score,
      weight: 1.1,
      status: normalizeStatus(questionnaire.score),
      nextActions: questionnaire.nextActions,
    },
    {
      id: 'evidence_integrity',
      label: 'Evidence integrity',
      score: process.env.EVIDENCE_PACK_SIGNING_SECRET || process.env.HEALTHCHECK_TOKEN ? 85 : 62,
      weight: 0.9,
      status: normalizeStatus(process.env.EVIDENCE_PACK_SIGNING_SECRET || process.env.HEALTHCHECK_TOKEN ? 85 : 62),
      nextActions: process.env.EVIDENCE_PACK_SIGNING_SECRET
        ? ['Keep evidence signing secret rotated and limited to production operators.']
        : ['Set EVIDENCE_PACK_SIGNING_SECRET in production for dedicated evidence-pack signing.'],
    },
    {
      id: 'rbac',
      label: 'Workspace access control',
      score: 82,
      weight: 1,
      status: normalizeStatus(82),
      nextActions: ['Keep role assignments reviewed and add SSO/MFA controls for Enterprise workspaces.'],
    },
  ];

  const score = calculateWeightedEnterpriseScore(areas);
  const weakestAreas = [...areas]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((area) => area.label);
  const strongestAreas = [...areas]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((area) => area.label);
  const nextActions = [...areas]
    .sort((a, b) => a.score - b.score)
    .flatMap((area) => area.nextActions.slice(0, 2))
    .slice(0, 8);

  return {
    score,
    status: getEnterpriseStatus(score),
    areas,
    strongestAreas,
    weakestAreas,
    nextActions: nextActions.length > 0 ? nextActions : ['Maintain enterprise controls and review readiness before major customer reviews.'],
  };
}

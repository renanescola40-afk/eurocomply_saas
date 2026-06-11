import { listAiIncidents, type AiIncidentRecord } from '@/server/queries/ai-incidents';
import { listAiSystems, type AiSystemRecord } from '@/server/queries/ai-systems';
import { listAuditEvents, type AuditEventRecord } from '@/server/queries/audit-events';
import { listDocuments } from '@/server/queries/documents';
import { listRisks } from '@/server/queries/risks';
import { listVendors } from '@/server/queries/vendors';
import type { PlanEntitlements } from '@/server/billing/entitlements';
import { CONTINUITY_CONTROLS, getContinuitySummary } from '@/server/governance/continuity-policy';
import { getEnterpriseReadinessSummary } from '@/server/governance/enterprise-readiness';
import { getRetentionSummary, RETENTION_POLICIES } from '@/server/governance/retention-policy';
import { getSecurityQuestionnaireSummary, SECURITY_QUESTIONNAIRE_ITEMS } from '@/server/governance/security-questionnaire';
import { getVendorAssuranceSummary, VENDOR_ASSURANCE_CONTROLS } from '@/server/governance/vendor-assurance-policy';
import type { OrganizationRole } from '@/server/security/rbac';

type OrganizationSnapshot = {
  id: string;
  name?: string | null;
  slug?: string | null;
};

type EvidenceDocument = {
  id?: string | null;
  title?: string | null;
  status?: string | null;
  version?: number | string | null;
  expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type EvidenceVendor = {
  id?: string | null;
  name?: string | null;
  website?: string | null;
  country?: string | null;
  category?: string | null;
  risk_level?: string | null;
  review_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type EvidenceRisk = {
  id?: string | null;
  title?: string | null;
  name?: string | null;
  category?: string | null;
  likelihood?: number | string | null;
  impact?: number | string | null;
  risk_score?: number | string | null;
  status?: string | null;
  owner?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AuditEvidencePack = {
  schemaVersion: '2026-06-10';
  generatedAt: string;
  generatedBy: {
    userId: string;
    role?: OrganizationRole;
  };
  organization: OrganizationSnapshot;
  plan: PlanEntitlements;
  summary: {
    score: number;
    status: 'starting' | 'in_progress' | 'audit_ready';
    documents: number;
    vendors: number;
    risks: number;
    aiSystems: number;
    aiIncidents: number;
    auditEvents: number;
    pendingDocumentReviews: number;
    highRiskVendors: number;
    highRiskAiSystems: number;
    openAiIncidents: number;
  };
  governance: {
    enterpriseReadiness: ReturnType<typeof getEnterpriseReadinessSummary>;
    retention: {
      summary: ReturnType<typeof getRetentionSummary>;
      policies: typeof RETENTION_POLICIES;
    };
    continuity: {
      summary: ReturnType<typeof getContinuitySummary>;
      controls: typeof CONTINUITY_CONTROLS;
    };
    vendorAssurance: {
      summary: ReturnType<typeof getVendorAssuranceSummary>;
      controls: typeof VENDOR_ASSURANCE_CONTROLS;
    };
    securityQuestionnaire: {
      summary: ReturnType<typeof getSecurityQuestionnaireSummary>;
      items: typeof SECURITY_QUESTIONNAIRE_ITEMS;
    };
  };
  evidence: {
    documents: EvidenceDocument[];
    vendors: EvidenceVendor[];
    risks: EvidenceRisk[];
    aiSystems: AiSystemRecord[];
    aiIncidents: AiIncidentRecord[];
    auditEvents: AuditEventRecord[];
    raciTemplate: Array<{
      item: string;
      legal: 'R' | 'A' | 'C' | 'I';
      security: 'R' | 'A' | 'C' | 'I';
      compliance: 'R' | 'A' | 'C' | 'I';
      finance: 'R' | 'A' | 'C' | 'I';
    }>;
    approvalSummary: Array<{
      documentId?: string | null;
      title?: string | null;
      status: 'pending' | 'approved' | 'rejected' | 'review';
      updatedAt?: string | null;
    }>;
  };
  nextActions: string[];
};

export function normalizeRows<T>(rows: unknown): T[] {
  return Array.isArray(rows) ? (rows as T[]) : [];
}

function isApprovedStatus(status?: string | null) {
  const normalized = String(status ?? '').toLowerCase();
  return normalized.includes('approved') || normalized.includes('aprov') || normalized.includes('active') || normalized.includes('ativo');
}

function isRejectedStatus(status?: string | null) {
  const normalized = String(status ?? '').toLowerCase();
  return normalized.includes('reject') || normalized.includes('rejeit');
}

function mapApprovalStatus(status?: string | null): 'pending' | 'approved' | 'rejected' | 'review' {
  if (isApprovedStatus(status)) return 'approved';
  if (isRejectedStatus(status)) return 'rejected';
  if (String(status ?? '').toLowerCase().includes('review')) return 'review';
  return 'pending';
}

export function calculateEvidencePackScore({
  documents,
  vendors,
  risks,
  aiSystems,
  aiIncidents,
  auditEvents,
}: {
  documents: EvidenceDocument[];
  vendors: EvidenceVendor[];
  risks: EvidenceRisk[];
  aiSystems: AiSystemRecord[];
  aiIncidents: AiIncidentRecord[];
  auditEvents: AuditEventRecord[];
}) {
  let score = 0;

  if (documents.length > 0) score += 18;
  if (documents.some((document) => isApprovedStatus(document.status))) score += 8;
  if (vendors.length > 0) score += 14;
  if (risks.length > 0) score += 14;
  if (aiSystems.length > 0) score += 18;
  if (aiSystems.every((system) => system.risk_level !== 'prohibited_review')) score += 6;
  if (aiIncidents.length > 0) score += 8;
  if (auditEvents.length > 0) score += 14;

  return Math.min(100, score);
}

export function getEvidencePackStatus(score: number): AuditEvidencePack['summary']['status'] {
  if (score >= 80) return 'audit_ready';
  if (score >= 40) return 'in_progress';
  return 'starting';
}

function buildNextActions(pack: Pick<AuditEvidencePack['summary'], 'documents' | 'vendors' | 'risks' | 'aiSystems' | 'auditEvents' | 'pendingDocumentReviews' | 'highRiskAiSystems' | 'openAiIncidents'>) {
  const actions: string[] = [];

  if (pack.documents === 0) actions.push('Upload controlled documents before sharing an audit pack.');
  if (pack.pendingDocumentReviews > 0) actions.push('Review pending controlled documents and complete approval workflows.');
  if (pack.vendors === 0) actions.push('Register critical vendors and subprocessors used by the organization.');
  if (pack.risks === 0) actions.push('Create at least one risk matrix entry linked to compliance controls.');
  if (pack.aiSystems === 0) actions.push('Register AI systems used or provided by the organization.');
  if (pack.highRiskAiSystems > 0) actions.push('Assign owner, evidence and review cadence to high-risk AI systems.');
  if (pack.openAiIncidents > 0) actions.push('Review open AI incidents and update reportability decisions.');
  if (pack.auditEvents === 0) actions.push('Generate operational activity so the audit trail is populated.');

  return actions.length > 0 ? actions : ['Maintain current evidence and review the pack before sharing externally.'];
}

export async function buildAuditEvidencePack({
  organization,
  userId,
  role,
  entitlements,
}: {
  organization: OrganizationSnapshot;
  userId: string;
  role?: OrganizationRole;
  entitlements: PlanEntitlements;
}): Promise<AuditEvidencePack> {
  const [documentsRaw, vendorsRaw, risksRaw, aiSystems, aiIncidents, auditEvents] = await Promise.all([
    listDocuments(organization.id),
    listVendors(organization.id),
    listRisks(organization.id),
    listAiSystems(organization.id),
    listAiIncidents(organization.id),
    listAuditEvents(organization.id, 100),
  ]);

  const documents = normalizeRows<EvidenceDocument>(documentsRaw);
  const vendors = normalizeRows<EvidenceVendor>(vendorsRaw);
  const risks = normalizeRows<EvidenceRisk>(risksRaw);
  const pendingDocumentReviews = documents.filter((document) => mapApprovalStatus(document.status) === 'pending' || mapApprovalStatus(document.status) === 'review').length;
  const highRiskVendors = vendors.filter((vendor) => String(vendor.risk_level ?? '').toLowerCase() === 'high').length;
  const highRiskAiSystems = aiSystems.filter((system) => system.risk_level === 'high_risk_review' || system.risk_level === 'prohibited_review').length;
  const openAiIncidents = aiIncidents.filter((incident) => !['reported', 'closed'].includes(incident.report_status)).length;

  const score = calculateEvidencePackScore({ documents, vendors, risks, aiSystems, aiIncidents, auditEvents });
  const summary = {
    score,
    status: getEvidencePackStatus(score),
    documents: documents.length,
    vendors: vendors.length,
    risks: risks.length,
    aiSystems: aiSystems.length,
    aiIncidents: aiIncidents.length,
    auditEvents: auditEvents.length,
    pendingDocumentReviews,
    highRiskVendors,
    highRiskAiSystems,
    openAiIncidents,
  };

  return {
    schemaVersion: '2026-06-10',
    generatedAt: new Date().toISOString(),
    generatedBy: {
      userId,
      role,
    },
    organization,
    plan: entitlements,
    summary,
    governance: {
      enterpriseReadiness: getEnterpriseReadinessSummary(),
      retention: {
        summary: getRetentionSummary(),
        policies: RETENTION_POLICIES,
      },
      continuity: {
        summary: getContinuitySummary(),
        controls: CONTINUITY_CONTROLS,
      },
      vendorAssurance: {
        summary: getVendorAssuranceSummary(),
        controls: VENDOR_ASSURANCE_CONTROLS,
      },
      securityQuestionnaire: {
        summary: getSecurityQuestionnaireSummary(),
        items: SECURITY_QUESTIONNAIRE_ITEMS,
      },
    },
    evidence: {
      documents,
      vendors,
      risks,
      aiSystems,
      aiIncidents,
      auditEvents,
      raciTemplate: [
        { item: 'Controlled documents', legal: 'A', security: 'C', compliance: 'R', finance: 'I' },
        { item: 'Vendor reviews', legal: 'R', security: 'C', compliance: 'A', finance: 'I' },
        { item: 'Risk matrix', legal: 'C', security: 'R', compliance: 'A', finance: 'I' },
        { item: 'AI governance', legal: 'A', security: 'C', compliance: 'R', finance: 'I' },
        { item: 'Incident response', legal: 'C', security: 'R', compliance: 'A', finance: 'I' },
      ],
      approvalSummary: documents.map((document) => ({
        documentId: document.id,
        title: document.title,
        status: mapApprovalStatus(document.status),
        updatedAt: document.updated_at ?? document.created_at,
      })),
    },
    nextActions: buildNextActions(summary),
  };
}

import { tryLoadLatestGapAssessment } from '@/lib/gap-analysis/storage';
import { tryLoadOpenComplianceWork } from '@/lib/compliance/remediation';
import { summarizeEvidence, tryListEvidenceItems } from '@/lib/evidence/storage';

export type AuditPackData = {
  generatedAt: string;
  complianceScore: number;
  auditReadiness: number;
  latestAssessmentDate: string | null;
  criticalFindings: number;
  openTasks: number;
  evidenceCoverage: number;
  evidenceTotal: number;
  evidenceValid: number;
  findings: Array<{
    id: string;
    article: string;
    title: string;
    severity: string;
    status: string;
    due_date?: string | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    priority: string;
    status: string;
    due_date?: string | null;
  }>;
  evidence: Array<{
    id: string;
    title: string;
    evidence_type: string;
    status: string;
    article_refs: string[];
    owner_name?: string | null;
  }>;
};

export async function buildAuditPackData(params: { userId: string; workspaceId?: string | null }): Promise<AuditPackData> {
  const [assessment, work, evidenceItems] = await Promise.all([
    tryLoadLatestGapAssessment({ userId: params.userId, workspaceId: params.workspaceId || null }),
    tryLoadOpenComplianceWork({ userId: params.userId, workspaceId: params.workspaceId || null }),
    tryListEvidenceItems({ userId: params.userId, workspaceId: params.workspaceId || null, limit: 100 }),
  ]);

  const evidenceSummary = summarizeEvidence(evidenceItems);
  const complianceScore = typeof assessment?.score === 'number' ? assessment.score : 0;
  const criticalFindings = (work.findings || []).filter((finding: any) => finding.severity === 'critical').length;
  const openTasks = (work.tasks || []).length;
  const auditReadiness = Math.max(0, Math.min(100, Math.round(
    complianceScore - criticalFindings * 8 - openTasks * 2 + Math.round(evidenceSummary.coverage * 0.15)
  )));

  return {
    generatedAt: new Date().toISOString(),
    complianceScore,
    auditReadiness,
    latestAssessmentDate: assessment?.created_at || null,
    criticalFindings,
    openTasks,
    evidenceCoverage: evidenceSummary.coverage,
    evidenceTotal: evidenceSummary.total,
    evidenceValid: evidenceSummary.valid,
    findings: (work.findings || []).map((finding: any) => ({
      id: finding.id,
      article: finding.article,
      title: finding.title,
      severity: finding.severity,
      status: finding.status,
      due_date: finding.due_date,
    })),
    tasks: (work.tasks || []).map((task: any) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date,
    })),
    evidence: evidenceItems.map((item) => ({
      id: item.id,
      title: item.title,
      evidence_type: item.evidence_type,
      status: item.status,
      article_refs: item.article_refs || [],
      owner_name: item.owner_name,
    })),
  };
}

export function auditPackToText(data: AuditPackData) {
  const lines = [
    'RISCK COMPLY AI - EU AI Act Audit Pack',
    `Generated: ${new Date(data.generatedAt).toLocaleString()}`,
    '',
    'Executive Summary',
    `Compliance Score: ${data.complianceScore}%`,
    `Audit Readiness: ${data.auditReadiness}%`,
    `Critical Findings: ${data.criticalFindings}`,
    `Open Tasks: ${data.openTasks}`,
    `Evidence Coverage: ${data.evidenceCoverage}%`,
    `Evidence Items: ${data.evidenceTotal}`,
    '',
    'Open Findings',
    ...(data.findings.length
      ? data.findings.map((finding) => `- ${finding.article} | ${finding.severity} | ${finding.status} | ${finding.title}`)
      : ['- No open findings']),
    '',
    'Open Tasks',
    ...(data.tasks.length
      ? data.tasks.map((task) => `- ${task.priority} | ${task.status} | ${task.title}`)
      : ['- No open tasks']),
    '',
    'Evidence Register',
    ...(data.evidence.length
      ? data.evidence.map((item) => `- ${item.status} | ${item.evidence_type} | ${item.title} | ${item.article_refs.join(', ')}`)
      : ['- No evidence registered']),
  ];

  return lines.join('\n');
}

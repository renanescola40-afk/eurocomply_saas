import { buildAuditPackData } from '@/lib/audit-pack/generator';

export type BoardReportData = {
  generatedAt: string;
  complianceScore: number;
  auditReadiness: number;
  evidenceCoverage: number;
  criticalFindings: number;
  openTasks: number;
  boardStatus: 'strong' | 'watch' | 'risk';
  executiveSummary: string;
  keyRisks: string[];
  nextActions: string[];
};

function boardStatusFor(data: { auditReadiness: number; criticalFindings: number; openTasks: number }): BoardReportData['boardStatus'] {
  if (data.auditReadiness >= 80 && data.criticalFindings === 0) return 'strong';
  if (data.auditReadiness >= 55 && data.criticalFindings <= 2) return 'watch';
  return 'risk';
}

function summaryFor(status: BoardReportData['boardStatus']) {
  if (status === 'strong') {
    return 'The organization shows a strong AI compliance posture. Continue maintaining evidence freshness and periodic reassessments.';
  }

  if (status === 'watch') {
    return 'The organization has a workable compliance baseline but should prioritize remediation of open findings and evidence gaps before external audit.';
  }

  return 'The organization has material audit-readiness risk. Immediate attention is recommended for critical findings, overdue tasks and missing evidence.';
}

export async function buildBoardReportData(params: { userId: string; workspaceId?: string | null }): Promise<BoardReportData> {
  const auditPack = await buildAuditPackData(params);
  const status = boardStatusFor(auditPack);

  const keyRisks = [
    auditPack.criticalFindings > 0 ? `${auditPack.criticalFindings} critical compliance finding(s) remain open.` : null,
    auditPack.openTasks > 0 ? `${auditPack.openTasks} remediation task(s) are still open.` : null,
    auditPack.evidenceCoverage < 70 ? `Evidence coverage is ${auditPack.evidenceCoverage}%, below the recommended threshold.` : null,
    auditPack.complianceScore < 70 ? `Compliance score is ${auditPack.complianceScore}%, indicating incomplete control maturity.` : null,
  ].filter(Boolean) as string[];

  const nextActions = [
    'Close critical findings linked to EU AI Act high-risk obligations.',
    'Attach valid evidence to every major remediation item.',
    'Refresh the Gap Analysis after remediation work is completed.',
    'Generate an updated Audit Pack before executive or external review.',
  ];

  return {
    generatedAt: auditPack.generatedAt,
    complianceScore: auditPack.complianceScore,
    auditReadiness: auditPack.auditReadiness,
    evidenceCoverage: auditPack.evidenceCoverage,
    criticalFindings: auditPack.criticalFindings,
    openTasks: auditPack.openTasks,
    boardStatus: status,
    executiveSummary: summaryFor(status),
    keyRisks: keyRisks.length ? keyRisks : ['No material board-level compliance risks detected from current records.'],
    nextActions,
  };
}

export function boardReportToText(data: BoardReportData) {
  return [
    'Risck comply AI - Board Report',
    `Generated: ${new Date(data.generatedAt).toLocaleString()}`,
    '',
    'Executive Summary',
    data.executiveSummary,
    '',
    `Board Status: ${data.boardStatus.toUpperCase()}`,
    `Compliance Score: ${data.complianceScore}%`,
    `Audit Readiness: ${data.auditReadiness}%`,
    `Evidence Coverage: ${data.evidenceCoverage}%`,
    `Critical Findings: ${data.criticalFindings}`,
    `Open Tasks: ${data.openTasks}`,
    '',
    'Key Risks',
    ...data.keyRisks.map((risk) => `- ${risk}`),
    '',
    'Recommended Next Actions',
    ...data.nextActions.map((action) => `- ${action}`),
  ].join('\n');
}

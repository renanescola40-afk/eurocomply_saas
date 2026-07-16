import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

export type DashboardSummary = Awaited<ReturnType<typeof getDashboardSummary>>;

export type DashboardTrendSnapshot = {
  snapshotDate: string;
  complianceScore: number;
  openTasks: number;
  openRisks: number;
  criticalRisks: number;
  highRiskVendors: number;
  missingDocuments: number;
};

export type DashboardTrendComparison = {
  complianceScoreDelta: number | null;
  openTasksDelta: number | null;
  openRisksDelta: number | null;
  criticalRisksDelta: number | null;
  highRiskVendorsDelta: number | null;
  missingDocumentsDelta: number | null;
};

type QueryError = {
  code?: string;
} | null;

type CountResult = {
  count: number | null;
  error: QueryError;
};

type DashboardSnapshotRow = {
  created_at?: string | null;
  compliance_score?: number | string | null;
  open_tasks?: number | string | null;
  open_risks?: number | string | null;
  critical_risks?: number | string | null;
  high_risk_vendors?: number | string | null;
  missing_documents?: number | string | null;
};

function safeCount(result: CountResult, label: string) {
  if (result.error) {
    console.warn('[dashboard] count_failed', { label, code: result.error.code ?? 'unknown' });
    throw new Error('Unable to load dashboard summary.');
  }

  return result.count ?? 0;
}

function areDashboardSnapshotsEnabled() {
  return process.env.ENABLE_DASHBOARD_METRIC_SNAPSHOTS === 'true';
}

export async function getDashboardSummary(organizationId: string) {
  noStore();

  const supabase = createAdminClient();

  const [
    taskTotalResult,
    openTaskResult,
    vendorTotalResult,
    highRiskVendorResult,
    riskTotalResult,
    openRiskResult,
    criticalRiskResult,
    documentTotalResult,
    missingDocumentResult,
  ] = await Promise.all([
    supabase.from('compliance_tasks').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('compliance_tasks').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).neq('status', 'done'),
    supabase.from('vendors').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('vendors').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('risk_level', 'high'),
    supabase.from('risks').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('risks').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).neq('status', 'closed'),
    supabase.from('risks').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).gte('risk_score', 16),
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).neq('status', 'approved'),
  ]);

  const taskTotal = safeCount(taskTotalResult, 'tasks_total');
  const openTasks = safeCount(openTaskResult, 'tasks_open');
  const vendorTotal = safeCount(vendorTotalResult, 'vendors_total');
  const highRiskVendors = safeCount(highRiskVendorResult, 'vendors_high_risk');
  const riskTotal = safeCount(riskTotalResult, 'risks_total');
  const openRisks = safeCount(openRiskResult, 'risks_open');
  const criticalRisks = safeCount(criticalRiskResult, 'risks_critical');
  const documentTotal = safeCount(documentTotalResult, 'documents_total');
  const missingDocuments = safeCount(missingDocumentResult, 'documents_missing');

  const totalSignals = taskTotal + vendorTotal + riskTotal + documentTotal;
  const negativeSignals = openTasks + highRiskVendors + criticalRisks + missingDocuments;
  const complianceScore = totalSignals === 0 ? 0 : Math.max(0, Math.round(100 - (negativeSignals / totalSignals) * 100));

  return {
    complianceScore,
    openTasks,
    highRiskVendors,
    openRisks,
    criticalRisks,
    missingDocuments,
    totals: {
      tasks: taskTotal,
      vendors: vendorTotal,
      risks: riskTotal,
      documents: documentTotal,
    },
  };
}

export async function recordDashboardMetricSnapshot(organizationId: string, summary: DashboardSummary) {
  if (!areDashboardSnapshotsEnabled()) return;

  const supabase = createAdminClient();

  const { error } = await supabase.from('compliance_metric_snapshots').insert({
    organization_id: organizationId,
    compliance_score: summary.complianceScore,
    open_tasks: summary.openTasks,
    open_risks: summary.openRisks,
    critical_risks: summary.criticalRisks,
    high_risk_vendors: summary.highRiskVendors,
    missing_documents: summary.missingDocuments,
    total_tasks: summary.totals.tasks,
    total_risks: summary.totals.risks,
    total_vendors: summary.totals.vendors,
    total_documents: summary.totals.documents,
  });

  if (error) {
    console.warn('[dashboard] metric_snapshot_write_failed', { code: error.code ?? 'unknown' });
    throw new Error('Unable to record dashboard metric snapshot.');
  }
}

export async function getDashboardTrendHistory(organizationId: string, limit = 12): Promise<DashboardTrendSnapshot[]> {
  noStore();
  if (!areDashboardSnapshotsEnabled()) return [];

  const safeLimit = Math.max(1, Math.min(limit, 52));
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('compliance_metric_snapshots')
    .select('created_at, compliance_score, open_tasks, open_risks, critical_risks, high_risk_vendors, missing_documents')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(0, safeLimit - 1);

  if (error) {
    console.warn('[dashboard] trend_history_failed', { code: error.code ?? 'unknown' });
    throw new Error('Unable to load dashboard trend history.');
  }

  return ((data ?? []) as DashboardSnapshotRow[])
    .map((row, index) => ({
      snapshotDate: row.created_at ?? new Date(Date.now() - index * 86_400_000).toISOString(),
      complianceScore: Number(row.compliance_score ?? 0),
      openTasks: Number(row.open_tasks ?? 0),
      openRisks: Number(row.open_risks ?? 0),
      criticalRisks: Number(row.critical_risks ?? 0),
      highRiskVendors: Number(row.high_risk_vendors ?? 0),
      missingDocuments: Number(row.missing_documents ?? 0),
    }))
    .reverse();
}

export function getDashboardTrendComparison(history: DashboardTrendSnapshot[]): DashboardTrendComparison {
  if (history.length < 2) {
    return {
      complianceScoreDelta: null,
      openTasksDelta: null,
      openRisksDelta: null,
      criticalRisksDelta: null,
      highRiskVendorsDelta: null,
      missingDocumentsDelta: null,
    };
  }

  const previous = history[history.length - 2];
  const current = history[history.length - 1];

  return {
    complianceScoreDelta: current.complianceScore - previous.complianceScore,
    openTasksDelta: current.openTasks - previous.openTasks,
    openRisksDelta: current.openRisks - previous.openRisks,
    criticalRisksDelta: current.criticalRisks - previous.criticalRisks,
    highRiskVendorsDelta: current.highRiskVendors - previous.highRiskVendors,
    missingDocumentsDelta: current.missingDocuments - previous.missingDocuments,
  };
}

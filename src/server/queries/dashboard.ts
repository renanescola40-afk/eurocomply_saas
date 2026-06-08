import { tryCreateAdminClient } from '@/lib/supabase/admin';

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

type DashboardRow = Record<string, unknown>;

function emptyDashboardSummary() {
  return {
    complianceScore: 0,
    openTasks: 0,
    highRiskVendors: 0,
    openRisks: 0,
    criticalRisks: 0,
    missingDocuments: 0,
    totals: {
      tasks: 0,
      vendors: 0,
      risks: 0,
      documents: 0,
    },
  };
}

function safeRows(result: { data: DashboardRow[] | null; error: { message?: string } | null }, label: string) {
  if (result.error) {
    console.warn(`[dashboard] Failed to load ${label}:`, result.error.message ?? 'Unknown error');
    return [];
  }

  return result.data ?? [];
}

export async function getDashboardSummary(organizationId: string) {
  const supabase = tryCreateAdminClient();
  if (!supabase) return emptyDashboardSummary();

  const [tasks, vendors, risks, documents] = await Promise.all([
    supabase.from('compliance_tasks').select('id,status,priority', { count: 'exact', head: false }).eq('organization_id', organizationId),
    supabase.from('vendors').select('id,risk_level,review_status', { count: 'exact', head: false }).eq('organization_id', organizationId),
    supabase.from('risks').select('id,status,risk_score', { count: 'exact', head: false }).eq('organization_id', organizationId),
    supabase.from('documents').select('id,status,expires_at', { count: 'exact', head: false }).eq('organization_id', organizationId),
  ]);

  const taskRows = safeRows(tasks, 'tasks');
  const vendorRows = safeRows(vendors, 'vendors');
  const riskRows = safeRows(risks, 'risks');
  const documentRows = safeRows(documents, 'documents');

  const openTasks = taskRows.filter((task) => task.status !== 'done').length;
  const highRiskVendors = vendorRows.filter((vendor) => vendor.risk_level === 'high').length;
  const openRisks = riskRows.filter((risk) => risk.status !== 'closed').length;
  const criticalRisks = riskRows.filter((risk) => Number(risk.risk_score ?? 0) >= 16).length;
  const missingDocuments = documentRows.filter((document) => document.status !== 'approved').length;

  const totalSignals = taskRows.length + vendorRows.length + riskRows.length + documentRows.length;
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
      tasks: taskRows.length,
      vendors: vendorRows.length,
      risks: riskRows.length,
      documents: documentRows.length,
    },
  };
}

export async function recordDashboardMetricSnapshot(organizationId: string, summary: DashboardSummary) {
  const supabase = tryCreateAdminClient();
  if (!supabase) return;

  const { error } = await supabase.from('compliance_metric_snapshots').upsert(
    {
      organization_id: organizationId,
      snapshot_date: new Date().toISOString().slice(0, 10),
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
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id,snapshot_date' },
  );

  if (error) {
    console.error('Failed to record dashboard metric snapshot', error.message);
  }
}

export async function getDashboardTrendHistory(organizationId: string, limit = 12): Promise<DashboardTrendSnapshot[]> {
  const supabase = tryCreateAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('compliance_metric_snapshots')
    .select('snapshot_date, compliance_score, open_tasks, open_risks, critical_risks, high_risk_vendors, missing_documents')
    .eq('organization_id', organizationId)
    .order('snapshot_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load dashboard trend history', error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => ({
      snapshotDate: row.snapshot_date,
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

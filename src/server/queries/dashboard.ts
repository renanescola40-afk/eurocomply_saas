import { createAdminClient } from '@/lib/supabase/admin';

export async function getDashboardSummary(organizationId: string) {
  const supabase = createAdminClient();

  const [tasks, vendors, risks, documents] = await Promise.all([
    supabase.from('compliance_tasks').select('id,status,priority', { count: 'exact', head: false }).eq('organization_id', organizationId),
    supabase.from('vendors').select('id,risk_level,review_status', { count: 'exact', head: false }).eq('organization_id', organizationId),
    supabase.from('risks').select('id,status,risk_score', { count: 'exact', head: false }).eq('organization_id', organizationId),
    supabase.from('documents').select('id,status,expires_at', { count: 'exact', head: false }).eq('organization_id', organizationId),
  ]);

  if (tasks.error) throw tasks.error;
  if (vendors.error) throw vendors.error;
  if (risks.error) throw risks.error;
  if (documents.error) throw documents.error;

  const taskRows = tasks.data ?? [];
  const vendorRows = vendors.data ?? [];
  const riskRows = risks.data ?? [];
  const documentRows = documents.data ?? [];

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

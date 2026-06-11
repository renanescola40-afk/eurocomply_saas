import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { normalizeOrganization } from '@/lib/dashboard/organization-adapter';
import { getCurrentOrganizationForUser } from './current-organization';
import { getDashboardSummary, getDashboardTrendComparison, getDashboardTrendHistory, recordDashboardMetricSnapshot } from './dashboard';

type QueryError = {
  code?: string;
  message?: string;
} | null;

function isExpectedSchemaFallback(error: QueryError) {
  return error?.code === '42P01' || error?.code === '42703' || error?.code === 'PGRST204' || error?.code === 'PGRST205';
}

function logDashboardPreviewError(label: string, error: QueryError) {
  if (error && !isExpectedSchemaFallback(error)) {
    console.warn('[dashboard] preview_query_failed', { label, code: error.code ?? 'unknown' });
  }
}

async function listDashboardTasks(organizationId: string) {
  const supabase = tryCreateAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('compliance_tasks')
    .select('id,title,status,priority,due_date')
    .eq('organization_id', organizationId)
    .neq('status', 'done')
    .order('due_date', { ascending: true })
    .limit(5);

  if (error) {
    logDashboardPreviewError('tasks', error);
    return [];
  }

  return data ?? [];
}

async function listDashboardTopRisks(organizationId: string) {
  const supabase = tryCreateAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('risks')
    .select('id,title,status,risk_score,category')
    .eq('organization_id', organizationId)
    .neq('status', 'closed')
    .order('risk_score', { ascending: false })
    .limit(5);

  if (error) {
    logDashboardPreviewError('risks', error);
    return [];
  }

  return data ?? [];
}

async function listDashboardVendorsRequiringReview(organizationId: string) {
  const supabase = tryCreateAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('vendors')
    .select('id,name,risk_level,review_status,created_at,updated_at')
    .eq('organization_id', organizationId)
    .or('review_status.neq.approved,risk_level.eq.high')
    .order('updated_at', { ascending: true })
    .limit(5);

  if (error) {
    logDashboardPreviewError('vendors', error);
    return [];
  }

  return data ?? [];
}

async function listDashboardDocumentsExpiringSoon(organizationId: string) {
  const supabase = tryCreateAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('documents')
    .select('id,title,status,expires_at')
    .eq('organization_id', organizationId)
    .not('expires_at', 'is', null)
    .neq('status', 'archived')
    .order('expires_at', { ascending: true })
    .limit(5);

  if (error) {
    logDashboardPreviewError('documents', error);
    return [];
  }

  return data ?? [];
}

export async function getOrganizationDashboardData(userId: string, organizationSlug?: string) {
  const organization = await getCurrentOrganizationForUser(userId, organizationSlug);

  if (!organization) {
    return null;
  }

  const [summary, tasks, topRisks, vendorsRequiringReview, documentsExpiringSoon] = await Promise.all([
    getDashboardSummary(organization.id),
    listDashboardTasks(organization.id),
    listDashboardTopRisks(organization.id),
    listDashboardVendorsRequiringReview(organization.id),
    listDashboardDocumentsExpiringSoon(organization.id),
  ]);

  await recordDashboardMetricSnapshot(organization.id, summary);

  const trendHistory = await getDashboardTrendHistory(organization.id);
  const trendComparison = getDashboardTrendComparison(trendHistory);

  return {
    organization: normalizeOrganization(organization),
    summary,
    tasks,
    trendHistory,
    trendComparison,
    topRisks,
    vendorsRequiringReview,
    documentsExpiringSoon,
  };
}

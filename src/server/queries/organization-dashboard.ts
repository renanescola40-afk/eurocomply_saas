import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { normalizeOrganization } from '@/lib/dashboard/organization-adapter';
import { getOrganizationEntitlements, getPlanEntitlements } from '@/server/billing/entitlements';
import { getCurrentOrganizationForUser } from './current-organization';
import {
  getDashboardSummary,
  getDashboardTrendComparison,
  getDashboardTrendHistory,
  recordDashboardMetricSnapshot,
  type DashboardSummary,
  type DashboardTrendSnapshot,
} from './dashboard';

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

function getEmptyDashboardSummary(): DashboardSummary {
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

async function withDashboardTimeout<T>(label: string, promise: Promise<T>, fallback: T, timeoutMs = 3_500) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn('[dashboard] query_timeout', { label, timeoutMs });
      resolve(fallback);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } catch (error) {
    console.warn('[dashboard] query_failed', {
      label,
      message: error instanceof Error ? error.message : 'unknown',
    });
    return fallback;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
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

  const emptySummary = getEmptyDashboardSummary();
  const fallbackEntitlements = getPlanEntitlements('essential');

  const [summary, tasks, topRisks, vendorsRequiringReview, documentsExpiringSoon, entitlements, trendHistory] = await Promise.all([
    withDashboardTimeout('summary', getDashboardSummary(organization.id), emptySummary),
    withDashboardTimeout('tasks', listDashboardTasks(organization.id), []),
    withDashboardTimeout('risks', listDashboardTopRisks(organization.id), []),
    withDashboardTimeout('vendors', listDashboardVendorsRequiringReview(organization.id), []),
    withDashboardTimeout('documents', listDashboardDocumentsExpiringSoon(organization.id), []),
    withDashboardTimeout('entitlements', getOrganizationEntitlements(organization.id), fallbackEntitlements, 2_500),
    withDashboardTimeout<DashboardTrendSnapshot[]>('trend_history', getDashboardTrendHistory(organization.id), [], 2_500),
  ]);

  void recordDashboardMetricSnapshot(organization.id, summary).catch((error) => {
    console.warn('[dashboard] metric_snapshot_background_failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
  });

  return {
    organization: normalizeOrganization(organization),
    entitlements,
    summary,
    tasks,
    trendHistory,
    trendComparison: getDashboardTrendComparison(trendHistory),
    topRisks,
    vendorsRequiringReview,
    documentsExpiringSoon,
  };
}

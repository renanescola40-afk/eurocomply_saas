import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeOrganization } from '@/lib/dashboard/organization-adapter';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentOrganizationForUser } from './current-organization';
import {
  getDashboardSummary,
  getDashboardTrendComparison,
  getDashboardTrendHistory,
  recordDashboardMetricSnapshot,
  type DashboardSummary,
} from './dashboard';

const DASHBOARD_PREVIEW_PAGE_SIZE = 5;
const DASHBOARD_PREVIEW_LAST_INDEX = DASHBOARD_PREVIEW_PAGE_SIZE - 1;
const DASHBOARD_AI_SYSTEM_PREVIEW_SIZE = 25;

type QueryError = {
  code?: string;
} | null;

type CountResult = {
  count: number | null;
  error: QueryError;
};

export type DashboardMemberRole = 'owner' | 'admin' | 'member' | 'viewer' | 'compliance_manager';

export type OrganizationWorkflowReadiness = {
  status: 'ready' | 'attention' | 'blocked';
  reasons: string[];
};

export type DashboardAiSystemSummary = {
  total: number;
  high: number;
  unacceptable: number;
  limited: number;
  minimal: number;
  previews: Array<{
    id: string;
    name?: string | null;
    risk_level?: string | null;
    lifecycle_status?: string | null;
    vendor_name?: string | null;
    owner_team?: string | null;
    updated_at?: string | null;
  }>;
};

export type DashboardAuditEventPreview = {
  id: string;
  action?: string | null;
  entity_type?: string | null;
  created_at?: string | null;
};

function logDashboardPreviewError(label: string, error: QueryError) {
  if (error) {
    console.warn('[dashboard] preview_query_failed', { label, code: error.code ?? 'unknown' });
  }
}

function getErrorCode(error: unknown) {
  return error instanceof Error ? error.name : 'unknown';
}

function safeCount(result: CountResult, label: string) {
  if (result.error) {
    logDashboardPreviewError(label, result.error);
    throw new Error('Unable to load dashboard data.');
  }

  return result.count ?? 0;
}

export function normalizeDashboardMemberRole(role?: string | null): DashboardMemberRole {
  if (role === 'owner' || role === 'admin' || role === 'member' || role === 'viewer' || role === 'compliance_manager') {
    return role;
  }

  return 'viewer';
}

export function canManageDashboard(role?: string | null) {
  const normalizedRole = normalizeDashboardMemberRole(role);

  return normalizedRole === 'owner' || normalizedRole === 'admin' || normalizedRole === 'compliance_manager';
}

export function canManageDashboardBilling(role?: string | null) {
  return normalizeDashboardMemberRole(role) === 'owner';
}

function getOrganizationWorkflowReadiness(
  summary: DashboardSummary,
  tasks: unknown[],
  topRisks: unknown[],
  vendorsRequiringReview: unknown[],
  documentsExpiringSoon: unknown[],
  aiSystemSummary: DashboardAiSystemSummary,
): OrganizationWorkflowReadiness {
  const reasons: string[] = [];

  if (summary.criticalRisks > 0 || topRisks.length > 0 || aiSystemSummary.high > 0 || aiSystemSummary.unacceptable > 0) {
    reasons.push('risk-review-required');
  }

  if (summary.openTasks > 0 || tasks.length > 0) {
    reasons.push('open-compliance-work');
  }

  if (summary.highRiskVendors > 0 || vendorsRequiringReview.length > 0) {
    reasons.push('vendor-review-required');
  }

  if (summary.missingDocuments > 0 || documentsExpiringSoon.length > 0) {
    reasons.push('evidence-review-required');
  }

  if (aiSystemSummary.total === 0) {
    reasons.push('ai-inventory-required');
  }

  if (summary.complianceScore < 55) {
    return { status: 'blocked', reasons };
  }

  if (reasons.length > 0 || summary.complianceScore < 80) {
    return { status: 'attention', reasons };
  }

  return { status: 'ready', reasons: ['ready-for-executive-review'] };
}

async function withDashboardTimeout<T>(label: string, promise: Promise<T>, timeoutMs = 3_500): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Dashboard query timed out.'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } catch (error) {
    const code = error instanceof Error && error.message === 'Dashboard query timed out.' ? 'timeout' : getErrorCode(error);
    console.warn('[dashboard] query_failed', { label, code, timeoutMs });
    throw new Error('Unable to load dashboard data.');
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function listDashboardTasks(organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('compliance_tasks')
    .select('id,title,status,priority,due_date')
    .eq('organization_id', organizationId)
    .neq('status', 'done')
    .order('due_date', { ascending: true })
    .range(0, DASHBOARD_PREVIEW_LAST_INDEX);

  if (error) {
    logDashboardPreviewError('tasks', error);
    throw new Error('Unable to load dashboard tasks.');
  }

  return (data ?? []).map((task) => ({
    ...task,
    dueDate: task.due_date ?? null,
  }));
}

async function listDashboardTopRisks(organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('risks')
    .select('id,title,status,risk_score,category')
    .eq('organization_id', organizationId)
    .neq('status', 'closed')
    .order('risk_score', { ascending: false })
    .range(0, DASHBOARD_PREVIEW_LAST_INDEX);

  if (error) {
    logDashboardPreviewError('risks', error);
    throw new Error('Unable to load dashboard risks.');
  }

  return data ?? [];
}

async function listDashboardVendorsRequiringReview(organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('vendors')
    .select('id,name,risk_level,review_status,next_review_at,created_at,updated_at')
    .eq('organization_id', organizationId)
    .or('review_status.neq.approved,risk_level.eq.high')
    .order('updated_at', { ascending: true })
    .range(0, DASHBOARD_PREVIEW_LAST_INDEX);

  if (error) {
    logDashboardPreviewError('vendors', error);
    throw new Error('Unable to load dashboard vendors.');
  }

  return data ?? [];
}

async function listDashboardDocumentsExpiringSoon(organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('documents')
    .select('id,title,status,expires_at')
    .eq('organization_id', organizationId)
    .not('expires_at', 'is', null)
    .neq('status', 'archived')
    .order('expires_at', { ascending: true })
    .range(0, DASHBOARD_PREVIEW_LAST_INDEX);

  if (error) {
    logDashboardPreviewError('documents', error);
    throw new Error('Unable to load dashboard documents.');
  }

  return data ?? [];
}

async function getDashboardAiSystemSummary(organizationId: string): Promise<DashboardAiSystemSummary> {
  const supabase = createAdminClient();

  const [previewResult, totalResult, highResult, unacceptableResult, limitedResult, minimalResult] = await Promise.all([
    supabase
      .from('ai_systems')
      .select('id,name,risk_level,lifecycle_status,vendor_name,owner_team,updated_at')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .range(0, DASHBOARD_AI_SYSTEM_PREVIEW_SIZE - 1),
    supabase.from('ai_systems').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('ai_systems').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('risk_level', 'high'),
    supabase.from('ai_systems').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('risk_level', 'unacceptable'),
    supabase.from('ai_systems').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('risk_level', 'limited'),
    supabase.from('ai_systems').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('risk_level', 'minimal'),
  ]);

  if (previewResult.error) {
    logDashboardPreviewError('ai_systems_preview', previewResult.error);
    throw new Error('Unable to load dashboard AI systems.');
  }

  return {
    total: safeCount(totalResult, 'ai_systems_total'),
    high: safeCount(highResult, 'ai_systems_high'),
    unacceptable: safeCount(unacceptableResult, 'ai_systems_unacceptable'),
    limited: safeCount(limitedResult, 'ai_systems_limited'),
    minimal: safeCount(minimalResult, 'ai_systems_minimal'),
    previews: previewResult.data ?? [],
  };
}

async function listDashboardAuditEvents(organizationId: string): Promise<DashboardAuditEventPreview[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('audit_logs')
    .select('id,action,entity_type,created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(0, DASHBOARD_PREVIEW_LAST_INDEX);

  if (error) {
    logDashboardPreviewError('audit_events', error);
    throw new Error('Unable to load dashboard audit events.');
  }

  return data ?? [];
}

export async function getOrganizationDashboardData(userId: string, organizationSlug?: string) {
  noStore();

  const organization = await getCurrentOrganizationForUser(userId, organizationSlug);

  if (!organization) {
    return null;
  }

  const [
    summary,
    tasks,
    topRisks,
    vendorsRequiringReview,
    documentsExpiringSoon,
    aiSystemSummary,
    auditEvents,
    entitlements,
    trendHistory,
  ] = await Promise.all([
    withDashboardTimeout('summary', getDashboardSummary(organization.id)),
    withDashboardTimeout('tasks', listDashboardTasks(organization.id)),
    withDashboardTimeout('risks', listDashboardTopRisks(organization.id)),
    withDashboardTimeout('vendors', listDashboardVendorsRequiringReview(organization.id)),
    withDashboardTimeout('documents', listDashboardDocumentsExpiringSoon(organization.id)),
    withDashboardTimeout('ai_systems', getDashboardAiSystemSummary(organization.id)),
    withDashboardTimeout('audit_events', listDashboardAuditEvents(organization.id)),
    withDashboardTimeout('entitlements', getOrganizationEntitlements(organization.id), 2_500),
    withDashboardTimeout('trend_history', getDashboardTrendHistory(organization.id), 2_500),
  ]);

  void recordDashboardMetricSnapshot(organization.id, summary).catch((error) => {
    console.warn('[dashboard] metric_snapshot_background_failed', { code: getErrorCode(error) });
  });

  const currentUserRole = normalizeDashboardMemberRole(organization.role);

  return {
    organization: normalizeOrganization(organization),
    entitlements,
    summary,
    workflowReadiness: getOrganizationWorkflowReadiness(summary, tasks, topRisks, vendorsRequiringReview, documentsExpiringSoon, aiSystemSummary),
    currentUserRole,
    canManageWorkspace: canManageDashboard(currentUserRole),
    canManageBilling: canManageDashboardBilling(currentUserRole),
    tasks,
    trendHistory,
    trendComparison: getDashboardTrendComparison(trendHistory),
    topRisks,
    vendorsRequiringReview,
    documentsExpiringSoon,
    aiSystemSummary,
    auditEvents,
  };
}

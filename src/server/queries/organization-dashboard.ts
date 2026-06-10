import { getCurrentOrganizationForUser } from './current-organization';
import { getDashboardSummary, getDashboardTrendComparison, getDashboardTrendHistory, recordDashboardMetricSnapshot } from './dashboard';
import { listComplianceTasks } from './compliance-tasks';
import { listDocuments } from './documents';
import { listRisks } from './risks';
import { listVendors } from './vendors';
import { normalizeOrganization } from '@/lib/dashboard/organization-adapter';

function getRiskScore(risk: { risk_score?: number | string | null }) {
  return Number(risk.risk_score ?? 0);
}

function getDateTime(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  return new Date(value).getTime();
}

function getVendorReviewSortDate(vendor: { updated_at?: string | null; created_at?: string | null }) {
  return getDateTime(vendor.updated_at ?? vendor.created_at ?? null);
}

export async function getOrganizationDashboardData(userId: string, organizationSlug?: string) {
  const organization = await getCurrentOrganizationForUser(userId, organizationSlug);

  if (!organization) {
    return null;
  }

  const [summary, tasks, risks, vendors, documents] = await Promise.all([
    getDashboardSummary(organization.id),
    listComplianceTasks(organization.id),
    listRisks(organization.id),
    listVendors(organization.id),
    listDocuments(organization.id),
  ]);

  await recordDashboardMetricSnapshot(organization.id, summary);

  const trendHistory = await getDashboardTrendHistory(organization.id);
  const trendComparison = getDashboardTrendComparison(trendHistory);

  const topRisks = risks
    .filter((risk) => risk.status !== 'closed')
    .sort((a, b) => getRiskScore(b) - getRiskScore(a))
    .slice(0, 5);

  const vendorsRequiringReview = vendors
    .filter((vendor) => vendor.review_status !== 'approved' || vendor.risk_level === 'high')
    .sort((a, b) => {
      const aIsHighRisk = a.risk_level === 'high' ? 1 : 0;
      const bIsHighRisk = b.risk_level === 'high' ? 1 : 0;
      return bIsHighRisk - aIsHighRisk || getVendorReviewSortDate(a) - getVendorReviewSortDate(b);
    })
    .slice(0, 5);

  const documentsExpiringSoon = documents
    .filter((document) => document.expires_at && document.status !== 'archived')
    .sort((a, b) => getDateTime(a.expires_at) - getDateTime(b.expires_at))
    .slice(0, 5);

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

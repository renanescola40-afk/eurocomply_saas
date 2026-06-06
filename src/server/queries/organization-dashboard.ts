import { getCurrentOrganizationForUser } from './current-organization';
import { getDashboardSummary, getDashboardTrendComparison, getDashboardTrendHistory, recordDashboardMetricSnapshot } from './dashboard';
import { listComplianceTasks } from './compliance-tasks';
import { normalizeOrganization } from '@/lib/dashboard/organization-adapter';

export async function getOrganizationDashboardData(userId: string, organizationSlug?: string) {
  const organization = await getCurrentOrganizationForUser(userId, organizationSlug);

  if (!organization) {
    return null;
  }

  const [summary, tasks] = await Promise.all([
    getDashboardSummary(organization.id),
    listComplianceTasks(organization.id),
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
  };
}

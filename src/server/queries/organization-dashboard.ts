import { getCurrentOrganizationForUser } from './current-organization';
import { getDashboardSummary } from './dashboard';
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

  return {
    organization: normalizeOrganization(organization),
    summary,
    tasks,
  };
}

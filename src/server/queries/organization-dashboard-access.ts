import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

export async function getOrganizationDashboardRedirect(locale: string) {
  const user = await getCurrentUser();

  if (!user) {
    return `/${locale}/login?next=${encodeURIComponent(`/${locale}/dashboard/organizations`)}`;
  }

  const currentOrganization = await getCurrentOrganizationForUser(user.id);

  if (!currentOrganization || !currentOrganization.is_onboarding_completed) {
    return `/${locale}/onboarding`;
  }

  return null;
}

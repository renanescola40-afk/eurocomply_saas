import { redirect } from 'next/navigation';
import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell';
import { getCurrentUser } from '@/server/queries/auth';
import { listNotificationsForUser } from '@/server/queries/compliance-activity';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { getOrganizationBillingAuthority } from '@/server/queries/subscription';
import { NotificationsClient } from './notifications-client';

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [notifications, organization] = await Promise.all([
    listNotificationsForUser(user.id),
    getCurrentOrganizationForUser(user.id),
  ]);
  const authority = organization ? await getOrganizationBillingAuthority(organization.id) : null;
  const userDisplayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'RISCK COMPLY user';
  const content = <NotificationsClient locale={locale} initialNotifications={notifications} />;

  if (!organization) {
    return <div className="min-h-screen bg-[#0b100f] p-4 md:p-6">{content}</div>;
  }

  return (
    <EnterpriseDashboardShell
      locale={locale}
      organizationName={organization.name}
      userDisplayName={userDisplayName}
      role={organization.role}
      selectedPlan={authority?.plan}
    >
      {content}
    </EnterpriseDashboardShell>
  );
}

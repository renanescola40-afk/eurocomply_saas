import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/queries/auth';
import { listNotificationsForUser } from '@/server/queries/compliance-activity';
import { NotificationsClient } from './notifications-client';

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const notifications = await listNotificationsForUser(user.id);

  return <NotificationsClient locale={locale} initialNotifications={notifications} />;
}

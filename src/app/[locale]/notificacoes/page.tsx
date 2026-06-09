import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/queries/auth';
import { NotificationsClient } from './notifications-client';

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return <NotificationsClient locale={locale} />;
}

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/queries/auth';
import { ProfileClient } from './profile-client';

export default async function ProfilePage({ params }: { params: { locale: string } }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${params.locale}/login`);
  }

  return <ProfileClient locale={params.locale} />;
}

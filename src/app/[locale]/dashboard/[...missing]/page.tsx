import { redirect } from 'next/navigation';

export default function MissingDashboardRoutePage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/dashboard/organizations`);
}

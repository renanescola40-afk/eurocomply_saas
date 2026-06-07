import { redirect } from 'next/navigation';

export default function ReportsRedirectPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/dashboard/organizations/reports`);
}

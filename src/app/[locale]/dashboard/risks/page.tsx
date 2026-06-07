import { redirect } from 'next/navigation';

export default function RisksRedirectPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/dashboard/organizations/risks`);
}

import { redirect } from 'next/navigation';

export default function TeamRedirectPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/dashboard/organizations/team`);
}

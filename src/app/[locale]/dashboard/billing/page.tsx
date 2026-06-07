import { redirect } from 'next/navigation';

export default function BillingRedirectPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/dashboard/organizations/billing`);
}

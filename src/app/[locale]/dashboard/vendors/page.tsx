import { redirect } from 'next/navigation';

export default function VendorsRedirectPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/dashboard/organizations/vendors`);
}

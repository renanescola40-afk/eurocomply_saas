import { redirect } from 'next/navigation';

export default function DocumentsRedirectPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/dashboard/organizations/documents`);
}

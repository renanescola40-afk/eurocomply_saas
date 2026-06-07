import { redirect } from 'next/navigation';

export default function TasksRedirectPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/dashboard/organizations/tasks`);
}

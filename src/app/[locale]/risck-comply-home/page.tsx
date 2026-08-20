import { redirect } from 'next/navigation';

export default async function RisckComplyHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Preserve legacy bookmarks while making the authenticated organization
  // dashboard the single canonical home. This prevents the retired standalone
  // dashboard chrome from resurfacing outside EnterpriseDashboardShell.
  redirect(`/${locale}/dashboard/organizations`);
}

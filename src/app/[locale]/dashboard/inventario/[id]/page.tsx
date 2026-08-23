import { redirect } from 'next/navigation';

export default async function LegacyInventoryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale } = await params;

  // The retired ai_tools detail route performed direct browser reads/writes.
  // Canonical AI Systems owns licensed inventory access and mutations now.
  redirect(`/${locale}/ai-systems`);
}

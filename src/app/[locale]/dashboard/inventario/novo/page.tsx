import { redirect } from 'next/navigation';

export default async function LegacyNewInventoryCasePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // New AI inventory records must be created through the canonical licensed
  // AI Systems surface/API, never by a browser-side Supabase table insert.
  redirect(`/${locale}/ai-systems`);
}

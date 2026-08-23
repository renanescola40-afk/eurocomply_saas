import { redirect } from 'next/navigation';

export default async function LegacyInventoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // The legacy workspace/ai_tools inventory used the browser Supabase client
  // directly. Converge it on the canonical AI Systems product surface, whose
  // page and API both enforce durable commercial authority server-side.
  redirect(`/${locale}/ai-systems`);
}

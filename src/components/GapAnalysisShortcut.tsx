'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { ClipboardCheck } from 'lucide-react';

const labels: Record<string, string> = {
  en: 'Gap Analysis',
  pt: 'Gap Analysis',
  es: 'Gap Analysis',
  fr: 'Gap Analysis',
  it: 'Gap Analysis',
  de: 'Gap Analysis',
};

export default function GapAnalysisShortcut() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || 'en';

  if (!pathname.includes('/dashboard') || pathname.includes('/dashboard/gap-analysis')) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.push(`/${locale}/dashboard/gap-analysis`)}
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-white px-4 py-3 text-sm font-semibold text-black shadow-2xl shadow-blue-500/20 transition hover:scale-[1.02] hover:bg-white/90"
      aria-label="Open Gap Analysis"
    >
      <ClipboardCheck className="h-4 w-4" />
      {labels[locale] ?? labels.en}
    </button>
  );
}

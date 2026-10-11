'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ClipboardCheck } from 'lucide-react';

export default function GapAnalysisShortcut() {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname.includes('/dashboard') || pathname.includes('/dashboard/gap-analysis')) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.push('/en/dashboard/gap-analysis')}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-white/10 bg-white p-3 text-sm font-semibold text-black shadow-2xl shadow-blue-500/20 transition hover:scale-[1.02] hover:bg-white/90 sm:bottom-5 sm:right-5 sm:px-4 sm:py-3"
      aria-label="Open Gap Analysis"
    >
      <ClipboardCheck className="h-4 w-4" />
      <span className="hidden sm:inline">Gap Analysis</span>
    </button>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { locales } from '@/lib/i18n/routing';

const getLocalePrefix = () => {
  if (typeof window === 'undefined') return '';
  const segments = window.location.pathname.split('/').filter(Boolean);
  const locale = segments[0];
  return locales.includes(locale as typeof locales[number]) ? `/${locale}` : '';
};

export default function Error({
  reset,
}: {
  error: Error & { digest?: string; cause?: any };
  reset?: () => void;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#080e18] p-4 text-center text-white">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#0b121e] p-6 sm:p-8">
        <div className="text-xl font-semibold tracking-[-0.02em] text-slate-100">Algo correu mal</div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Não foi possível carregar esta área com segurança. Tente novamente ou volte ao painel.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {reset && (
            <Button onClick={reset} className="h-10 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/40">
              Tentar novamente
            </Button>
          )}
          <Button
            variant="outline"
            className="h-10 rounded-lg border-slate-700 bg-[#0d1624] px-4 text-slate-300 hover:border-blue-500/50 hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-blue-500/30"
            onClick={() => {
              window.location.href = `${getLocalePrefix()}/dashboard`;
            }}
          >
            Voltar ao painel
          </Button>
        </div>
      </div>
    </div>
  );
}

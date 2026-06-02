"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string; cause?: any };
  reset?: () => void;
}) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-[#050505] p-4 text-center text-white">
      <div className="max-w-md space-y-3 rounded-3xl border border-white/10 bg-white/[0.04] p-8">
        <div className="text-2xl font-semibold">Algo correu mal</div>
        <p className="text-sm leading-6 text-white/58">
          Não foi possível carregar esta área com segurança. Tente novamente ou volte ao painel.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {reset && (
            <Button onClick={reset} className="bg-white text-black hover:bg-white/90">
              Tentar novamente
            </Button>
          )}
          <Button
            variant="outline"
            className="border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
          >
            Voltar ao painel
          </Button>
        </div>
      </div>
    </div>
  );
}

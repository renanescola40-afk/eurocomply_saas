'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
      <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 text-center shadow-2xl backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200/80">RISCK COMPLY</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">A concluir autenticação...</h1>
        <p className="mt-3 text-sm leading-6 text-white/56">Estamos a validar o acesso com segurança.</p>
        <AuthenticateWithRedirectCallback />
      </div>
    </main>
  );
}

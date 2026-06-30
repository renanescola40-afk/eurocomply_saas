'use client';

export function ClerkOrganizationPanel() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-white shadow-2xl shadow-black/20">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">RISCK COMPLY</p>
      <h1 className="mt-3 text-2xl font-bold">Organizações via Supabase</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-300">
        O fluxo legado de organizações foi retirado. Use o onboarding e o dashboard de organizações baseados em Supabase.
      </p>
      <a
        href="/pt/onboarding"
        className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition hover:bg-zinc-200"
      >
        Continuar para onboarding
      </a>
    </section>
  );
}

import Link from 'next/link';

const privacyControls = [
  'Exportação autenticada, tenant-scoped, com RBAC, step-up e download no-store.',
  'Pedido de eliminação com RBAC, step-up, confirmação literal, revisão de retenção e audit event.',
  'Registos legais, billing e audit chain são preservados quando necessário.',
];

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PrivacyAdminPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <header className="border-b border-slate-800 pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">Admin GDPR</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-100">Privacidade e GDPR</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Centro enterprise para exportação, pedidos de eliminação, retenção, autorização, verificação adicional, isolamento por organização e evidência operacional.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-slate-800 bg-[#0b121e] p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-slate-100">Exportação</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              A rota GDPR prepara um ficheiro JSON tenant-scoped apenas para utilizadores autorizados, com step-up válido e headers no-store.
            </p>
          </section>
          <section className="rounded-xl border border-slate-800 bg-[#0b121e] p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-slate-100">Pedido de eliminação</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              O fluxo recebe um pedido confirmado e auditado para revisão operacional; dados legais, billing e auditáveis não são removidos automaticamente.
            </p>
          </section>
        </div>

        <section className="rounded-xl border border-slate-800 bg-[#0b121e] p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-100">Claims implementadas</h2>
          <ul className="mt-4 divide-y divide-slate-800/80 overflow-hidden rounded-lg border border-slate-800">
            {privacyControls.map((control) => (
              <li key={control} className="bg-[#0d1624] px-4 py-3 text-sm leading-6 text-slate-400">{control}</li>
            ))}
          </ul>
        </section>

        <p className="text-sm text-slate-500">
          Voltar ao <Link className="font-semibold text-blue-400 underline underline-offset-4 transition hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30" href={`/${locale}/profile#privacy`}>perfil</Link>.
        </p>
      </div>
    </main>
  );
}
